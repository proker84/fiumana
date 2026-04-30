/**
 * Tipi del modulo fatturazione elettronica.
 *
 * Tutti gli importi monetari sono memorizzati in **centesimi** (INTEGER) per evitare
 * problemi di floating point. Le funzioni di formattazione convertono in stringhe
 * con due decimali al momento dell'invio ad ACube.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipi documento (TipoDocumento FatturaPA)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoDocumento =
  | 'TD01' // Fattura
  | 'TD04' // Nota di credito
  | 'TD05' // Nota di debito
  | 'TD24' // Fattura differita
  | 'TD25'; // Fattura differita di cui all'art.21, comma 4, terzo periodo lett. b)

// ─────────────────────────────────────────────────────────────────────────────
// Stato locale della fattura (sotto nostro controllo)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stato locale della fattura nel DB Fiumana. Mappato 1:N rispetto al `marking` ACube
 * (vedi state-machine.ts per il mapping completo).
 */
export type InvoiceStato =
  | 'bozza' // creata ma non inviata
  | 'in_invio' // POST /invoices in corso, locked
  | 'accettata_acube' // ACube ha risposto 202, marking=waiting
  | 'quarantena' // primo retry ACube fallito
  | 'inviata_sdi' // ACube marking=sent, SDI ha ricevuto
  | 'consegnata' // SDI ha consegnato al cliente (RC)
  | 'mancata_consegna' // SDI non ha trovato canale (MC) — fiscalmente valido
  | 'scartata' // SDI ha scartato (NS) — terminale, serve riemissione
  | 'errore_invio' // ACube marking=invoice-error dopo tutti i retry
  | 'annullata'; // bozza cancellata o operazione abortita

// ─────────────────────────────────────────────────────────────────────────────
// Marking ACube (stato lato provider)
// ─────────────────────────────────────────────────────────────────────────────

export type AcubeMarking =
  | 'waiting'
  | 'quarantena'
  | 'sent'
  | 'invoice-error';

// ─────────────────────────────────────────────────────────────────────────────
// Esiti notifiche SDI (sigle ufficiali AdE)
// ─────────────────────────────────────────────────────────────────────────────

export type SdiNotificationOutcome =
  | 'RC' // Ricevuta di Consegna — tutto ok
  | 'MC' // Notifica di Mancata Consegna — valido fiscalmente
  | 'NS' // Notifica di Scarto — terminale
  | 'NE' // Notifica di Esito (committente)
  | 'EC' // Esito Committente
  | 'DT' // Decorrenza Termini — 15 gg senza esito = accettata
  | 'AT'; // Attestazione di trasmissione (PA scartata)

// ─────────────────────────────────────────────────────────────────────────────
// Cliente
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerTipo = 'PF' | 'PG'; // Persona Fisica | Persona Giuridica

export interface Customer {
  id: number;
  tipo: CustomerTipo;
  ragioneSociale?: string | null;
  cognome?: string | null;
  nome?: string | null;
  codiceFiscale?: string | null;
  partitaIva?: string | null;
  nazione: string; // ISO 3166 alpha-2 (es. 'IT', 'UA')
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  provincia?: string | null; // 'EE' per estero
  email?: string | null;
  pec?: string | null;
  codiceDestinatario: string; // '0000000' default, 'XXXXXXX' estero, o 7 char SDI
  isEstero: boolean;
  sourceGuestId?: number | null;
  notes?: string | null;
  createdAt: Date;
}

export interface CustomerInput {
  tipo?: CustomerTipo;
  ragioneSociale?: string;
  cognome?: string;
  nome?: string;
  codiceFiscale?: string;
  partitaIva?: string;
  nazione?: string;
  indirizzo?: string;
  cap?: string;
  comune?: string;
  provincia?: string;
  email?: string;
  pec?: string;
  codiceDestinatario?: string;
  sourceGuestId?: number;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fattura
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  rigaNumero: number;
  descrizione: string;
  quantita: number;
  prezzoUnitarioCents: number;
  aliquotaIva: number;
  naturaIva?: string | null;
  imponibileCents: number;
  ivaCents: number;
  totaleCents: number;
}

