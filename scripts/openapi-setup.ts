/**
 * Bootstrap iniziale di Openapi SDI per Immobiliare Fiumana.
 *
 * Esegue UNA TANTUM:
 *   1. POST /token con scopes
 *   2. POST /business_registry_configurations (se non esiste già)
 *   3. POST /api_configurations con TUTTI i webhook in una sola chiamata
 *      (Openapi sovrascrive ogni volta — quindi 1 chiamata = setup completo)
 *
 * Configurazione:
 *   - OPENAPI_USERNAME, OPENAPI_API_KEY in .env.local
 *   - OPENAPI_API_BASE_URL (default sandbox)
 *   - WEBHOOK_URL: URL pubblico del nostro endpoint webhook in produzione
 *   - WEBHOOK_BEARER: il valore secret salvato in invoice_settings.webhook_secret
 *
 * Uso:
 *   WEBHOOK_URL=https://immobiliarefiumana.com/api/invoices/webhook/acube \
 *   WEBHOOK_BEARER=Bearer_<secret> \
 *   npx tsx scripts/openapi-setup.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

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
const STATIC_TOKEN = process.env.OPENAPI_TOKEN; // token persistente con scope pre-configurati
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ?? 'https://immobiliarefiumana.com/api/invoices/webhook/acube';
const WEBHOOK_BEARER = process.env.WEBHOOK_BEARER;

if (!STATIC_TOKEN && (!USERNAME || !API_KEY)) {
  console.error(
    '❌ Servono OPENAPI_TOKEN (token persistente) oppure OPENAPI_USERNAME+OPENAPI_API_KEY in .env.local',
  );
  console.error('   Genera un token con scope SDI dalla console: https://console.openapi.com/oauth');
  process.exit(1);
}
if (!WEBHOOK_BEARER) {
  console.error('❌ Serve WEBHOOK_BEARER (es. "Bearer xxxxxxxxxxJqb8")');
  console.error('   Recuperalo dalla pagina /admin/fatturazione/impostazioni → "Webhook secret"');
  console.error('   Esempio: WEBHOOK_BEARER="Bearer XKtUP0PA…Jqb8" npx tsx scripts/openapi-setup.ts');
  process.exit(1);
}

const FISCAL_ID = '01340960481';

async function getToken(): Promise<string> {
  // Modalità preferita: token statico già configurato con scope dalla console
  if (STATIC_TOKEN) return STATIC_TOKEN;

  // Fallback: deriva token via Basic auth + scopes (richiede prodotto SDI sottoscritto)
  const basic = Buffer.from(`${USERNAME}:${API_KEY}`).toString('base64');
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
    body: JSON.stringify({
      scopes: [
        'POST:sdi.openapi.it/invoices',
        'POST:sdi.openapi.it/invoices_legal_storage',
        'GET:sdi.openapi.it/invoices/*',
        'GET:sdi.openapi.it/invoices_notifications/*',
        'POST:sdi.openapi.it/api_configurations',
        'GET:sdi.openapi.it/api_configurations',
        'POST:sdi.openapi.it/business_registry_configurations',
        'GET:sdi.openapi.it/business_registry_configurations',
        'PATCH:sdi.openapi.it/business_registry_configurations/*',
      ],
      ttl: 30 * 24 * 3600,
    }),
  });
  if (!res.ok) throw new Error(`Token failed HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { token?: string; success?: boolean };
  if (!data.token) throw new Error('Token mancante');
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

async function main() {
  console.log(`🔌 SDI base: ${SDI_BASE}`);
  console.log(`🔑 OAuth base: ${OAUTH_BASE}`);
  console.log(`🌐 Webhook URL: ${WEBHOOK_URL}\n`);

  console.log('1) Token…');
  token = await getToken();
  console.log(`   ✅ token (len=${token.length})${STATIC_TOKEN ? ' [statico da OPENAPI_TOKEN]' : ' [generato via Basic auth]'}\n`);

  // ─── 2) BusinessRegistry ───────────────────────────────────────────────
  console.log('2) BusinessRegistry…');
  const brGet = await authedFetch(`/business_registry_configurations/${FISCAL_ID}`);
  if (brGet.ok) {
    const data = (await brGet.json()) as any;
    console.log(`   ✅ già esiste — name="${data?.data?.name ?? '?'}", legal_storage=${data?.data?.apply_legal_storage}`);
  } else if (brGet.status === 404) {
    console.log('   📝 non esiste, la creo…');
    const create = await authedFetch('/business_registry_configurations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fiscal_id: FISCAL_ID,
        name: 'Soc. a Responsabilità limitata Immobiliare Fiumana',
        email: 'immobiliarefiumana@gmail.com',
        apply_signature: false,
        apply_legal_storage: true,
      }),
    });
    if (!create.ok) {
      console.error(`   ❌ HTTP ${create.status}: ${(await create.text()).slice(0, 500)}`);
      process.exit(1);
    }
    const data = (await create.json()) as any;
    console.log(`   ✅ creata. UUID: ${data?.data?.id ?? '?'}`);
    console.log('   ⚠️  Controlla la mail di immobiliarefiumana@gmail.com per attivare la legal storage!');
  } else {
    console.error(`   ❌ HTTP ${brGet.status}: ${(await brGet.text()).slice(0, 300)}`);
    process.exit(1);
  }
  console.log();

  // ─── 3) ApiConfiguration con tutti i 7 webhook ─────────────────────────
  console.log('3) ApiConfiguration (overwrites tutto)…');
  // DEBUG: provo con UN solo callback minimo per isolare il bug 502
  const events = process.env.EVENTS_DEBUG === 'all'
    ? [
        'supplier-invoice',
        'customer-invoice',
        'customer-notification',
        'invoice-status-quarantena',
        'invoice-status-invoice-error',
      ]
    : ['customer-notification']; // solo questo per il primo test

  const callbacks = events.map((event) => ({
    event,
    url: WEBHOOK_URL,
    auth_header: WEBHOOK_BEARER,
    // niente "field" — opzionale, riduciamo le variabili
  }));

  const reqBody = { fiscal_id: FISCAL_ID, callbacks };
  console.log('   📤 Payload:', JSON.stringify(reqBody, null, 2).replace(WEBHOOK_BEARER ?? '', '***BEARER***'));

  const apiCfgRes = await authedFetch('/api_configurations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  if (!apiCfgRes.ok) {
    console.error(`   ❌ HTTP ${apiCfgRes.status}: ${(await apiCfgRes.text()).slice(0, 500)}`);
    process.exit(1);
  }
  const apiCfgData = (await apiCfgRes.json()) as any;
  const items: any[] = apiCfgData?.data ?? [];
  console.log(`   ✅ ${callbacks.length} webhook configurati per fiscal_id=${FISCAL_ID}`);
  for (const it of items) {
    if (Array.isArray(it.callbacks)) {
      for (const cb of it.callbacks) {
        console.log(`       • ${cb.event}  → ${cb.url}`);
      }
    }
  }

  console.log('\n✨ Setup completato.');
  console.log(`\nProssimi passi:`);
  console.log(`  • Verifica la mail a immobiliarefiumana@gmail.com per attivare la legal storage (se non l'hai già fatto)`);
  console.log(`  • Registra il Codice Destinatario JKKZDGR su https://ivaservizi.agenziaentrate.gov.it/`);
  console.log(`    per ricevere automaticamente le fatture passive Airbnb`);
  console.log(`  • Lancia npx tsx scripts/openapi-smoke.ts per il primo invio di test`);
}

main().catch((e) => {
  console.error('\n❌ Errore:', e.message ?? e);
  process.exit(1);
});
