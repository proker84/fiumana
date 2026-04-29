/**
 * Primo invio reale a sandbox ACube.
 *
 * Step:
 *   1. Login OAuth2
 *   2. Recupera/crea la NumberingSequence "FiumanaAIR"
 *   3. Invia una fattura di TEST con il payload generato dal nostro payload-builder
 *      (dati coerenti con il caso Yana Kachura: 340 €, IVA 10%, cliente UA estero)
 *   4. Polling status ogni 5s per max 90s e stampa marking + outcome
 *
 * Tutte le scritture restano in sandbox ACube. Niente viene salvato nel DB
 * Fiumana — è uno smoke test isolato.
 *
 * Uso: npx tsx scripts/acube-first-invoice.ts
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

// ─── Caricamento .env.local ───────────────────────────────────────────────
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
    /* nessun file: ok */
  }
}
loadEnvLocal();

const ENDPOINT = (process.env.ACUBE_API_BASE_URL ?? 'https://api-sandbox.acubeapi.com').replace(
  /\/+$/,
  '',
);
const USERNAME = process.env.ACUBE_USERNAME!;
const PASSWORD = process.env.ACUBE_PASSWORD!;

if (!USERNAME || !PASSWORD) {
  console.error('❌ ACUBE_USERNAME e ACUBE_PASSWORD obbligatori in .env.local');
  process.exit(1);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────
let token = '';

async function login() {
  const res = await fetch(`${ENDPOINT}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login HTTP ${res.status}: ${await res.text()}`);
  token = ((await res.json()) as { token: string }).token;
}

async function authedFetch(path: string, init: RequestInit = {}) {
  return fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function ensureNumberingSequence(name: string, format: string): Promise<string> {
  const list = await authedFetch('/numbering-sequences');
  const data = list.ok ? ((await list.json()) as any) : null;
  const items: any[] = Array.isArray(data) ? data : (data?.['hydra:member'] ?? data?.member ?? []);
  const existing = items.find((it) => it.name === name);
  if (existing) {
    const atId = existing['@id'] ?? '';
    const uuid = existing.uuid ?? (typeof atId === 'string' ? atId.split('/').pop() : '');
    return uuid ?? name;
  }

  console.log(`   📝 Sequenza "${name}" non trovata, la creo…`);
  const create = await authedFetch('/numbering-sequences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, format, number: 0 }),
  });
  if (!create.ok) {
    throw new Error(
      `POST /numbering-sequences HTTP ${create.status}: ${await create.text()}`,
    );
  }
  const created = (await create.json()) as any;
  const atId = created['@id'] ?? '';
  return created.uuid ?? (typeof atId === 'string' ? atId.split('/').pop() : '') ?? name;
}

// ─── Mock objects coerenti con i tipi del modulo ──────────────────────────

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
  senderProvider: 'acube',
  senderApiKeyEncrypted: null,
  senderEndpoint: ENDPOINT,
  senderTestMode: true,
  webhookSecret: null,
  acubeBusinessRegistryUuid: null,
  acubeNumberingSequenceUuid: null,
  acubeNumberingSequenceName: 'FiumanaAIR',
  acubeCreditNoteSequenceUuid: null,
  acubeCreditNoteSequenceName: 'FiumanaAIRNC',
  conservazioneProvider: 'acube',
  tassaSoggiornoDefaultCents: 200,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const customer: Customer = {
  id: 1,
  tipo: 'PF',
  ragioneSociale: null,
  cognome: 'TEST KACHURA',
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

const invoice: Invoice = {
  id: 999,
  tipoDocumento: 'TD01',
  sezionale: 'AIR',
  numero: null,
  anno: null,
  numeroCompleto: null,
  dataDocumento: new Date().toISOString().slice(0, 10),
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
  dataPagamento: new Date().toISOString().slice(0, 10),
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
  notes: 'Smoke test ACube sandbox',
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const items: InvoiceItem[] = [
  {
    rigaNumero: 1,
    descrizione: 'TEST — Affitto Incantevole Suite sul Mare 18-22 Aprile 2026',
    quantita: 1,
    prezzoUnitarioCents: 30909,
    aliquotaIva: 10,
    naturaIva: null,
    imponibileCents: 30909,
    ivaCents: 3091,
    totaleCents: 34000,
  },
];

// ─── Esecuzione ────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔌 Endpoint: ${ENDPOINT}\n`);

  console.log('1) Login…');
  await login();
  console.log('   ✅ OK\n');

  console.log('2) NumberingSequence "FiumanaAIR"…');
  const seqUuid = await ensureNumberingSequence('FiumanaAIR', '%Y/AIR/%04s');
  console.log(`   ✅ UUID: ${seqUuid}\n`);

  console.log('3) Build payload (caso Yana Kachura)…');
  const payload = buildAcubePayload({ invoice, items, customer, settings });
  console.log(
    `   ✅ payload pronto: TD01 totale=${
      payload.fattura_elettronica_body[0].dati_generali.dati_generali_documento
        .importo_totale_documento
    }, dest=${payload.fattura_elettronica_header.dati_trasmissione.codice_destinatario}\n`,
  );

  console.log('4) POST /invoices…');
  const sendRes = await authedFetch('/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `smoke-${Date.now()}`,
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
  const invoiceUuid: string = sendBody?.uuid ?? '';
  if (!invoiceUuid) {
    console.error('   ❌ uuid mancante nella risposta:', sendText.slice(0, 500));
    process.exit(1);
  }
  console.log(`   ✅ accepted, uuid=${invoiceUuid}`);
  console.log(`   marking iniziale: ${sendBody.marking ?? '(?)'}\n`);

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
    const marking = body.marking;
    const number = body.invoice_number ?? body.number;
    const notifs = (body.notifications ?? body.invoice_notifications ?? []) as any[];
    const lastNotif = notifs[notifs.length - 1];
    const elapsed = Math.round((Date.now() - start) / 1000);

    if (marking !== lastMarking) {
      console.log(
        `   [${elapsed}s] marking=${marking}  number=${number ?? '?'}  notif=${
          lastNotif?.type ?? '-'
        }  notice=${body.notice ?? '-'}`,
      );
      lastMarking = marking;
    }

    if (marking === 'sent' && notifs.length > 0) {
      console.log('\n✨ Notifica SDI ricevuta:');
      console.log('   tipo:', lastNotif.type);
      console.log('   data:', lastNotif.created_at ?? lastNotif.received_at);
      break;
    }
    if (marking === 'invoice-error') {
      console.log('\n❌ invoice-error:', body.notice);
      break;
    }
  }

  console.log(`\n📋 Riepilogo finale per UUID ${invoiceUuid}`);
  console.log(`   Vai su https://dashboard-sandbox.acubeapi.com/customer-invoice per verificare.`);
}

main().catch((e) => {
  console.error('\n❌ Errore:', e.message ?? e);
  process.exit(1);
});
