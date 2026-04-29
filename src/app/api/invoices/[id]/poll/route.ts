/**
 * POST /api/invoices/[id]/poll
 *
 * Sincronizzazione manuale dello stato dell'invoice da ACube.
 *
 * Bypassa il flusso webhook: chiama direttamente `GET /invoices/{uuid}` lato
 * ACube e applica la state machine al marking ricevuto. Utile come fallback
 * quando i webhook non arrivano (sandbox flaky, ApiConfiguration disattivate,
 * URL sbagliato, problemi DNS, ecc.).
 *
 * NB: non distrugge mai dati. Aggiorna solo i campi di stato dell'invoice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQueryOne } from '@/lib/db';
import { rowToInvoice, rowToInvoiceSettings } from '@/lib/fatturapa/db-mapper';
import { resolveSender } from '@/lib/fatturapa/sender/factory';
import { markingToStato } from '@/lib/fatturapa/state-machine';
import type { InvoiceStato } from '@/lib/fatturapa/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const id = Number(params.id);
    const invoiceRow = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoiceRow) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 });

    const invoice = rowToInvoice(invoiceRow)!;
    if (!invoice.externalId) {
      return NextResponse.json(
        { error: 'Fattura non ancora inviata ad ACube (external_id mancante)' },
        { status: 400 },
      );
    }

    const settingsRow = await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
    const settings = rowToInvoiceSettings(settingsRow);
    if (!settings) {
      return NextResponse.json({ error: 'Settings non configurate' }, { status: 500 });
    }

    const { sender } = resolveSender(settings);
    const status = await sender.getStatus(invoice.externalId);

    // Calcola nuovo stato locale
    const nuovoStato: InvoiceStato = markingToStato(status.marking, status.outcome ?? null);

    const sets: string[] = [
      'stato = ?',
      'marking_acube = ?',
      'last_polled_at = CURRENT_TIMESTAMP',
      'poll_attempts = COALESCE(poll_attempts, 0) + 1',
      'updated_at = CURRENT_TIMESTAMP',
    ];
    const args: any[] = [nuovoStato, status.marking];

    if (nuovoStato === 'consegnata' || nuovoStato === 'mancata_consegna') {
      sets.push('consegnata_at = COALESCE(consegnata_at, CURRENT_TIMESTAMP)');
    }
    if (status.ricevutaUrl) {
      sets.push('ricevuta_consegna_url = COALESCE(ricevuta_consegna_url, ?)');
      args.push(status.ricevutaUrl);
    }
    args.push(id);

    await dbExecute(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`, args);

    // Log dell'evento di polling
    await dbExecute(
      `INSERT INTO invoice_sdi_logs
         (invoice_id, event_type, payload_in, error_message)
         VALUES (?, 'poll', ?, ?)`,
      [
        id,
        JSON.stringify(status.rawResponse).slice(0, 4000),
        status.errorMessage ?? null,
      ],
    );

    const updated = await dbQueryOne('SELECT * FROM invoices WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      invoice: rowToInvoice(updated),
      acubeMarking: status.marking,
      sdiOutcome: status.outcome,
      message: `Stato sincronizzato da ACube: marking=${status.marking}, outcome=${status.outcome ?? '-'}`,
    });
  } catch (e: any) {
    console.error('POST /api/invoices/[id]/poll error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
