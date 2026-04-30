/**
 * POST /api/invoices/[id]/send
 *
 * Invia la fattura ad ACube (o al MockSender in dev/test).
 *
 * Flusso:
 *   1. Autenticazione admin
 *   2. Lettura invoice + items + customer + settings
 *   3. Idempotency check: se l'invoice ha già `idempotency_key` + stato non 'bozza',
 *      ritorniamo lo stato corrente senza reinviare (200 OK)
 *   4. Lock atomico: UPDATE stato='in_invio' WHERE id=? AND stato='bozza'
 *      Se la riga non viene aggiornata, qualcun altro l'ha presa → 409
 *   5. Build payload JSON FatturaPA snake_case
 *   6. resolveSender(settings) → AcubeSender o MockSender
 *   7. sender.send(payload, ctx)
 *   8. Su successo: aggiorna invoice (external_id, marking_acube='waiting',
 *      stato='accettata_acube', inviata_at=now), log 'send_response' OK
 *   9. Su fallimento: rollback stato='bozza', log 'send_response' KO,
 *      ritorna 502/400/500 a seconda del tipo di errore
 *
 * Body opzionale:
 *   { "idempotencyKey": "uuid-v4" }   // se omesso, ne generiamo uno
 */

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery, dbQueryOne } from '@/lib/db';
import {
  rowToCustomer,
  rowToInvoice,
  rowToInvoiceItem,
  rowToInvoiceSettings,
} from '@/lib/fatturapa/db-mapper';
import { buildAcubePayload } from '@/lib/fatturapa/payload-builder';
import { resolveSender } from '@/lib/fatturapa/sender/factory';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const idempotencyKey = (body as any)?.idempotencyKey ?? randomUUID();

  try {
    // ─── 1. Lettura ─────────────────────────────────────────────────────
    const invoiceRow = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoiceRow) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 });

    const inv = rowToInvoice(invoiceRow)!;

    // 2. Idempotency: se già inviata con la stessa chiave → ritorna lo stato corrente
    if (inv.idempotencyKey === idempotencyKey && inv.stato !== 'bozza') {
      return NextResponse.json({ success: true, invoice: inv, idempotent: true });
    }

    if (inv.stato !== 'bozza') {
      return NextResponse.json(
        { error: `Fattura non in stato bozza (stato: ${inv.stato})` },
        { status: 409 },
      );
    }

    // ─── 4. Lock atomico ────────────────────────────────────────────────
    const lockResult = await dbExecute(
      `UPDATE invoices
         SET stato = 'in_invio', idempotency_key = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stato = 'bozza'`,
      [idempotencyKey, id],
    );
    const rowsChanged = Number((lockResult as any).rowsAffected ?? 0);
    if (rowsChanged === 0) {
      return NextResponse.json(
        { error: 'Conflitto: fattura presa da un altro processo' },
        { status: 409 },
      );
    }

    // ─── 2 (ri-fetch dopo lock) ─────────────────────────────────────────
    const lockedRow = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    const lockedInv = rowToInvoice(lockedRow)!;

    const itemsRows = await dbQuery(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY riga_numero',
      [id],
    );
    const items = itemsRows.map(rowToInvoiceItem);
    if (items.length === 0) {
      await rollbackToBozza(id);
      return NextResponse.json({ error: 'Fattura senza righe' }, { status: 400 });
    }

    const customerRow = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [
      lockedInv.customerId,
    ]);
    const customer = rowToCustomer(customerRow);
    if (!customer) {
      await rollbackToBozza(id);
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 400 });
    }

    const settingsRow = await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
    const settings = rowToInvoiceSettings(settingsRow);
    if (!settings) {
      await rollbackToBozza(id);
      return NextResponse.json(
        { error: 'Impostazioni emittente non configurate' },
        { status: 500 },
      );
    }

    // Eventuale fattura padre (per nota di credito)
    let parent: { numeroCompleto: string; dataDocumento: string } | undefined;
    if (lockedInv.parentInvoiceId) {
      const parentRow = await dbQueryOne(
        'SELECT numero_completo, data_documento FROM invoices WHERE id = ?',
        [lockedInv.parentInvoiceId],
      );
      if (parentRow && (parentRow as any).numero_completo) {
        parent = {
          numeroCompleto: (parentRow as any).numero_completo,
          dataDocumento: (parentRow as any).data_documento,
        };
      }
    }

    // ─── 4b. Allocazione numero client-side ─────────────────────────────
    // Openapi (a differenza di ACube) NON ha sequenze auto-numbering server-side
    // → dobbiamo assegnare numero+anno+numeroCompleto qui, persistere nel DB,
    // e poi passarli al payload-builder. Skippa per fatture già numerate
    // (es. retry di un invio fallito) per evitare buchi nella sequenza.
    if (lockedInv.numero === null || lockedInv.numeroCompleto === null) {
      const annoFt = new Date(lockedInv.dataDocumento).getFullYear();
      const sezionale = lockedInv.sezionale || '';
      const lastRow = await dbQueryOne(
        `SELECT COALESCE(MAX(numero), 0) AS max_num
           FROM invoices
           WHERE sezionale = ? AND anno = ? AND numero IS NOT NULL`,
        [sezionale, annoFt],
      );
      const nextNumero = Number((lastRow as any)?.max_num ?? 0) + 1;
      const numeroCompleto = `${nextNumero}/${annoFt}`;
      await dbExecute(
        `UPDATE invoices
           SET numero = ?, anno = ?, numero_completo = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        [nextNumero, annoFt, numeroCompleto, id],
      );
      lockedInv.numero = nextNumero;
      lockedInv.anno = annoFt;
      lockedInv.numeroCompleto = numeroCompleto;
    }

    // ─── 5. Build payload ────────────────────────────────────────────────
    const payload = buildAcubePayload({
      invoice: lockedInv,
      items,
      customer,
      settings,
      parent,
    });

    // Log request
    await logEvent(id, 'send_request', {
      payloadOut: JSON.stringify(payload).slice(0, 8000),
    });

    // ─── 6. Resolve sender ───────────────────────────────────────────────
    const { sender, reason } = resolveSender(settings);

    // ─── 7. Invio ────────────────────────────────────────────────────────
    let sendResult;
    try {
      sendResult = await sender.send(payload, { invoiceId: id, idempotencyKey });
    } catch (sendErr: any) {
      await logEvent(id, 'error', {
        httpStatus: sendErr?.status ?? null,
        errorCode: sendErr?.status ? String(sendErr.status) : 'send_exception',
        errorMessage: sendErr?.message ?? String(sendErr),
        payloadIn: typeof sendErr?.body === 'string'
          ? sendErr.body.slice(0, 4000)
          : JSON.stringify(sendErr?.body ?? {}).slice(0, 4000),
      });
      await rollbackToBozza(id);
      return NextResponse.json(
        {
          error: sendErr.message ?? 'Invio fallito',
          provider: reason,
          status: sendErr.status,
        },
        { status: sendErr.status && sendErr.status < 500 ? 400 : 502 },
      );
    }

    // ─── 8. Successo ─────────────────────────────────────────────────────
    await dbExecute(
      `UPDATE invoices
         SET stato = 'accettata_acube',
             marking_acube = 'waiting',
             external_id = ?,
             inviata_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      [sendResult.externalId, id],
    );

    await logEvent(id, 'send_response', {
      httpStatus: 202,
      payloadIn: JSON.stringify(sendResult.rawResponse).slice(0, 4000),
    });

    const updatedRow = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      invoice: rowToInvoice(updatedRow),
      provider: reason,
      externalId: sendResult.externalId,
    });
  } catch (e: any) {
    console.error('POST /api/invoices/[id]/send error:', e);
    await rollbackToBozza(id).catch(() => undefined);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function rollbackToBozza(invoiceId: number) {
  await dbExecute(
    `UPDATE invoices
       SET stato = 'bozza', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND stato = 'in_invio'`,
    [invoiceId],
  );
}

interface LogEventParams {
  httpStatus?: number | null;
  payloadIn?: string;
  payloadOut?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawXmlUrl?: string | null;
}

async function logEvent(invoiceId: number, eventType: string, p: LogEventParams = {}) {
  await dbExecute(
    `INSERT INTO invoice_sdi_logs
       (invoice_id, event_type, http_status, payload_in, payload_out, error_code, error_message, raw_xml_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceId,
      eventType,
      p.httpStatus ?? null,
      p.payloadIn ?? null,
      p.payloadOut ?? null,
      p.errorCode ?? null,
      p.errorMessage ?? null,
      p.rawXmlUrl ?? null,
    ],
  );
}
