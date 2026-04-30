/**
 * OpenapiSender — implementazione reale del contratto InvoiceSender contro
 * la piattaforma Openapi SDI (Open S.p.A. / openapi.com).
 *
 * Differenze chiave rispetto ad AcubeSender:
 *   - Auth: HTTP Basic Auth (email + APIkey statica) → POST /token con scopes →
 *           bearer token con TTL fino a 1 anno (cached aggressivamente)
 *   - Endpoint OAuth e SDI separati:
 *       sandbox: https://test.oauth.openapi.it + https://test.sdi.openapi.it
 *       prod:    https://oauth.openapi.it      + https://sdi.openapi.it
 *   - Stessa struttura JSON snake_case del payload FatturaPA → riusiamo il
 *     payload-builder esistente senza modifiche
 *   - Marking diversi: `waiting`, `delivered`, `delivered-pa`, `not-delivered`,
 *     `rejected`, `accepted-pa`, `rejected-pa`, `deadline-terms`. Li traduciamo
 *     internamente in (marking ACube-compat + outcome SDI) per non toccare la
 *     state machine esistente.
 *   - Webhook body format: `{ event, data: { invoice|notification|... } }`
 *   - Numerazione: client-side (Openapi NON gestisce auto-numbering server-side
 *     come fa ACube). Quindi nel payload-builder il `numero` sarà già il numero
 *     finale, non un placeholder `getNumero(...)`.
 *
 * Doc ufficiale:
 *   https://console.openapi.com/oas/en/sdi.openapi.json
 *   https://console.openapi.com/apis/sdi/documentation
 *   https://console.openapi.com/oas/en/oauth.openapi.json
 */

import { Builder } from 'xml2js';

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

interface OpenapiCredentials {
  email: string;
  apiKey: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

/** Scope richiesti dal nostro client (usati nella POST /token). */
const REQUIRED_SCOPES = [
  'POST:sdi.openapi.it/invoices',
  'GET:sdi.openapi.it/invoices/*',
  'GET:sdi.openapi.it/invoices_notifications/*',
  'POST:sdi.openapi.it/api_configurations',
  'POST:sdi.openapi.it/business_registry_configurations',
  'PATCH:sdi.openapi.it/business_registry_configurations/*',
];

export class OpenapiSender implements InvoiceSender {
  readonly providerName = 'openapi' as const;

  private readonly sdiBaseUrl: string;
  private readonly oauthBaseUrl: string;
  private readonly settings: InvoiceSettings;
  private cachedToken: CachedToken | null = null;

  constructor(settings: InvoiceSettings) {
    this.settings = settings;
    // Default: sandbox. L'admin può sovrascrivere via senderEndpoint.
    const sdi = (settings.senderEndpoint ?? 'https://test.sdi.openapi.it').replace(/\/+$/, '');
    this.sdiBaseUrl = sdi;
    // Deriva l'endpoint OAuth dal pattern sandbox/prod del SDI
    this.oauthBaseUrl = sdi.includes('test.sdi.openapi.it')
      ? 'https://test.oauth.openapi.it'
      : sdi.includes('sdi.openapi.it')
        ? 'https://oauth.openapi.it'
        : // se l'utente ha messo un host custom, assumiamo che oauth abbia lo stesso pattern
          sdi.replace('://sdi.', '://oauth.').replace('://test.sdi.', '://test.oauth.');
  }

  // ─── Credenziali ─────────────────────────────────────────────────────────

  private resolveStaticToken(): string | null {
    // Modalità preferita: token persistente con scope già configurati
    // (creato dalla console Openapi → tab Token / OAuth → "New token" con scope SDI)
    if (process.env.OPENAPI_TOKEN) return process.env.OPENAPI_TOKEN;
    if (this.settings.senderApiKeyEncrypted?.startsWith('token:')) {
      // Convenzione DB: prefisso "token:" indica un token statico
      return decrypt(this.settings.senderApiKeyEncrypted).slice('token:'.length);
    }
    return null;
  }

  private resolveCredentials(): OpenapiCredentials {
    const envUser = process.env.OPENAPI_USERNAME;
    const envKey = process.env.OPENAPI_API_KEY;
    if (envUser && envKey) {
      return { email: envUser, apiKey: envKey };
    }
    if (this.settings.senderApiKeyEncrypted) {
      // Convenzione: cifratura del formato "email:apikey"
      const plain = decrypt(this.settings.senderApiKeyEncrypted);
      const idx = plain.indexOf(':');
      if (idx > 0) {
        return { email: plain.slice(0, idx), apiKey: plain.slice(idx + 1) };
      }
    }
    throw new Error(
      'Credenziali Openapi SDI non configurate. Setta OPENAPI_TOKEN (token statico) oppure ' +
        'OPENAPI_USERNAME + OPENAPI_API_KEY in .env.local. Genera il token dalla console Openapi.',
    );
  }

