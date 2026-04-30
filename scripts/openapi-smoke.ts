/**
 * Smoke test Openapi SDI — login + setup + invio + status, senza toccare il DB.
 *
 * Richiede in .env.local:
 *   OPENAPI_USERNAME (email account console.openapi.com)
 *   OPENAPI_API_KEY  (APIkey statica generata da console.openapi.com/oauth)
 *   (opzionale) OPENAPI_API_BASE_URL = https://test.sdi.openapi.it (default sandbox)
 *
 * Uso: npx tsx scripts/openapi-smoke.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { buildAcubePayload } from '../src/lib/fatturapa/payload-builder';
import type {
  Customer,
  Invoice,
  InvoiceItem,
  InvoiceSettings,
} from '../src/lib/fatturapa/types';

// ─── env loader ─────────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const file = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of file.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx < 0) continue;
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* */
  }
}
loadEnvLocal();

const SDI_BASE = (
  process.env.OPENAPI_API_BASE_URL ?? 'https://test.sdi.openapi.it'
).replace(/\/+$/, '');
const OAUTH_BASE = SDI_BASE.includes('test.sdi.openapi.it')
  ? 'https://test.oauth.openapi.it'
  : SDI_BASE.includes('sdi.openapi.it')
    ? 'https://oauth.openapi.it'
    : SDI_BASE.replace('://sdi.', '://oauth.').replace('://test.sdi.', '://test.oauth.');

const USERNAME = process.env.OPENAPI_USERNAME;
const API_KEY = process.env.OPENAPI_API_KEY;

if (!USERNAME || !API_KEY) {
  console.error('❌ Servono OPENAPI_USERNAME e OPENAPI_API_KEY in .env.local');
  console.error('   Recuperale da https://console.openapi.com/oauth');
  process.exit(1);
}

// ─── Auth ───────────────────────────────────────────────────────────────────
async function getToken(): Promise<string> {
  const basic = Buffer.from(`${USERNAME}:${API_KEY}`).toString('base64');
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({
      scopes: [
        'POST:sdi.openapi.it/invoices',
        'GET:sdi.openapi.it/invoices/*',
        'GET:sdi.openapi.it/invoices_notifications/*',
        'POST:sdi.openapi.it/api_configurations',
        'POST:sdi.openapi.it/business_registry_configurations',
      ],
      ttl: 86400, // 1 giorno (smoke test)
    }),
  });
  if (!res.ok) throw new Error(`Token failed HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { token?: string; success?: boolean; message?: string };
  if (!data.token) throw new Error(`Token assente: ${JSON.stringify(data)}`);
  return data.token;
}

let token = '';
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SDI_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

// ─── Mock objects ──────────────────────────────────────────────────────────
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
  senderEndpoint: SDI_BASE,
  senderTestMode: true,
  webhookSecret: null,
  acubeBusinessRegistryUuid: null,
  acubeNumberingSequenceUuid: null,
  // Importante: Openapi NON ha auto-numbering, quindi mettiamo un numero esplicito
  acubeNumberingSequenceName: 'OPENAPI-SMOKE-1',
  acubeCreditNoteSequenceUuid: null,
  acubeCreditNoteSequenceName: 'OPENAPI-SMOKE-NC-1',
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

// Fattura con numero esplicito (Openapi non auto-numera!)
const today = new Date().toISOString().slice(0, 10);
const explicitNumber = `OPENAPI-SMOKE-${Date.now().toString().slice(-6)}`;

const invoice: Invoice = {
  id: 999,
  tipoDocumento: 'TD01',
  sezionale: 'OPENAPI-SMOKE',
  numero: 1,
  anno: new Date().getFullYear(),
  numeroCompleto: explicitNumber, // popolato — payload-builder userà questo invece di getNumero(...)
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
  notes: 'Smoke test Openapi SDI sandbox',
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

// ─── Esecuzione ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔌 SDI base: ${SDI_BASE}`);
  console.log(`🔑 OAuth base: ${OAUTH_BASE}`);
  console.log(`👤 User: ${USERNAME}\n`);

  console.log('1) POST /token (Basic auth + scopes)…');
  token = await getToken();
  console.log(`   ✅ token (len=${token.length})\n`);

  console.log('2) GET /business_registry_configurations…');
  const brRes = await authedFetch('/business_registry_configurations');
  if (!brRes.ok) {
    console.log(`   ⚠️  HTTP ${brRes.status}: ${(await brRes.text()).slice(0, 200)}`);
  } else {
    const data = (await brRes.json()) as any;
    const items: any[] = data?.data ?? data?.['hydra:member'] ?? [];
    if (!items.length) {
      console.log('   ⚠️  Nessuna BusinessRegistry trovata.');
      console.log('       Crea una su console.openapi.com (Sandbox SDI) con fiscal_id=01340960481');
    } else {
      console.log(`   ✅ ${items.length} BusinessRegistry:`);
      for (const it of items) {
        console.log(
          `       • fiscal_id=${it.fiscal_id ?? '?'}  customer_invoice=${
            it.customer_invoice_enabled ?? '?'
          }  legal_storage=${it.apply_legal_storage ?? '?'}`,
        );
      }
    }
  }
  console.log();

  console.log('3) Build payload (caso Yana, numerazione client-side)…');
  const payload = buildAcubePayload({ invoice, items, customer, settings });
  console.log(
    `   ✅ TD01 numero=${
      payload.fattura_elettronica_body[0].dati_generali.dati_generali_documento.numero
    } totale=${
      payload.fattura_elettronica_body[0].dati_generali.dati_generali_documento
        .importo_totale_documento
    }\n`,
  );

  console.log('4) POST /invoices…');
  const sendRes = await authedFetch('/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `openapi-smoke-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });
  const sendText = await sendRes.text();
  if (!sendRes.ok) {
    console.error(`   ❌ HTTP ${sendRes.status}`);
    console.error('   Body:', sendText.slice(0, 2000));
    process.exit(1);
  }
  let sendBody: any = null;
  try {
    sendBody = JSON.parse(sendText);
  } catch {
    sendBody = sendText;
  }
  const invoiceUuid: string = sendBody?.data?.uuid ?? sendBody?.uuid ?? '';
  if (!invoiceUuid) {
    console.error('   ❌ uuid mancante:', sendText.slice(0, 500));
    process.exit(1);
  }
  console.log(`   ✅ accepted, uuid=${invoiceUuid}`);
  console.log(`   marking iniziale: ${sendBody?.data?.marking ?? sendBody?.marking ?? '(?)'}\n`);

  console.log('5) Polling status per max 25s…');
  const start = Date.now();
  let lastMarking: string | null = null;
  while (Date.now() - start < 25_000) {
    await new Promise((r) => setTimeout(r, 3_000));
    const r = await authedFetch(`/invoices/${encodeURIComponent(invoiceUuid)}`);
    if (!r.ok) {
      console.log(`   poll HTTP ${r.status}`);
      continue;
    }
    const body = (await r.json()) as any;
    const data = body?.data ?? body;
    const marking = data?.marking;
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (marking !== lastMarking) {
      console.log(`   [${elapsed}s] marking=${marking}  notice=${data?.notice ?? '-'}`);
      lastMarking = marking;
    }
    if (marking && marking !== 'waiting') break;
  }

  console.log(`\n📋 Riepilogo finale per UUID ${invoiceUuid}`);
  console.log('   Vai su https://console.openapi.com/apis/sdi/dashboard per verificare.');
}

main().catch((e) => {
  console.error('\n❌ Errore:', e.message ?? e);
  process.exit(1);
});
