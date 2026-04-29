/**
 * Smoke test ACube — solo letture, nessuna scrittura.
 *
 * Verifica:
 *   1. Login OAuth2 password grant (POST /login)
 *   2. GET /business-registry-configurations → mostra l'UUID della Fiumana
 *   3. GET /numbering-sequences → mostra le sequenze già create
 *   4. GET /invoices?limit=5 → mostra eventuali fatture già esistenti
 *
 * Uso:
 *   npx tsx scripts/acube-smoke.ts
 *
 * Richiede ACUBE_USERNAME + ACUBE_PASSWORD in .env.local.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Carica .env.local manualmente (lo script gira fuori da Next)
function loadEnvLocal() {
  try {
    const file = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of file.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local non c'è — useremo solo le env esistenti
  }
}

loadEnvLocal();

const ENDPOINT = (process.env.ACUBE_API_BASE_URL ?? 'https://api-sandbox.acubeapi.com').replace(
  /\/+$/,
  '',
);
const USERNAME = process.env.ACUBE_USERNAME;
const PASSWORD = process.env.ACUBE_PASSWORD;

function check<T>(label: string, value: T | undefined | null): T {
  if (value === undefined || value === null || value === '') {
    console.error(`❌ ${label} mancante. Verifica .env.local`);
    process.exit(1);
  }
  return value as T;
}

async function main() {
  check('ACUBE_USERNAME', USERNAME);
  check('ACUBE_PASSWORD', PASSWORD);

  console.log(`🔌 Endpoint: ${ENDPOINT}`);
  console.log(`👤 User: ${USERNAME}\n`);

  // 1) Login
  console.log('1) Login → POST /login');
  const loginRes = await fetch(`${ENDPOINT}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USERNAME, password: PASSWORD }),
  });
  const loginText = await loginRes.text();
  if (!loginRes.ok) {
    console.error(`   ❌ HTTP ${loginRes.status}`);
    console.error('   Body:', loginText.slice(0, 500));
    process.exit(1);
  }
  let token: string;
  try {
    token = (JSON.parse(loginText) as { token?: string }).token!;
  } catch {
    console.error('   ❌ Risposta non JSON:', loginText.slice(0, 200));
    process.exit(1);
  }
  if (!token) {
    console.error('   ❌ Token mancante nella risposta');
    process.exit(1);
  }
  console.log(`   ✅ Token ricevuto (lunghezza ${token.length})\n`);

  const authedFetch = (path: string, init: RequestInit = {}) =>
    fetch(`${ENDPOINT}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });

  // 2) Business Registry
  console.log('2) GET /business-registry-configurations');
  const brRes = await authedFetch('/business-registry-configurations');
  if (!brRes.ok) {
    console.error(`   ❌ HTTP ${brRes.status}`);
    console.error('   Body:', (await brRes.text()).slice(0, 500));
  } else {
    const data = (await brRes.json()) as any;
    const items: any[] = Array.isArray(data) ? data : (data['hydra:member'] ?? data.member ?? []);
    if (items.length === 0) {
      console.log('   ⚠️  Nessuna BusinessRegistry trovata. Creane una su:');
      console.log('       https://dashboard-sandbox.acubeapi.com/business-registry-configurations');
    } else {
      console.log(`   ✅ Trovate ${items.length} BusinessRegistry:`);
      for (const it of items) {
        // ACube usa JSON-LD: il campo @id contiene l'IRI della risorsa
        const atId = it['@id'] ?? '';
        const uuid =
          it.uuid ??
          it.id ??
          (typeof atId === 'string' ? atId.split('/').filter(Boolean).pop() : '') ??
          '(no uuid)';
        const fid = it.fiscal_id ?? it.vat_number ?? '?';
        const name = it.name ?? it.fiscal_id_owner_name ?? '?';
        console.log(`       • UUID: ${uuid}`);
        console.log(`         fiscal_id: ${fid}`);
        console.log(`         name: ${name}`);
        console.log(`         @id: ${atId}`);
        console.log(`         keys: ${Object.keys(it).join(', ')}`);
      }
    }
  }
  console.log();

  // 3) Numbering sequences
  console.log('3) GET /numbering-sequences');
  const nsRes = await authedFetch('/numbering-sequences');
  if (!nsRes.ok) {
    console.log(`   ⚠️  HTTP ${nsRes.status} (può essere normale se non ne hai ancora create)`);
  } else {
    const data = (await nsRes.json()) as any;
    const items: any[] = Array.isArray(data) ? data : (data['hydra:member'] ?? data.member ?? []);
    if (items.length === 0) {
      console.log('   ℹ️  Nessuna sequenza ancora creata (è normale al primo run)');
    } else {
      console.log(`   ✅ Trovate ${items.length} sequenze:`);
      for (const it of items) {
        console.log(
          `       • ${it.uuid ?? '?'}  name="${it.name}"  format="${it.format}"  next=${
            (it.number ?? 0) + 1
          }`,
        );
      }
    }
  }
  console.log();

  // 4) Customer invoices recenti
  console.log('4) GET /invoices?limit=5');
  const invRes = await authedFetch('/invoices?itemsPerPage=5');
  if (!invRes.ok) {
    console.log(`   ⚠️  HTTP ${invRes.status}`);
  } else {
    const data = (await invRes.json()) as any;
    const items: any[] = Array.isArray(data) ? data : (data['hydra:member'] ?? data.member ?? []);
    console.log(`   ✅ ${items.length} fatture in sandbox`);
    for (const it of items.slice(0, 5)) {
      console.log(
        `       • ${it.uuid ?? '?'}  marking=${it.marking ?? '?'}  number=${
          it.invoice_number ?? '?'
        }`,
      );
    }
  }

  console.log('\n✨ Smoke test completato.');
}

main().catch((e) => {
  console.error('\n❌ Errore non gestito:', e.message ?? e);
  process.exit(1);
});
