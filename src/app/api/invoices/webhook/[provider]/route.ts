/**
 * POST /api/invoices/webhook/[provider]
 *
 * Endpoint pubblico (no JWT admin) chiamato da ACube quando l'invoice cambia
 * marking o arriva una notifica SDI.
 *
 * Auth: bearer token configurato in ApiConfiguration di ACube. Lo confrontiamo
 * con `invoice_settings.webhook_secret` (constant-time).
 *
 * Flusso:
 *   1. Verifica bearer token contro webhook_secret
 *   2. resolveSender(settings) — useremo la sua parseWebhook
 *   3. Trova invoice per external_id
 *   4. Aggiorna stato locale via state machine + marking ACube
 *   5. Salva log invoice_sdi_logs
 *   6. (TODO task #16) mirror dei file ricevuta su Vercel Blob
 *
 * Endpoint deliberatamente "always 200" per casi non-fatali, così ACube non
 * mette in retry quando il problema è solo nostro (es. invoice non trovata):
 * ritorniamo 202 con payload diagnostico ma evitiamo storm di retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQueryOne } from '@/lib/db';
import { constantTimeEqual } from '@/lib/fatturapa/crypto';
import { rowToInvoiceSettings } from '@/lib/fatturapa/db-mapper';
import { resolveSender } from '@/lib/fatturapa/sender/factory';
import { markingToStato } from '@/lib/fatturapa/state-machine';
import type { InvoiceStato } from '@/lib/fatturapa/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } },
) {
  // ─── 1. Bearer auth ────────────────────────────────────────────────────
  const settingsRow = await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
  const settings = rowToInvoiceSettings(settingsRow);
  if (!settings) {
    return NextResponse.json({ error: 'Settings non configurate' }, { status: 500 });
  }

  const incomingAuth = req.headers.get('authorization') ?? '';
  const stripped = incomingAuth.replace(/^Bearer\s+/i, '').trim();
  const expected = settings.webhookSecret ?? '';

  if (!expected || !stripped || !constantTimeEqual(stripped, expected)) {
    // 401 esplicito: ACube saprà di dover correggere la ApiConfiguration
    return NextResponse.json({ error: 'Webhook auth invalida' }, { status: 401 });
  }

  // ─── 2. Lettura body ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headersObj[k] = v;
  });

  // ─── 3. Parse webhook con il sender ────────────────────────────────────
  const { sender } = resolveSender(settings);
  const parsed = sender.parseWebhook(headersObj, body);

  if (!parsed) {
    // Salviamo comunque un log "orfano" per debug
    await dbExecute(
      `INSERT INTO invoice_sdi_logs
         (invoice_id, event_type, payload_in, error_message)
         VALUES (-1, 'webhook_received', ?, ?)`,
      [JSON.stringify(body).slice(0, 4000), 'parseWebhook ha ritornato null'],
    ).catch(() => undefined);
    return NextResponse.json(
      { ok: false, reason: 'unparseable', received: true },
      { status: 202 },
    );
  }

  // ─── 4. Trova invoice per external_id ──────────────────────────────────
  const invoiceRow = await dbQueryOne(
    'SELECT * FROM invoices WHERE external_id = ?',
    [parsed.externalId],
  );
  if (!invoiceRow) {
    return NextResponse.json(
      { ok: false, reason: 'invoice_not_found', externalId: parsed.externalId },
      { status: 202 },
    );
  }
  const invoiceId = Number((invoiceRow as any).id);

  // ─── 5. Calcola nuovo stato locale ─────────────────────────────────────
  const nuovoStato: InvoiceStato = markingToStato(
    parsed.status.marking,
    parsed.status.outcome ?? null,
  );

  const setFields: string[] = [
    'stato = ?',
    'marking_acube = ?',
    'updated_at = CURRENT_TIMESTAMP',
  ];
  const args: any[] = [nuovoStato, parsed.status.marking];

  if (nuovoStato === 'consegnata' || nuovoStato === 'mancata_consegna') {
    setFields.push('consegnata_at = COALESCE(consegnata_at, CURRENT_TIMESTAMP)');
  }
  if (parsed.status.ricevutaUrl) {
    setFields.push('ricevuta_consegna_url = COALESCE(ricevuta_consegna_url, ?)');
    args.push(parsed.status.ricevutaUrl);
  }
  args.push(invoiceId);

  await dbExecute(
    `UPDATE invoices SET ${setFields.join(', ')} WHERE id = ?`,
    args,
  );

  // ─── 6. Log evento ─────────────────────────────────────────────────────
  await dbExecute(
    `INSERT INTO invoice_sdi_logs
       (invoice_id, event_type, payload_in, error_message, raw_xml_url)
       VALUES (?, ?, ?, ?, ?)`,
    [
      invoiceId,
      parsed.eventType,
      JSON.stringify(body).slice(0, 4000),
      parsed.status.errorMessage ?? null,
      parsed.status.ricevutaUrl ?? null,
    ],
  );

  return NextResponse.json({
    ok: true,
    invoiceId,
    eventType: parsed.eventType,
    statoAggiornato: nuovoStato,
    marking: parsed.status.marking,
    outcome: parsed.status.outcome ?? null,
  });
}
