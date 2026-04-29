/**
 * Simulatore webhook ACube — invia 4 scenari al nostro endpoint webhook locale.
 *
 * Prerequisiti:
 *   1. Server Next.js attivo:           npm run dev
 *   2. invoice_settings.webhook_secret valorizzato (vedi /admin/fatturazione/impostazioni)
 *   3. Almeno 1 invoice nel DB con un external_id valido
 *
 * Uso:
 *   WEBHOOK_SECRET=<bearer-token> WEBHOOK_INVOICE_UUID=<uuid> npx tsx scripts/test-webhook.ts
 *
 * Oppure passa entrambi a CLI:
 *   npx tsx scripts/test-webhook.ts <bearer-token> <uuid> [http://localhost:3000]
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

const [, , cliSecret, cliUuid, cliBase] = process.argv;
const WEBHOOK_SECRET = cliSecret ?? process.env.WEBHOOK_SECRET;
const INVOICE_UUID = cliUuid ?? process.env.WEBHOOK_INVOICE_UUID;
const BASE_URL = (cliBase ?? process.env.WEBHOOK_BASE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

if (!WEBHOOK_SECRET || !INVOICE_UUID) {
  console.error('❌ Mancano WEBHOOK_SECRET e WEBHOOK_INVOICE_UUID.');
  console.error('   npx tsx scripts/test-webhook.ts <bearer> <uuid> [base_url]');
  process.exit(1);
}

const ENDPOINT = `${BASE_URL}/api/invoices/webhook/acube`;

// ─── Scenari ──────────────────────────────────────────────────────────────

const scenarios: Array<{ name: string; body: any }> = [
  {
    name: 'invoice-status-quarantena (waiting → quarantena)',
    body: {
      uuid: INVOICE_UUID,
      marking: 'quarantena',
      previous_marking: 'waiting',
      notice: 'SDI temporaneamente non raggiungibile (test)',
      transioned_at: new Date().toISOString(),
    },
  },
  {
    name: 'customer-invoice (quarantena → sent)',
    body: {
      uuid: INVOICE_UUID,
      marking: 'sent',
      previous_marking: 'quarantena',
      notice: null,
      transioned_at: new Date().toISOString(),
    },
  },
  {
    name: 'customer-notification RC (Ricevuta Consegna)',
    body: {
      uuid: `notif-${Date.now()}`,
      type: 'RC',
      created_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      file: `https://api-sandbox.acubeapi.com/notifications/RC_${INVOICE_UUID}.xml`,
      invoice: { uuid: INVOICE_UUID },
    },
  },
  {
    name: 'customer-notification MC (Mancata Consegna estero)',
    body: {
      uuid: `notif-${Date.now() + 1}`,
      type: 'MC',
      created_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      file: `https://api-sandbox.acubeapi.com/notifications/MC_${INVOICE_UUID}.xml`,
      invoice: { uuid: INVOICE_UUID },
      notice: 'Cliente estero senza cassetto fiscale italiano (normale)',
    },
  },
];

async function run() {
  console.log(`🎯 Endpoint: ${ENDPOINT}`);
  console.log(`📦 Invoice UUID: ${INVOICE_UUID}\n`);

  for (const s of scenarios) {
    process.stdout.write(`→ ${s.name}… `);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(s.body),
      });
      const text = await res.text();
      let body: any = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      console.log(`HTTP ${res.status}`);
      console.log('   →', JSON.stringify(body).slice(0, 200));
    } catch (e: any) {
      console.log(`❌ ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\n✨ Test completato. Ora verifica:');
  console.log(`   1. Lo stato della fattura in /admin/fatturazione/<id>`);
  console.log(`   2. Tab "Log SDI" deve mostrare 4 nuovi eventi`);
  console.log(`   3. Marking ACube deve passare attraverso quarantena → sent`);
}

run().catch((e) => {
  console.error('❌', e.message ?? e);
  process.exit(1);
});
