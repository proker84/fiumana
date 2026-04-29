/**
 * GET  /api/invoices       — lista fatture con filtri + paginazione
 * POST /api/invoices       — crea una bozza vuota (o con righe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery, dbQueryOne } from '@/lib/db';
import { checkInvoiceTotals } from '@/lib/fatturapa/calculator';
import { rowToCustomer, rowToInvoice } from '@/lib/fatturapa/db-mapper';
import type { InvoiceItem } from '@/lib/fatturapa/types';

// ─────────────────────────────────────────────────────────────────────────────
// GET — lista fatture con filtri
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const stato = url.searchParams.get('stato');
    const sezionale = url.searchParams.get('sezionale');
    const customerId = url.searchParams.get('customerId');
    const bookingId = url.searchParams.get('bookingId');
    const tipoDocumento = url.searchParams.get('tipoDocumento');
    const dataDa = url.searchParams.get('dataDa');
    const dataA = url.searchParams.get('dataA');
    const search = url.searchParams.get('search');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    const where: string[] = [];
    const args: any[] = [];

    if (stato) {
      const arr = stato.split(',').map((s) => s.trim()).filter(Boolean);
      if (arr.length === 1) {
        where.push('i.stato = ?');
        args.push(arr[0]);
      } else if (arr.length > 1) {
        where.push(`i.stato IN (${arr.map(() => '?').join(',')})`);
        args.push(...arr);
      }
    }
    if (sezionale) {
      where.push('i.sezionale = ?');
      args.push(sezionale);
    }
    if (tipoDocumento) {
      where.push('i.tipo_documento = ?');
      args.push(tipoDocumento);
    }
    if (customerId) {
      where.push('i.customer_id = ?');
      args.push(Number(customerId));
    }
    if (bookingId) {
      where.push('i.booking_id = ?');
      args.push(Number(bookingId));
    }
    if (dataDa) {
      where.push('i.data_documento >= ?');
      args.push(dataDa);
    }
    if (dataA) {
      where.push('i.data_documento <= ?');
      args.push(dataA);
    }
    if (search) {
      where.push(
        '(i.numero_completo LIKE ? OR c.cognome LIKE ? OR c.nome LIKE ? OR c.ragione_sociale LIKE ? OR c.email LIKE ?)',
      );
      const q = `%${search}%`;
      args.push(q, q, q, q, q);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await dbQuery(
      `SELECT i.*,
              c.id AS c_id, c.tipo AS c_tipo, c.ragione_sociale AS c_ragione_sociale,
              c.cognome AS c_cognome, c.nome AS c_nome, c.nazione AS c_nazione,
              c.codice_destinatario AS c_codice_destinatario, c.is_estero AS c_is_estero,
              c.email AS c_email
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       ${whereSql}
       ORDER BY i.data_documento DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      [...args, limit, offset],
    );

    const totalRow = await dbQueryOne(
      `SELECT COUNT(*) AS n FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id ${whereSql}`,
      args,
    );

    const invoices = rows.map((r: any) => {
      const inv = rowToInvoice(r)!;
      // Customer "lite": solo i campi necessari per la lista
      inv.customer = {
        id: Number(r.c_id),
        tipo: r.c_tipo,
        ragioneSociale: r.c_ragione_sociale,
        cognome: r.c_cognome,
        nome: r.c_nome,
        codiceFiscale: null,
        partitaIva: null,
        nazione: r.c_nazione,
        indirizzo: null,
        cap: null,
        comune: null,
        provincia: null,
        email: r.c_email,
        pec: null,
        codiceDestinatario: r.c_codice_destinatario ?? '0000000',
        isEstero: !!r.c_is_estero,
        sourceGuestId: null,
        notes: null,
        createdAt: new Date(),
      };
      return inv;
    });

    return NextResponse.json({
      invoices,
      total: Number((totalRow as any)?.n ?? 0),
      limit,
      offset,
    });
  } catch (e: any) {
    console.error('GET /api/invoices error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — crea una nuova bozza
// ─────────────────────────────────────────────────────────────────────────────
//
// Body atteso:
//   {
//     "tipoDocumento": "TD01" | "TD04",
//     "sezionale": "AIR",
//     "dataDocumento": "YYYY-MM-DD",
//     "customerId": 1,
//     "bookingId": 42,
//     "parentInvoiceId": null,
//     "modalitaPagamento": "MP08",
//     "dataPagamento": "YYYY-MM-DD",
//     "aliquotaIva": 10,
//     "imponibileCents": 30909, "ivaCents": 3091, "totaleCents": 34000,
//     "bookingTotalCents": 34400, "cityTaxCents": 400, "airbnbCommissionCents": 5270,
//     "items": [{ "rigaNumero": 1, "descrizione": "...", "quantita": 1,
//                  "prezzoUnitarioCents": 30909, "aliquotaIva": 10,
//                  "imponibileCents": 30909, "ivaCents": 3091, "totaleCents": 34000 }],
//     "notes": "..."
//   }
//
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.customerId) {
      return NextResponse.json({ error: 'customerId obbligatorio' }, { status: 400 });
    }
    if (!body.dataDocumento) {
      return NextResponse.json({ error: 'dataDocumento obbligatoria' }, { status: 400 });
    }
    if (
      typeof body.imponibileCents !== 'number' ||
      typeof body.ivaCents !== 'number' ||
      typeof body.totaleCents !== 'number'
    ) {
      return NextResponse.json(
        { error: 'imponibileCents, ivaCents, totaleCents obbligatori (interi)' },
        { status: 400 },
      );
    }

    const items: InvoiceItem[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Almeno una riga è obbligatoria' }, { status: 400 });
    }

    const check = checkInvoiceTotals(items, {
      imponibileCents: body.imponibileCents,
      ivaCents: body.ivaCents,
      totaleCents: body.totaleCents,
    });
    if (!check.ok) {
      return NextResponse.json({ error: 'Quadrature fallite', details: check.errors }, { status: 400 });
    }

    // Verifica esistenza customer
    const cust = await dbQueryOne('SELECT id FROM customers WHERE id = ?', [body.customerId]);
    if (!cust) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });

    // Insert invoice
    const insertInv = await dbExecute(
      `INSERT INTO invoices (
         tipo_documento, sezionale, data_documento,
         booking_id, customer_id, parent_invoice_id,
         imponibile_cents, iva_cents, totale_cents, aliquota_iva, natura_iva,
         booking_total_cents, city_tax_cents, airbnb_commission_cents,
         modalita_pagamento, data_pagamento, stato, notes, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', ?, ?)`,
      [
        body.tipoDocumento ?? 'TD01',
        body.sezionale ?? 'AIR',
        body.dataDocumento,
        body.bookingId ?? null,
        body.customerId,
        body.parentInvoiceId ?? null,
        body.imponibileCents,
        body.ivaCents,
        body.totaleCents,
        body.aliquotaIva ?? 10,
        body.naturaIva ?? null,
        body.bookingTotalCents ?? null,
        body.cityTaxCents ?? null,
        body.airbnbCommissionCents ?? null,
        body.modalitaPagamento ?? 'MP08',
        body.dataPagamento ?? null,
        body.notes ?? null,
        auth.userId,
      ],
    );

    const invoiceId = Number((insertInv as any).lastInsertRowid ?? 0);

    // Insert items
    for (const it of items) {
      await dbExecute(
        `INSERT INTO invoice_items (
            invoice_id, riga_numero, descrizione, quantita,
            prezzo_unitario_cents, aliquota_iva, natura_iva,
            imponibile_cents, iva_cents, totale_cents
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          it.rigaNumero,
          it.descrizione,
          it.quantita ?? 1,
          it.prezzoUnitarioCents,
          it.aliquotaIva ?? 10,
          it.naturaIva ?? null,
          it.imponibileCents,
          it.ivaCents,
          it.totaleCents,
        ],
      );
    }

    const created = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    return NextResponse.json({ success: true, invoice: rowToInvoice(created) }, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/invoices error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
