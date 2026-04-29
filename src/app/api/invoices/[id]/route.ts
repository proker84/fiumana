/**
 * GET    /api/invoices/[id]  — dettaglio fattura + righe + cliente
 * PATCH  /api/invoices/[id]  — aggiorna bozza (solo se stato = 'bozza')
 * DELETE /api/invoices/[id]  — elimina bozza (cascade su items)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery, dbQueryOne } from '@/lib/db';
import { checkInvoiceTotals } from '@/lib/fatturapa/calculator';
import {
  rowToCustomer,
  rowToInvoice,
  rowToInvoiceItem,
} from '@/lib/fatturapa/db-mapper';
import { isDeletable, isEditable } from '@/lib/fatturapa/state-machine';
import type { InvoiceItem } from '@/lib/fatturapa/types';

// ─────────────────────────────────────────────────────────────────────────────
// GET — dettaglio fattura
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
    }

    const invoiceRow = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoiceRow) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 });

    const itemsRows = await dbQuery(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY riga_numero',
      [id],
    );
    const customerRow = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [
      (invoiceRow as any).customer_id,
    ]);
    const logsRows = await dbQuery(
      'SELECT * FROM invoice_sdi_logs WHERE invoice_id = ? ORDER BY event_at DESC, id DESC LIMIT 200',
      [id],
    );

    const invoice = rowToInvoice(invoiceRow)!;
    invoice.items = itemsRows.map(rowToInvoiceItem);
    if (customerRow) invoice.customer = rowToCustomer(customerRow)!;

    return NextResponse.json({
      invoice,
      logs: logsRows.map((l: any) => ({
        id: Number(l.id),
        eventType: l.event_type,
        eventAt: l.event_at,
        httpStatus: l.http_status ?? null,
        errorCode: l.error_code ?? null,
        errorMessage: l.error_message ?? null,
        rawXmlUrl: l.raw_xml_url ?? null,
      })),
    });
  } catch (e: any) {
    console.error('GET /api/invoices/[id] error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — aggiorna bozza
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const id = Number(params.id);
    const body = await req.json();

    const inv = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!inv) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 });

    const stato = (inv as any).stato;
    if (!isEditable(stato)) {
      return NextResponse.json(
        { error: `Fattura non modificabile (stato: ${stato})` },
        { status: 409 },
      );
    }

    // Mappa camelCase → snake_case sui campi modificabili
    const fieldMap: Record<string, string> = {
      sezionale: 'sezionale',
      tipoDocumento: 'tipo_documento',
      dataDocumento: 'data_documento',
      customerId: 'customer_id',
      bookingId: 'booking_id',
      parentInvoiceId: 'parent_invoice_id',
      imponibileCents: 'imponibile_cents',
      ivaCents: 'iva_cents',
      totaleCents: 'totale_cents',
      aliquotaIva: 'aliquota_iva',
      naturaIva: 'natura_iva',
      bookingTotalCents: 'booking_total_cents',
      cityTaxCents: 'city_tax_cents',
      airbnbCommissionCents: 'airbnb_commission_cents',
      modalitaPagamento: 'modalita_pagamento',
      dataPagamento: 'data_pagamento',
      notes: 'notes',
    };

    const sets: string[] = [];
    const args: any[] = [];
    for (const [k, col] of Object.entries(fieldMap)) {
      if (k in body) {
        sets.push(`${col} = ?`);
        args.push(body[k]);
      }
    }

    // Aggiornamento righe (sostituzione totale se passato)
    if (Array.isArray(body.items)) {
      const items: InvoiceItem[] = body.items;
      const expectedTotals = {
        imponibileCents: body.imponibileCents ?? Number((inv as any).imponibile_cents),
        ivaCents: body.ivaCents ?? Number((inv as any).iva_cents),
        totaleCents: body.totaleCents ?? Number((inv as any).totale_cents),
      };
      const check = checkInvoiceTotals(items, expectedTotals);
      if (!check.ok) {
        return NextResponse.json(
          { error: 'Quadrature fallite', details: check.errors },
          { status: 400 },
        );
      }
      await dbExecute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
      for (const it of items) {
        await dbExecute(
          `INSERT INTO invoice_items (
             invoice_id, riga_numero, descrizione, quantita,
             prezzo_unitario_cents, aliquota_iva, natura_iva,
             imponibile_cents, iva_cents, totale_cents
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
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
    }

    if (sets.length > 0) {
      sets.push('updated_at = CURRENT_TIMESTAMP');
      args.push(id);
      await dbExecute(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`, args);
    }

    const updated = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    return NextResponse.json({ success: true, invoice: rowToInvoice(updated) });
  } catch (e: any) {
    console.error('PATCH /api/invoices/[id] error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — elimina bozza
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const id = Number(params.id);
    const inv = await dbQueryOne('SELECT stato FROM invoices WHERE id = ?', [id]);
    if (!inv) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 });

    if (!isDeletable((inv as any).stato)) {
      return NextResponse.json(
        { error: `Fattura non eliminabile (stato: ${(inv as any).stato})` },
        { status: 409 },
      );
    }

    await dbExecute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    await dbExecute('DELETE FROM invoice_sdi_logs WHERE invoice_id = ?', [id]);
    await dbExecute('DELETE FROM invoices WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/invoices/[id] error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
