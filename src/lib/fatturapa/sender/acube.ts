/**
 * AcubeSender — implementazione reale del contratto InvoiceSender contro
 * la piattaforma A-Cube API (Italia).
 *
 * - Autenticazione: OAuth2 password grant (POST /login con email + password)
 *   token cached in memoria con scadenza ~24h (refresh on demand su 401).
 * - Invio fattura: POST /invoices con body JSON snake_case (vedi payload-builder).
 * - Polling stato:  GET /invoices/{uuid}.
 * - Download ricevuta: GET /invoices/{uuid}/file (XML).
 * - Webhook parsing: discriminazione fra `customer-invoice`, `customer-notification`,
 *   `invoice-status-quarantena|invoice-error`, `legal-storage-receipt`.
 *
 * Le credenziali (email + password) vengono lette in due modi:
 *   1. Da `settings.senderApiKeyEncrypted` — formato "email:password" cifrato AES-256-GCM.
 *      Questa è la modalità "auto-contained" (tutto in DB, nessuna env extra).
 *   2. Da env vars `ACUBE_USERNAME` e `ACUBE_PASSWORD` — modalità classica.
 *
 * Il fallback è in quest'ordine: prima env vars (override esplicito), poi DB cifrato.
 */

import { decrypt } from '../crypto';
import type {
  AcubeMarking,
  InvoiceSender,
  InvoiceSettings,
  SdiLogEventType,
  SdiNotificationOutcome,
  SdiStatus,
  SendContext,
  SendResult,
} from '../types';

interface AcubeCredentials {
  email: string;
  password: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

export class AcubeSender implements InvoiceSender {
  readonly providerName = 'acube' as const;

  private readonly endpoint: string;
  private readonly settings: InvoiceSettings;
  private cachedToken: CachedToken | null = null;

  constructor(settings: InvoiceSettings) {
    this.settings = settings;
    this.endpoint = (settings.senderEndpoint ?? 'https://api-sandbox.acubeapi.com').replace(
      /\/+$/,
      '',
    );
  }

  // ─── Credenziali ─────────────────────────────────────────────────────────

  private resolveCredentials(): AcubeCredentials {
    const envUser = process.env.ACUBE_USERNAME;
    const envPass = process.env.ACUBE_PASSWORD;
    if (envUser && envPass) {
      return { email: envUser, password: envPass };
    }
    if (this.settings.senderApiKeyEncrypted) {
      // Convenzione: cifratura del formato "email:password"
      const plain = decrypt(this.settings.senderApiKeyEncrypted);
      const idx = plain.indexOf(':');
      if (idx > 0) {
        return { email: plain.slice(0, idx), password: plain.slice(idx + 1) };
      }
    }
    throw new Error(
      'Credenziali ACube non configurate. Setta ACUBE_USERNAME + ACUBE_PASSWORD ' +
        'in .env.local oppure salvale dalla pagina /admin/fatturazione/impostazioni.',
    );
  }

  // ─── Token (OAuth2 password grant) ───────────────────────────────────────