  // ─── Token (statico, oppure Basic auth → POST /token con scopes) ────────

  private async getToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.token;
    }

    // Modalità preferita: token statico già configurato con scope dalla console
    const staticToken = this.resolveStaticToken();
    if (staticToken) {
      // Cache 1 anno (il token statico ha la sua scadenza configurata sulla console)
      this.cachedToken = { token: staticToken, expiresAt: now + 365 * 24 * 3600 * 1000 };
      return staticToken;
    }

    const creds = this.resolveCredentials();
    const basic = Buffer.from(`${creds.email}:${creds.apiKey}`).toString('base64');

    const ttlSeconds = 30 * 24 * 3600; // 30 giorni — bilanciamento sicurezza/efficienza
    const res = await fetch(`${this.oauthBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({ scopes: REQUIRED_SCOPES, ttl: ttlSeconds }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Openapi /token failed: HTTP ${res.status} ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      token?: string;
      expire?: number;
      success?: boolean;
      message?: string;
    };
    if (!data.success || !data.token) {
      throw new Error(`Openapi /token: token assente nella risposta (${data.message ?? '?'})`);
    }
    // `expire` è epoch in secondi
    const expEpochMs = data.expire ? data.expire * 1000 : now + ttlSeconds * 1000;
    // Lasciamo 1 ora di margine per refresh anticipato
    this.cachedToken = { token: data.token, expiresAt: expEpochMs - 3600 * 1000 };
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

    let res = await fetch(`${this.sdiBaseUrl}${path}`, { ...init, headers });
    if (res.status === 401) {
      // token scaduto: refresh + retry una volta
      const newToken = await this.getToken(true);
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${this.sdiBaseUrl}${path}`, { ...init, headers });
    }
    return res;
  }

  // ─── send (POST /invoices o /invoices_legal_storage) ────────────────────

  async send(payload: unknown, ctx: SendContext): Promise<SendResult> {
    // La BusinessRegistry per Fiumana è stata creata con apply_legal_storage=true
    // (vedi scripts/openapi-setup.ts) → Openapi rifiuta /invoices con HTTP 412 e
    // pretende /invoices_legal_storage. Quando conservazioneProvider è 'openapi'
    // (default Fiumana) usiamo l'endpoint con conservazione. Per disattivare in
    // modo esplicito, settare conservazioneProvider='none' (o null) lato DB.
    const useLegalStorage =
      this.settings.conservazioneProvider === 'openapi' ||
      this.settings.conservazioneProvider === 'openapi-legal-storage';
    const path = useLegalStorage ? '/invoices_legal_storage' : '/invoices';

    // Openapi POST /invoices accetta SOLO application/xml. Il body JSON snake_case
    // della doc è solo per descrivere la struttura — va serializzato come XML
    // FatturaPA con tag PascalCase + namespace ufficiale AdE.
    //
    // Inoltre: il payload-builder è stato pensato per ACube, che auto-compila
    // dentro `dati_trasmissione` i campi `id_trasmittente`, `progressivo_invio` e
    // `formato_trasmissione`. Openapi NON li auto-compila → li iniettiamo qui.
    const enriched = enrichForFatturaPaSchema(payload, {
      partitaIva: this.settings.partitaIva ?? this.settings.codiceFiscale ?? '',
      progressivoInvio: deriveProgressivo(ctx.idempotencyKey),
    });
    const xml = jsonToFatturaPaXml(enriched);
    const headers = new Headers({ 'Content-Type': 'application/xml' });
    const res = await this.authedFetch(path, {
      method: 'POST',
      body: xml,
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
        parsed?.message ??
        parsed?.error ??
        parsed?.detail ??
        text.slice(0, 500);
      const error: any = new Error(
        `Openapi POST /invoices failed: HTTP ${res.status} - ${msg}`,
      );
      error.status = res.status;
      error.body = parsed ?? text;
      throw error;
    }

    // Schema risposta: { data: { uuid }, success: true }
    const uuid = parsed?.data?.uuid ?? parsed?.uuid;
    if (!uuid) {
      throw new Error(`Openapi POST /invoices: risposta senza uuid: ${text.slice(0, 300)}`);
    }
    return {
      externalId: String(uuid),
      acceptedAt: new Date(),
      rawResponse: parsed,
    };
  }

  // ─── getStatus (GET /invoices/{uuid}) ───────────────────────────────────

  async getStatus(externalId: string): Promise<SdiStatus> {
    const res = await this.authedFetch(`/invoices/${encodeURIComponent(externalId)}`);
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* */
    }

    if (!res.ok) {
      throw new Error(
        `Openapi GET /invoices/${externalId} HTTP ${res.status} - ${text.slice(0, 200)}`,
      );
    }

    // Schema: { data: { marking, notifications: [], notice, ... }, success: true }
    const body = parsed?.data ?? parsed;
    const openapiMarking: string = body?.marking ?? 'waiting';
    const mapped = mapOpenapiMarking(openapiMarking);

    return {
      marking: mapped.marking,
      outcome: mapped.outcome,
      occurredAt: new Date(),
      errorMessage: body?.notice || body?.retry_information || undefined,
      ricevutaUrl: body?.preserved_document?.legal_storage_receipt ?? null,
      rawResponse: body,
    };
  }

  // ─── downloadReceipt (GET /invoices/{uuid}) ─────────────────────────────
  // Openapi serve il file XML originale via `GET /invoices/{uuid}` con
  // Accept: application/xml. Endpoint dedicato `/file` non esiste come ACube.

  async downloadReceipt(externalId: string): Promise<Buffer | null> {
    const res = await this.authedFetch(`/invoices/${encodeURIComponent(externalId)}`, {
      headers: { Accept: 'application/xml' },
    });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  // ─── parseWebhook ───────────────────────────────────────────────────────
  // Body Openapi: { event: string, data: { invoice|notification|... } }

  parseWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): { externalId: string; status: SdiStatus; eventType: SdiLogEventType } | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, any>;
    const event: string = String(b.event ?? '');
    const data = (b.data ?? {}) as Record<string, any>;

    // 1) customer-notification → notifica SDI (RC/MC/NS/NE/DT/AT)
    if (event === 'customer-notification' && data.notification) {
      const n = data.notification;
      const invoiceUuid = String(n.invoice_uuid ?? '');
      if (!invoiceUuid) return null;
      const outcome = (typeof n.type === 'string' ? n.type.toUpperCase() : null) as
        | SdiNotificationOutcome
        | null;
      // notice/lista_errori per il caso NS
      const errors = n.message?.lista_errori;
      let errorMessage: string | undefined;
      if (errors) {
        const e = Array.isArray(errors.Errore) ? errors.Errore[0] : errors.Errore;
        if (e) errorMessage = `${e.Codice ?? ''} ${e.Descrizione ?? ''}`.trim();
      }
      return {
        externalId: invoiceUuid,
        eventType: 'customer-notification',
        status: {
          marking: 'sent', // sempre 'sent' per coerenza con state-machine quando arriva una notifica SDI
          outcome,
          occurredAt: parseDate(n.created_at) ?? new Date(),
          errorMessage,
          ricevutaUrl: typeof n.message?.nome_file === 'string' ? n.message.nome_file : null,
          rawResponse: body,
        },
      };
    }

    // 2) supplier-invoice → fattura passiva ricevuta dal SDI (NON è la nostra
    //    fattura attiva inviata; è una fattura passiva che arriva da un fornitore).
    //    Per ora la passiamo al log ma non aggiorniamo nessuna invoice.
    if (event === 'supplier-invoice' && data.invoice) {
      const invoiceUuid = String(data.invoice.uuid ?? '');
      if (!invoiceUuid) return null;
      return {
        externalId: invoiceUuid,
        eventType: 'webhook_received',
        status: {
          marking: 'sent',
          outcome: null,
          occurredAt: parseDate(data.invoice.created_at) ?? new Date(),
          rawResponse: body,
        },
      };
    }

    // 3) customer-invoice — interpretazione di Openapi: NON sicura al 100%.
    //    Per la nostra logica trattiamo come "fattura attiva confermata".
    if (event === 'customer-invoice' && data.invoice) {
      const invoiceUuid = String(data.invoice.uuid ?? '');
      if (!invoiceUuid) return null;
      return {
        externalId: invoiceUuid,
        eventType: 'customer-invoice',
        status: {
          marking: 'sent',
          outcome: null,
          occurredAt: parseDate(data.invoice.created_at) ?? new Date(),
          rawResponse: body,
        },
      };
    }

    // 4) invoice-status-quarantena
    if (event === 'invoice-status-quarantena' && data.invoice) {
      return {
        externalId: String(data.invoice.uuid ?? ''),
        eventType: 'invoice-status-quarantena',
        status: {
          marking: 'quarantena',
          outcome: null,
          occurredAt: new Date(),
          errorMessage: typeof data.invoice.notice === 'string' ? data.invoice.notice : undefined,
          rawResponse: body,
        },
      };
    }

    // 5) invoice-status-invoice-error
    if (event === 'invoice-status-invoice-error' && data.invoice) {
      return {
        externalId: String(data.invoice.uuid ?? ''),
        eventType: 'invoice-status-invoice-error',
        status: {
          marking: 'invoice-error',
          outcome: null,
          occurredAt: new Date(),
          errorMessage: typeof data.invoice.notice === 'string' ? data.invoice.notice : undefined,
          rawResponse: body,
        },
      };
    }

    // 6) legal-storage-receipt
    if (event === 'legal-storage-receipt') {
      const invoiceUuid = String(
        data.invoice_uuid ?? data.invoice?.uuid ?? data.preserved_document?.invoice_uuid ?? '',
      );
      if (!invoiceUuid) return null;
      return {
        externalId: invoiceUuid,
        eventType: 'legal-storage-receipt',
        status: {
          marking: 'sent',
          outcome: null,
          occurredAt: parseDate(data.created_at) ?? new Date(),
          ricevutaUrl: typeof data.file === 'string' ? data.file : null,
          rawResponse: body,
        },
      };
    }

    return null;
  }
}

