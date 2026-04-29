/**
 * MockSender — implementazione fittizia di InvoiceSender per dev/test.
 *
 * Uso tipico: in sviluppo (settings.senderProvider === 'mock' oppure
 * NODE_ENV === 'test') per simulare l'invio ad ACube + tutta la
 * sequenza di webhook senza colpire la sandbox vera.
 *
 * Comportamento di default:
 *   send()           → ritorna 202 con UUID fake e simula marking 'waiting'
 *   getStatus()      → ritorna 'sent' + outcome 'RC' (caso felice)
 *   downloadReceipt()→ ritorna un buffer XML stub
 *   parseWebhook()   → riconosce un body con `{uuid, marking, ...}`
 *
 * Esponiamo anche helper per simulare scenari NS/MC/quarantena/error
 * usati nei test E2E.
 */

import { randomUUID } from 'crypto';

import type {
  AcubeMarking,
  InvoiceSender,
  SdiLogEventType,
  SdiNotificationOutcome,
  SdiStatus,
  SendContext,
  SendResult,
} from '../types';

export interface MockSenderOptions {
  /**
   * Comportamento dello status simulato:
   *   - 'success' (default) → marking 'sent' + outcome 'RC'
   *   - 'mancata_consegna'  → marking 'sent' + outcome 'MC'
   *   - 'scarto'            → marking 'sent' + outcome 'NS'
   *   - 'quarantena'        → marking 'quarantena'
   *   - 'invoice-error'     → marking 'invoice-error'
   *   - 'pending'           → marking 'waiting' (in attesa)
   */
  scenario?:
    | 'success'
    | 'mancata_consegna'
    | 'scarto'
    | 'quarantena'
    | 'invoice-error'
    | 'pending';
  /** Errore custom da restituire con marking quarantena/invoice-error */
  errorMessage?: string;
  /** Se true, send() lancia eccezione (simula fail di rete) */
  throwOnSend?: boolean;
}

export class MockSender implements InvoiceSender {
  readonly providerName = 'mock' as const;
  private readonly opts: MockSenderOptions;

  constructor(opts: MockSenderOptions = {}) {
    this.opts = opts;
  }

  async send(payload: unknown, ctx: SendContext): Promise<SendResult> {
    if (this.opts.throwOnSend) {
      throw new Error('MockSender: simulated network error on send()');
    }
    // log silenzioso per debugging in dev
    // eslint-disable-next-line no-console
    console.debug('[MockSender] POST /invoices', {
      idempotency: ctx.idempotencyKey,
      payloadSummary: summarize(payload),
    });
    return {
      externalId: randomUUID(),
      acceptedAt: new Date(),
      rawResponse: { uuid: randomUUID(), accepted: true, mock: true },
    };
  }

  async getStatus(externalId: string): Promise<SdiStatus> {
    const scenario = this.opts.scenario ?? 'success';
    let marking: AcubeMarking = 'waiting';
    let outcome: SdiNotificationOutcome | null = null;
    let errorMessage: string | undefined = this.opts.errorMessage;

    switch (scenario) {
      case 'success':
        marking = 'sent';
        outcome = 'RC';
        break;
      case 'mancata_consegna':
        marking = 'sent';
        outcome = 'MC';
        break;
      case 'scarto':
        marking = 'sent';
        outcome = 'NS';
        errorMessage = errorMessage ?? '00200: File con errori. Controllo formale fallito.';
        break;
      case 'quarantena':
        marking = 'quarantena';
        errorMessage = errorMessage ?? 'Mock: SDI temporaneamente non raggiungibile';
        break;
      case 'invoice-error':
        marking = 'invoice-error';
        errorMessage = errorMessage ?? 'Mock: invio fallito dopo retry';
        break;
      case 'pending':
        marking = 'waiting';
        break;
    }

    return {
      marking,
      outcome,
      occurredAt: new Date(),
      errorMessage,
      ricevutaUrl: outcome === 'RC' ? `mock://receipts/${externalId}.xml` : null,
      rawResponse: { externalId, marking, outcome, mock: true },
    };
  }

  async downloadReceipt(externalId: string): Promise<Buffer | null> {
    const stubXml = `<?xml version="1.0" encoding="UTF-8"?>\n<RicevutaConsegnaMock id="${externalId}"/>\n`;
    return Buffer.from(stubXml, 'utf8');
  }

  parseWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): { externalId: string; status: SdiStatus; eventType: SdiLogEventType } | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    const uuid = typeof b.uuid === 'string' ? b.uuid : null;
    if (!uuid) return null;

    const marking = (b.marking as AcubeMarking) ?? 'waiting';
    const outcome = (b.outcome as SdiNotificationOutcome | undefined) ?? null;
    const eventType: SdiLogEventType =
      typeof b.event === 'string' ? (b.event as SdiLogEventType) : 'webhook_received';

    return {
      externalId: uuid,
      eventType,
      status: {
        marking,
        outcome,
        occurredAt: new Date(),
        errorMessage: typeof b.notice === 'string' ? b.notice : undefined,
        ricevutaUrl: outcome === 'RC' ? `mock://receipts/${uuid}.xml` : null,
        rawResponse: body,
      },
    };
  }
}

/** Helper per breve dump in log senza esporre tutto il payload. */
function summarize(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return String(payload);
  try {
    const p = payload as any;
    const tipo =
      p?.fattura_elettronica_body?.[0]?.dati_generali?.dati_generali_documento?.tipo_documento;
    const numero =
      p?.fattura_elettronica_body?.[0]?.dati_generali?.dati_generali_documento?.numero;
    const totale =
      p?.fattura_elettronica_body?.[0]?.dati_generali?.dati_generali_documento
        ?.importo_totale_documento;
    const dest = p?.fattura_elettronica_header?.dati_trasmissione?.codice_destinatario;
    return `${tipo ?? '?'} ${numero ?? '?'} totale=${totale ?? '?'} dest=${dest ?? '?'}`;
  } catch {
    return '(unparsable)';
  }
}