  private async getToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.token;
    }
    const creds = this.resolveCredentials();
    const res = await fetch(`${this.endpoint}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`ACube login failed: HTTP ${res.status} ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      throw new Error('ACube login: token assente nella risposta');
    }
    // Token JWT ACube tipicamente vale 24h. Ne assumiamo 23h per sicurezza.
    this.cachedToken = { token: data.token, expiresAt: now + 23 * 3600 * 1000 };
    return data.token;
  }

  private async authedFetch(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<Response> {
    const token = await this.getToken();
    const headers = new Headers(init.headers ?? {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (init.idempotencyKey) headers.set('Idempotency-Key', init.idempotencyKey);

    let res = await fetch(`${this.endpoint}${path}`, { ...init, headers });
    if (res.status === 401) {
      // token scaduto: refresh + retry
      const newToken = await this.getToken(true);
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${this.endpoint}${path}`, { ...init, headers });
    }
    return res;
  }

  // ─── send (POST /invoices) ──────────────────────────────────────────────

  async send(payload: unknown, ctx: SendContext): Promise<SendResult> {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const res = await this.authedFetch('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: ctx.idempotencyKey,
      headers,
    });

    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // non JSON
    }

    if (!res.ok) {
      const msg =
        parsed?.detail ?? parsed?.['hydra:description'] ?? parsed?.message ?? text.slice(0, 500);
      const error: any = new Error(`ACube POST /invoices failed: HTTP ${res.status} - ${msg}`);
      error.status = res.status;
      error.body = parsed ?? text;
      throw error;
    }

    if (!parsed?.uuid) {
      throw new Error(`ACube POST /invoices: risposta senza uuid: ${text.slice(0, 300)}`);
    }
    return {
      externalId: String(parsed.uuid),
      acceptedAt: new Date(),
      rawResponse: parsed,
    };
  }

  // ─── getStatus (GET /invoices/{uuid}) ───────────────────────────────────

  async getStatus(externalId: string): Promise<SdiStatus> {
    const res = await this.authedFetch(`/invoices/${encodeURIComponent(externalId)}`);
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* */
    }

    if (!res.ok) {
      throw new Error(
        `ACube GET /invoices/${externalId} HTTP ${res.status} - ${text.slice(0, 200)}`,
      );
    }
    const marking = (body?.marking as AcubeMarking) ?? 'waiting';
    return {
      marking,
      outcome: extractOutcomeFromInvoice(body),
      occurredAt: new Date(),
      errorMessage: body?.notice ?? undefined,
      ricevutaUrl: body?.preserved_document?.legal_storage_receipt ?? null,
      rawResponse: body,
    };
  }

  // ─── downloadReceipt (GET /invoices/{uuid}/file) ────────────────────────

  async downloadReceipt(externalId: string): Promise<Buffer | null> {
    const res = await this.authedFetch(`/invoices/${encodeURIComponent(externalId)}/file`, {
      headers: { Accept: 'application/xml,application/octet-stream' },
    });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  // ─── parseWebhook ────────────────────────────────────────────────────────

  parseWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): { externalId: string; status: SdiStatus; eventType: SdiLogEventType } | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, any>;

    // 1) Marking change: { uuid, marking, previous_marking, notice, transioned_at }
    if (typeof b.marking === 'string' && typeof b.uuid === 'string') {
      const marking = b.marking as AcubeMarking;
      const prev = (b.previous_marking as AcubeMarking | undefined) ?? null;
      const eventType: SdiLogEventType =
        marking === 'quarantena'
          ? 'invoice-status-quarantena'
          : marking === 'invoice-error'
            ? 'invoice-status-invoice-error'
            : marking === 'sent'
              ? 'customer-invoice'
              : 'webhook_received';
      return {
        externalId: b.uuid,
        eventType,
        status: {
          marking,
          outcome: null,
          occurredAt: parseDate(b.transioned_at) ?? new Date(),
          errorMessage: typeof b.notice === 'string' ? b.notice : undefined,
          ricevutaUrl: null,
          rawResponse: body,
        },
      };
    }

    // 2) customer-notification — body è la Notification con riferimento alla fattura
    //    Struttura nota: { uuid, type: 'RC'|'MC'|'NS'|'NE'|'DT', invoice: { uuid, ... } }
    if (typeof b.invoice?.uuid === 'string') {
      const invoiceUuid = b.invoice.uuid as string;
      const outcome = (typeof b.type === 'string' ? b.type.toUpperCase() : null) as
        | SdiNotificationOutcome
        | null;
      return {
        externalId: invoiceUuid,
        eventType: 'customer-notification',
        status: {
          marking: 'sent',
          outcome,
          occurredAt: parseDate(b.received_at ?? b.created_at) ?? new Date(),
          errorMessage: typeof b.notice === 'string' ? b.notice : undefined,
          ricevutaUrl: typeof b.file === 'string' ? b.file : null,
          rawResponse: body,
        },
      };
    }

    // 3) legal-storage-receipt — PreservedDocument
    if (typeof b.invoice_uuid === 'string' || typeof b.invoice?.uuid === 'string') {
      const invoiceUuid = (b.invoice_uuid ?? b.invoice?.uuid) as string;
      return {
        externalId: invoiceUuid,
        eventType: 'legal-storage-receipt',
        status: {
          marking: 'sent',
          outcome: null,
          occurredAt: parseDate(b.preserved_at ?? b.created_at) ?? new Date(),
          ricevutaUrl: typeof b.file === 'string' ? b.file : null,
          rawResponse: body,
        },
      };
    }

    return null;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractOutcomeFromInvoice(body: any): SdiNotificationOutcome | null {
  if (!body || typeof body !== 'object') return null;
  // ACube espone le notifiche dentro l'invoice come array
  const notifs: any[] = Array.isArray(body.notifications)
    ? body.notifications
    : Array.isArray(body.invoice_notifications)
      ? body.invoice_notifications
      : [];
  if (notifs.length === 0) return null;
  // Ultima notifica per data
  const last = [...notifs].sort((a, b) => {
    const da = new Date(a.created_at ?? a.received_at ?? 0).getTime();
    const db = new Date(b.created_at ?? b.received_at ?? 0).getTime();
    return db - da;
  })[0];
  const t = (last?.type ?? '').toUpperCase();
  if (['RC', 'MC', 'NS', 'NE', 'EC', 'DT', 'AT'].includes(t)) return t as SdiNotificationOutcome;
  return null;
}