// ─── Conversione JSON snake_case → XML FatturaPA 1.2.2 ─────────────────────

/**
 * Genera un ProgressivoInvio (max 10 alfanumerici, FatturaPA spec) a partire
 * dall'idempotency key oppure dal timestamp corrente.
 */
function deriveProgressivo(idempotencyKey?: string): string {
  if (idempotencyKey) {
    // tieni solo alfanumerici, prendi gli ultimi 10
    const clean = idempotencyKey.replace(/[^A-Za-z0-9]/g, '');
    return (clean.slice(-10) || Date.now().toString().slice(-10)).toUpperCase();
  }
  return Date.now().toString().slice(-10);
}

/**
 * Arricchisce il payload "ACube-style" con i campi obbligatori che ACube
 * compilava lato server e Openapi pretende già nel body. Riordina anche le
 * chiavi di `dati_trasmissione` rispettando la sequence dello schema FatturaPA.
 */
function enrichForFatturaPaSchema(
  payload: unknown,
  ctx: { partitaIva: string; progressivoInvio: string },
): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const root = payload as any;
  const header = root.fattura_elettronica_header;
  if (!header || typeof header !== 'object') return payload;
  const dt = header.dati_trasmissione ?? {};

  // Ordine richiesto dallo schema FatturaPA 1.2.2:
  //   IdTrasmittente, ProgressivoInvio, FormatoTrasmissione, CodiceDestinatario,
  //   ContattiTrasmittente?, PECDestinatario?
  const newDt: Record<string, unknown> = {};
  newDt.id_trasmittente = dt.id_trasmittente ?? {
    id_paese: 'IT',
    id_codice: ctx.partitaIva,
  };
  newDt.progressivo_invio = dt.progressivo_invio ?? ctx.progressivoInvio;
  newDt.formato_trasmissione = dt.formato_trasmissione ?? 'FPR12';
  newDt.codice_destinatario = dt.codice_destinatario ?? '0000000';
  if (dt.contatti_trasmittente) newDt.contatti_trasmittente = dt.contatti_trasmittente;
  if (dt.pec_destinatario) newDt.pec_destinatario = dt.pec_destinatario;

  // Riordino anche le chiavi del header per matchare la sequence schema:
  //   DatiTrasmissione, CedentePrestatore, CessionarioCommittente, …
  const newHeader: Record<string, unknown> = {
    dati_trasmissione: newDt,
    cedente_prestatore: header.cedente_prestatore,
    cessionario_committente: header.cessionario_committente,
  };
  for (const [k, v] of Object.entries(header)) {
    if (!(k in newHeader)) newHeader[k] = v;
  }

  return {
    fattura_elettronica_header: newHeader,
    fattura_elettronica_body: root.fattura_elettronica_body,
  };
}

