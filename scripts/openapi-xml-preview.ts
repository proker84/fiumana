/**
 * Preview offline dell'XML che OpenapiSender invierebbe al SDI.
 * Non chiama Openapi — costruisce solo il payload, lo arricchisce e stampa
 * l'XML risultante. Serve a validare lo schema PRIMA del deploy.
 *
 * Uso: npx tsx scripts/openapi-xml-preview.ts
 */

import { Builder } from 'xml2js';

import { buildAcubePayload } from '../src/lib/fatturapa/payload-builder';
import type {
  Customer,
  Invoice,
  InvoiceItem,
  InvoiceSettings,
} from '../src/lib/fatturapa/types';

// ─── Stessa logica di sender/openapi.ts (duplicata per preview standalone) ──
function snakeToPascal(s: string): string {
  return s
    .split('_')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
    .join('');
}
function transformKeysToPascal(obj: any): any {
  if (Array.isArray(obj)) return obj.map(transformKeysToPascal);
  if (obj === null || typeof obj !== 'object') return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '$' || k === '_') out[k] = v;
    else out[snakeToPascal(k)] = transformKeysToPascal(v);
  }
  return out;
}
function jsonToFatturaPaXml(payload: unknown): string {
  const transformed = transformKeysToPascal(payload);
  const root = {
    'p:FatturaElettronica': {
      $: {
        versione: 'FPR12',
        'xmlns:p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
        'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      },
      ...(transformed as Record<string, unknown>),
    },
  };
  const builder = new Builder({
    headless: false,
    renderOpts: { pretty: true, indent: '  ' },
    xmldec: { version: '1.0', encoding: 'UTF-8', standalone: false },
  });
  return builder.buildObject(root);
}
function enrichForFatturaPaSchema(
  payload: unknown,
  ctx: { partitaIva: string; progressivoInvio: string },
): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const root = payload as any;
  const header = root.fattura_elettronica_header;
  if (!header || typeof header !== 'object') return payload;
  const dt = header.dati_trasmissione ?? {};
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

// ─── Mock dati realistici (stessa fixture dello smoke test) ─────────────────
const settings: InvoiceSettings = {
  id: 1,
  ragioneSociale: 'Soc. a Responsabilità limitata Immobiliare Fiumana',
  partitaIva: '01340960481',
  codiceFiscale: '01340960481',
  regimeFiscale: 'RF01',
  indirizzo: 'Via del Seminario, 79',
  cap: '59100',
  comune: 'Prato',
  provincia: 'PO',
  nazione: 'IT',
  iban: null,
  rea: 'PO-480791',
  capitaleSocialeCents: null,
  pecEmittente: null,
  senderProvider: 'openapi',
  senderApiKeyEncrypted: null,
  senderEndpoint: 'https://test.sdi.openapi.it',
  senderTestMode: true,
  webhookSecret: null,
  acubeBusinessRegistryUuid: null,
  acubeNumberingSequenceUuid: null,
  acubeNumberingSequenceName: 'OPENAPI-PREVIEW-1',
  acubeCreditNoteSequenceUuid: null,
  acubeCreditNoteSequenceName: 'OPENAPI-PREVIEW-NC-1',
  conservazioneProvider: 'openapi',
  tassaSoggiornoDefaultCents: 200,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const customer: Customer = {
  id: 1,
  tipo: 'PF',
  ragioneSociale: null,
  cognome: 'TEST OPENAPI',
  nome: 'YANA',
  codiceFiscale: null,
  partitaIva: null,
  nazione: 'UA',
  indirizzo: 'Vul. Khreshchatyk 1',
  cap: '00000',
  comune: 'Kiev',
  provincia: 'EE',
  email: 'test+yana@example.com',
  pec: null,
  codiceDestinatario: 'XXXXXXX',
  isEstero: true,
  sourceGuestId: null,
  notes: null,
  createdAt: new Date(),
};

const today = new Date().toISOString().slice(0, 10);
const invoice: Invoice = {
  id: 999,
  tipoDocumento: 'TD01',
  sezionale: 'OPENAPI-PREVIEW',
  numero: 1,
  anno: new Date().getFullYear(),
  numeroCompleto: `OPENAPI-PREVIEW-${Date.now().toString().slice(-6)}`,
  dataDocumento: today,
  bookingId: null,
  customerId: 1,
  parentInvoiceId: null,
  idempotencyKey: null,
  imponibileCents: 30909,
  ivaCents: 3091,
  totaleCents: 34000,
  aliquotaIva: 10,
  naturaIva: null,
  bookingTotalCents: 34400,
  cityTaxCents: 400,
  airbnbCommissionCents: 5270,
  modalitaPagamento: 'MP08',
  dataPagamento: today,
  stato: 'bozza',
  markingAcube: null,
  externalId: null,
  sdiIdentificativo: null,
  xmlUrl: null,
  xmlFilename: null,
  pdfUrl: null,
  ricevutaConsegnaUrl: null,
  inviataAt: null,
  consegnataAt: null,
  lastPolledAt: null,
  pollAttempts: 0,
  notes: 'Preview XML offline',
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const items: InvoiceItem[] = [
  {
    rigaNumero: 1,
    descrizione: 'TEST OPENAPI - Soggiorno breve - euro',
    quantita: 1,
    prezzoUnitarioCents: 30909,
    aliquotaIva: 10,
    naturaIva: null,
    imponibileCents: 30909,
    ivaCents: 3091,
    totaleCents: 34000,
  },
];

const payload = buildAcubePayload({ invoice, items, customer, settings });
const enriched = enrichForFatturaPaSchema(payload, {
  partitaIva: '01340960481',
  progressivoInvio: 'PREVIEW001',
});
const xml = jsonToFatturaPaXml(enriched);

console.log('─── XML che verrebbe spedito a Openapi POST /invoices ───');
console.log(xml);
console.log(`\n📏 Byte: ${Buffer.byteLength(xml, 'utf-8')}`);
