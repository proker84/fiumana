/**
 * POST /api/invoices/from-booking/[bookingId]
 *
 * Crea una bozza fattura pre-compilata a partire da una prenotazione esistente:
 *   - Recupera il booking e il guest principale (progressivo=1)
 *   - Crea/riusa un Customer derivato dal guest
 *   - Calcola imponibile/IVA con `computeNightlyInvoice`
 *     (notti × prezzo a notte + pulizie, arrotondamento 5 cent, scorporo 10%)
 *   - Inserisce la fattura in stato 'bozza' con una riga descrittiva
 *
 * Body opzionale:
 *   {
 *     "dataDocumento": "2026-04-21",   // default: oggi
 *     "dataPagamento": "2026-04-18",   // default: check_in
 *     "modalitaPagamento": "MP08",     // default: MP08 (carta)
 *     "aliquotaIva": 10,               // default: 10
 *     "pricePerNight": 80.00,          // override prezzo a notte (euro)
 *     "cleaningFee": 60.00             // override pulizie (euro, default 60)
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery, dbQueryOne } from '@/lib/db';
import {
  computeNightlyInvoice,
  computeInvoiceFromPayout,
  eurosToCents,
  DEFAULT_CLEANING_FEE_CENTS,
} from '@/lib/fatturapa/calculator';
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

    // ── Calcolo imponibile ──────────────────────────────────────────────────
    // DEFAULT (automatico): deriva il totale fattura dal payout netto Airbnb,
    //   scorporando la commissione host 15,5%:  totale = total_amount ÷ 0,845.
    // OVERRIDE (manuale): se è impostato un prezzo a notte (body.pricePerNight o
    //   booking.price_per_night > 0) si usa  notti × prezzo + pulizie.
    const checkIn = (booking as any).check_in;
    const checkOut = (booking as any).check_out;
    const nights =
      checkIn && checkOut
        ? Math.max(
            0,
            Math.round(
              (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;
    if (nights <= 0) {
      return NextResponse.json(
        { error: 'Numero notti non valido: controlla check-in e check-out.' },
        { status: 400 },
      );
    }

    const cleaningFeeCents =
      typeof body.cleaningFee === 'number'
        ? eurosToCents(body.cleaningFee)
        : DEFAULT_CLEANING_FEE_CENTS;
    const aliquotaIva = Number(body.aliquotaIva ?? 10);

    const pricePerNightEur =
      typeof body.pricePerNight === 'number'
        ? body.pricePerNight
        : Number((booking as any).price_per_night ?? 0);
    const hasManualPrice = Number.isFinite(pricePerNightEur) && pricePerNightEur > 0;

    let totaleLordoCents: number;
    let split: { imponibileCents: number; ivaCents: number; totaleCents: number; aliquotaIva: number };
    let impliedPerNightCents: number;
    let metodo: 'payout' | 'prezzo_notte';

    if (hasManualPrice) {
      const calc = computeNightlyInvoice(
        { pricePerNightCents: eurosToCents(pricePerNightEur), nights, cleaningFeeCents },
        aliquotaIva,
      );
      totaleLordoCents = calc.totaleLordoCents;
      split = calc.split;
      impliedPerNightCents = calc.pricePerNightCents;
      metodo = 'prezzo_notte';
    } else {
      // Default automatico: dal payout netto Airbnb.
      const totalAmount = Number((booking as any).total_amount ?? 0);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return NextResponse.json(
          {
            error:
              'Payout Airbnb (total_amount) mancante: impossibile calcolare la fattura. ' +
              'Inserisci il prezzo a notte a mano oppure aggiorna il totale prenotazione.',
          },
          { status: 400 },
        );
      }
      const calc = computeInvoiceFromPayout(eurosToCents(totalAmount), aliquotaIva);
      totaleLordoCents = calc.totaleLordoCents;
      split = calc.split;
      // prezzo a notte implicito = (lordo − pulizie) / notti (può non essere tondo)
      impliedPerNightCents = Math.round((calc.totaleLordoCents - cleaningFeeCents) / nights);
      metodo = 'payout';
    }

    if (totaleLordoCents <= 0) {
      return NextResponse.json(
        { error: 'Totale fattura calcolato è zero. Verifica payout/prezzo a notte e notti.' },
        { status: 400 },
      );
    }

    // Descrizione riga
    const propName = property ? (property as any).nome : 'soggiorno';
    const prezzoNotteStr = (impliedPerNightCents / 100).toFixed(2);
    const pulizieStr = (cleaningFeeCents / 100).toFixed(2);
    const descrizione =
      `Affitto ${propName} dal ${checkIn} al ${checkOut} ` +
      `(${nights} notti × ${prezzoNotteStr} € + pulizie ${pulizieStr} €)`;

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
        split.imponibileCents,
        split.ivaCents,
        split.totaleCents,
        aliquotaIva,
        totaleLordoCents, // booking_total_cents = totale lordo fattura
        null, // city_tax_cents: esclusa dal modello
        null, // airbnb_commission_cents: esclusa dal modello
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
        split.imponibileCents,
        aliquotaIva,
        split.imponibileCents,
        split.ivaCents,
        split.totaleCents,
      ],
    );

    const created = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    return NextResponse.json(
      {
        success: true,
        invoice: rowToInvoice(created),
        breakdown: {
          metodo, // 'payout' (auto) | 'prezzo_notte' (override manuale)
          nights,
          pricePerNightCents: impliedPerNightCents,
          cleaningFeeCents,
          totaleLordoCents, // arrotondato ai 5 cent
          imponibileCents: split.imponibileCents,
          ivaCents: split.ivaCents,
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error('POST /api/invoices/from-booking error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