/**
 * Acronimi FatturaPA da preservare in MAIUSCOLO durante la conversione
 * snake_case → PascalCase. Tag standard AdE che usano acronimi:
 *   - AliquotaIVA, IdFiscaleIVA, EsigibilitaIVA, NaturaIVA?, etc.
 *   - CAP (sede)
 *   - IscrizioneREA, NumeroREA
 *   - IBAN
 *   - PECDestinatario
 *   - BIC, ABI, CAB
 * Senza questa whitelist Openapi rifiuta l'XML (schema FatturaPA validation
 * fallisce e il loro errore è il fuorviante "missing cedente_prestatore").
 */
const FATTURAPA_ACRONYMS = new Set([
  'iva',
  'cap',
  'rea',
  'iban',
  'pec',
  'bic',
  'abi',
  'cab',
]);

/**
 * Converte snake_case in PascalCase per i tag XML FatturaPA, rispettando
 * gli acronimi che lo schema vuole TUTTI MAIUSCOLI.
 * Es. `dati_trasmissione` → `DatiTrasmissione`,
 *     `aliquota_iva`      → `AliquotaIVA`,
 *     `id_fiscale_iva`    → `IdFiscaleIVA`,
 *     `pec_destinatario`  → `PECDestinatario`,
 *     `cap`               → `CAP`,
 *     `numero_rea`        → `NumeroREA`.
 */
