/**
 * POST /api/invoices/from-booking/[bookingId]
 *
 * Crea una bozza fattura pre-compilata a partire da una prenotazione esistente:
 *   - Recupera il booking e il guest principale (progressivo=1)
 *   - Crea/riusa un Customer derivato dal guest
 *   - Calcola imponibile/IVA con `computeBookingInvoice`
 *   - Inserisce la fattura in stato 'bozza' con una riga descrittiva
 *
 * Body opzionale:
 *   {
 *     "dataDocumento": "2026-04-21",   // default: oggi
 *     "dataPagamento": "2026-04-18",   // default: check_in
 *     "modalitaPagamento": "MP08",     // default: MP08 (carta)
 *     "aliquotaIva": 10,               // default: 10
 *     "cityTaxOverride": 4.00          // override euro tassa di soggiorno
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery, dbQueryOne } from '@/lib/db';
import { computeBookingInvoice } from '@/lib/fatturapa/calculator';
import {
  codiceDestinatarioFor,
  guestToCustomerInput,
} from '@/lib/fatturapa/customer-mapper';
import { rowToInvoice, rowToInvoiceSettings } from '@/lib/fatturapa/db-mapper';

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } },
) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const bookingId = Number(params.bookingId);
    if (!Number.isFinite(bookingId)) {
      return NextResponse.json({ error: 'bookingId non valido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const booking = await dbQueryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });

    const property = (booking as any).property_id
      ? await dbQueryOne('SELECT * FROM properties WHERE id = ?', [(booking as any).property_id])
      : null;

    // Guest principale
    const guests = await dbQuery(
      'SELECT * FROM guests WHERE booking_id = ? ORDER BY progressivo ASC',
      [bookingId],
    );
    if (guests.length === 0) {
      return NextResponse.json(
        { error: 'Nessun ospite registrato per questa prenotazione' },
        { status: 400 },
      );
    }
    const mainGuest: any = guests[0];

    // Customer: cerco se esiste già uno collegato al guest (per evitare duplicati)
    let customerRow: any = await dbQueryOne(
      'SELECT * FROM customers WHERE source_guest_id = ?',
      [mainGuest.id],
    );

    if (!customerRow) {
      const customerInput = guestToCustomerInput(
        {
          id: Number(mainGuest.id),
          cognome: mainGuest.cognome,
          nome: mainGuest.nome,
          stato_residenza: mainGuest.stato_residenza,
          comune_residenza: mainGuest.comune_residenza,
          provincia_residenza: mainGuest.provincia_residenza,
          indirizzo_residenza: mainGuest.indirizzo_residenza,
          numero_documento: mainGuest.numero_documento,
        },
        (booking as any).guest_email,
      );
      const isEstero = customerInput.nazione !== 'IT';
      // Codice fiscale: prendiamolo dal guest form se l'ospite italiano l'ha
      // compilato. Per esteri lasciamo NULL (la fattura usa IdFiscaleIVA).
      const guestCf = mainGuest.codice_fiscale
        ? String(mainGuest.codice_fiscale).replace(/\s/g, '').toUpperCase()
        : null;
      const insert = await dbExecute(
        `INSERT INTO customers (
           tipo, cognome, nome, codice_fiscale, nazione, indirizzo, cap, comune, provincia, email,
           codice_destinatario, is_estero, source_guest_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerInput.tipo ?? 'PF',
          customerInput.cognome ?? null,
          customerInput.nome ?? null,
          guestCf,
          customerInput.nazione,
          customerInput.indirizzo ?? null,
          customerInput.cap ?? null,
          customerInput.comune ?? null,
          customerInput.provincia ?? null,
          customerInput.email ?? null,
          customerInput.codiceDestinatario ?? codiceDestinatarioFor({ isEstero }),
          isEstero ? 1 : 0,
          mainGuest.id,
        ],
      );
      const newId = Number((insert as any).lastInsertRowid ?? 0);
      customerRow = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [newId]);
    }

    // Settings (per default sequenziale + tassa soggiorno)
    const settingsRow = await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
    const settings = rowToInvoiceSettings(settingsRow);

    // Calcolo imponibile
    const totalAmount = Number((booking as any).total_amount ?? 0);
    const cityTaxOverride =
      typeof body.cityTaxOverride === 'number' ? body.cityTaxOverride : undefined;
    const cityTaxFromBooking = Number((booking as any).city_tax_amount ?? 0);

    // Fallback: se la booking non ha tassa di soggiorno salvata (city_tax_amount
    // = 0 o null), calcoliamo il default automatico così la fattura tiene
    // sempre conto della city tax.
    //   Formula Comacchio Lido di Pomposa: 0,50 € × num_guests × min(notti, 14)
    let cityTax = cityTaxOverride ?? cityTaxFromBooking;
    if (cityTax === 0 && cityTaxOverride === undefined) {
      const numGuests = Math.max(1, Number((booking as any).num_guests ?? 1));
      const checkIn = (booking as any).check_in;
      const checkOut = (booking as any).check_out;
      if (checkIn && checkOut) {
        const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
        const ratePerCents = settings?.tassaSoggiornoDefaultCents ?? 50;
        const billable = Math.min(14, Math.max(1, nights));
        cityTax = (numGuests * billable * ratePerCents) / 100; // cents → euro
      }
    }

    // Commissione Airbnb: la formula della fattura è total_amount + commission.
    // Se l'admin non l'ha inserita (campo airbnb_commission = 0/null nel DB),
    // la STIMIAMO al 18% del Guadagni (markup medio Airbnb 2026 in Italia,
    // calibrato su Yana: 52,70/287,30 ≈ 18,3%). È solo una stima — l'admin
    // dovrebbe sempre verificare con la fattura passiva Airbnb mensile e
    // aggiornarla manualmente per avere precisione fiscale.
    let airbnbCommission = Number((booking as any).airbnb_commission ?? 0);
    let commissionEstimated = false;
    if (airbnbCommission === 0 && totalAmount > 0) {
      const ESTIMATED_COMMISSION_RATE = 0.18; // 18% markup su Guadagni
      airbnbCommission = Number((totalAmount * ESTIMATED_COMMISSION_RATE).toFixed(2));
      commissionEstimated = true;
    }

    const aliquotaIva = Number(body.aliquotaIva ?? 10);

    const calc = computeBookingInvoice(
      { totalAmount, cityTaxAmount: cityTax, airbnbCommission },
      aliquotaIva,
    );

    if (calc.totaleFatturaCents <= 0) {
      return NextResponse.json(
        { error: 'Totale fattura calcolato è zero. Verifica importo prenotazione.' },
        { status: 400 },
      );
    }

    // Descrizione riga
    const propName = property ? (property as any).nome : 'soggiorno';
    const checkIn = (booking as any).check_in;
    const checkOut = (booking as any).check_out;
    const descrizione = `Affitto ${propName} dal ${checkIn} al ${checkOut}`;

    const dataDocumento =
      typeof body.dataDocumento === 'string'
        ? body.dataDocumento
        : new Date().toISOString().slice(0, 10);
    const dataPagamento =
      typeof body.dataPagamento === 'string' ? body.dataPagamento : (booking as any).check_in;

    // Insert invoice
    const insertInv = await dbExecute(
      `INSERT INTO invoices (
         tipo_documento, sezionale, data_documento,
         booking_id, customer_id,
         imponibile_cents, iva_cents, totale_cents, aliquota_iva,
         booking_total_cents, city_tax_cents, airbnb_commission_cents,
         modalita_pagamento, data_pagamento, stato, created_by
       ) VALUES ('TD01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', ?)`,
      [
        settings?.acubeNumberingSequenceName === 'FiumanaAIRNC' ? 'AIR' : 'AIR',
        dataDocumento,
        bookingId,
        Number((customerRow as any).id),
        calc.split.imponibileCents,
        calc.split.ivaCents,
        calc.split.totaleCents,
        aliquotaIva,
        calc.totaleOspiteCents,
        calc.cityTaxCents,
        calc.airbnbCommissionCents,
        body.modalitaPagamento ?? 'MP08',
        dataPagamento,
        auth.userId,
      ],
    );
    const invoiceId = Number((insertInv as any).lastInsertRowid ?? 0);

    // Insert riga (1 sola, descrittiva)
    await dbExecute(
      `INSERT INTO invoice_items (
         invoice_id, riga_numero, descrizione, quantita,
         prezzo_unitario_cents, aliquota_iva,
         imponibile_cents, iva_cents, totale_cents
       ) VALUES (?, 1, ?, 1, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        descrizione,
        calc.split.imponibileCents,
        aliquotaIva,
        calc.split.imponibileCents,
        calc.split.ivaCents,
        calc.split.totaleCents,
      ],
    );

    const created = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    return NextResponse.json(
      {
        success: true,
        invoice: rowToInvoice(created),
        breakdown: {
          totaleOspiteCents: calc.totaleOspiteCents,
          cityTaxCents: calc.cityTaxCents,
          airbnbCommissionCents: calc.airbnbCommissionCents,
          totaleFatturaCents: calc.totaleFatturaCents,
          imponibileCents: calc.split.imponibileCents,
          ivaCents: calc.split.ivaCents,
          commissionEstimated, // true se la commissione era 0 e l'abbiamo stimata 18%
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error('POST /api/invoices/from-booking error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