export interface Invoice {
  id: number;
  tipoDocumento: TipoDocumento;
  sezionale: string;
  numero: number | null; // null finché non inviata
  anno: number | null;
  numeroCompleto: string | null;
  dataDocumento: string; // YYYY-MM-DD

  bookingId?: number | null;
  customerId: number;
  parentInvoiceId?: number | null;
  idempotencyKey?: string | null;

  imponibileCents: number;
  ivaCents: number;
  totaleCents: number;
  aliquotaIva: number;
  naturaIva?: string | null;

  // Snapshot dati booking
  bookingTotalCents?: number | null;
  cityTaxCents?: number | null;
  airbnbCommissionCents?: number | null;

  modalitaPagamento: string;
  dataPagamento?: string | null;

  stato: InvoiceStato;
  markingAcube?: AcubeMarking | null;
  externalId?: string | null; // UUID ACube
  sdiIdentificativo?: string | null;

  xmlUrl?: string | null;
  xmlFilename?: string | null;
  pdfUrl?: string | null;
  ricevutaConsegnaUrl?: string | null;

  inviataAt?: Date | null;
  consegnataAt?: Date | null;
  lastPolledAt?: Date | null;
  pollAttempts: number;

  notes?: string | null;
  createdBy?: number | null;
  createdAt: Date;
  updatedAt: Date;

  items?: InvoiceItem[];
  customer?: Customer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configurazione emittente
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceSettings {
  id: 1;
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale: string;
  regimeFiscale: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
  iban?: string | null;
  rea?: string | null;
  capitaleSocialeCents?: number | null;
  pecEmittente?: string | null;

  senderProvider?: 'acube' | 'openapi' | 'mock' | null;
  senderApiKeyEncrypted?: string | null;
  senderEndpoint?: string | null;
  senderTestMode: boolean;
  webhookSecret?: string | null;

  acubeBusinessRegistryUuid?: string | null;
  acubeNumberingSequenceUuid?: string | null;
  acubeNumberingSequenceName: string;
  acubeCreditNoteSequenceUuid?: string | null;
  acubeCreditNoteSequenceName: string;

  conservazioneProvider?: string | null;
  tassaSoggiornoDefaultCents: number;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eventi log SDI
// ─────────────────────────────────────────────────────────────────────────────

export type SdiLogEventType =
  | 'send_request'
  | 'send_response'
  | 'webhook_received'
  | 'customer-invoice'
  | 'customer-notification'
  | 'invoice-status-quarantena'
  | 'invoice-status-invoice-error'
  | 'legal-storage-receipt'
  | 'poll'
  | 'manual_action'
  | 'error';

export interface SdiLog {
  id: number;
  invoiceId: number;
  eventType: SdiLogEventType;
  eventAt: Date;
  httpStatus?: number | null;
  payloadIn?: string | null;
  payloadOut?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawXmlUrl?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sender (interfaccia astratta verso ACube/Mock)
// ─────────────────────────────────────────────────────────────────────────────

export interface SendContext {
  invoiceId: number;
  idempotencyKey: string;
}

export interface SendResult {
  externalId: string; // UUID restituito da ACube
  acceptedAt: Date;
  rawResponse: unknown;
}

export interface SdiStatus {
  marking: AcubeMarking;
  outcome?: SdiNotificationOutcome | null;
  occurredAt: Date;
  errorCode?: string;
  errorMessage?: string;
  ricevutaUrl?: string | null;
  rawResponse: unknown;
}

export interface InvoiceSender {
  readonly providerName: 'acube' | 'openapi' | 'mock';
  send(payload: unknown, ctx: SendContext): Promise<SendResult>;
  getStatus(externalId: string): Promise<SdiStatus>;
  downloadReceipt(externalId: string): Promise<Buffer | null>;
  parseWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): { externalId: string; status: SdiStatus; eventType: SdiLogEventType } | null;
}