function snakeToPascal(s: string): string {
  return s
    .split('_')
    .map((w) => {
      if (w.length === 0) return '';
      if (FATTURAPA_ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
      return w[0].toUpperCase() + w.slice(1);
    })
    .join('');
}

/**
 * Trasforma ricorsivamente le chiavi di un oggetto da snake_case a PascalCase.
 * Gli array sono preservati (xml2js li serializza come tag ripetuti).
 */
function transformKeysToPascal(obj: any): any {
  if (Array.isArray(obj)) return obj.map(transformKeysToPascal);
  if (obj === null || typeof obj !== 'object') return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    // Conserva chiavi speciali xml2js (es. `$` per attributi, `_` per text content)
    if (k === '$' || k === '_') {
      out[k] = v;
    } else {
      out[snakeToPascal(k)] = transformKeysToPascal(v);
    }
  }
  return out;
}

/**
 * Serializza il payload JSON snake_case nel formato XML FatturaPA 1.2.2 atteso
 * dal SDI (e quindi da Openapi). Aggiunge il root `<p:FatturaElettronica>` con
 * versione e namespace ufficiali AdE.
 */
function jsonToFatturaPaXml(payload: unknown): string {
  const transformed = transformKeysToPascal(payload);
  const root = {
    'p:FatturaElettronica': {
      $: {
        versione: 'FPR12',
        'xmlns:p':
          'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
        'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      },
      ...(transformed as Record<string, unknown>),
    },
  };
  const builder = new Builder({
    headless: false,
    renderOpts: { pretty: false },
    xmldec: { version: '1.0', encoding: 'UTF-8', standalone: false },
  });
  return builder.buildObject(root);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Traduce un marking Openapi in (marking ACube-compat + outcome SDI), così la
 * state-machine esistente continua a funzionare senza modifiche.
 *
 * Mapping:
 *   waiting          → marking=waiting, outcome=null      → stato locale: accettata_acube
 *   delivered        → marking=sent,    outcome=RC        → stato locale: consegnata
 *   delivered-pa     → marking=sent,    outcome=RC        → stato locale: consegnata
 *   accepted-pa      → marking=sent,    outcome=NE        → stato locale: inviata_sdi
 *   rejected         → marking=sent,    outcome=NS        → stato locale: scartata
 *   rejected-pa      → marking=sent,    outcome=NS        → stato locale: scartata
 *   not-delivered    → marking=sent,    outcome=MC        → stato locale: mancata_consegna
 *   deadline-terms   → marking=sent,    outcome=DT        → stato locale: consegnata
 */
function mapOpenapiMarking(openapiMarking: string): {
  marking: AcubeMarking;
  outcome: SdiNotificationOutcome | null;
} {
  switch (openapiMarking) {
    case 'waiting':
      return { marking: 'waiting', outcome: null };
    case 'delivered':
    case 'delivered-pa':
      return { marking: 'sent', outcome: 'RC' };
    case 'accepted-pa':
      return { marking: 'sent', outcome: 'NE' };
    case 'rejected':
    case 'rejected-pa':
      return { marking: 'sent', outcome: 'NS' };
    case 'not-delivered':
      return { marking: 'sent', outcome: 'MC' };
    case 'deadline-terms':
      return { marking: 'sent', outcome: 'DT' };
    default:
      // Fallback prudenziale: sconosciuto = waiting
      return { marking: 'waiting', outcome: null };
  }
}
