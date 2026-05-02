/**
 * Seed placeholder per le fatture emesse via Krossbooking (legacy).
 *
 * Le prime 4 fatture del 2026 sono state emesse via Krossbooking — non
 * dobbiamo riemetterle ma il sistema deve sapere che esistono per non
 * riassegnare i numeri 1..4. Questo script:
 *   1. Crea (se non esiste) un cliente placeholder "Krossbooking Legacy"
 *   2. Inserisce 4 record fattura con sezionale='AIR', anno=2026,
 *      numero=1..4, stato='consegnata', notes esplicativo
 *
 * Eseguibilità:
 *   - Idempotente: rilanciandolo non duplica nulla (controlla numero già esistente)
 *   - Non chiama Openapi: opera SOLO sul DB Turso locale
 *
 * Uso:
 *   npx tsx scripts/seed-krossbooking-placeholders.ts
 *
 * Importante: lancialo PRIMA del primo invio reale via Openapi PROD, così
 * la fattura per Riccardo (booking 01/05/2026) prende automaticamente
 * numero=5/2026 dal MAX(numero)+1.
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
    /* ok */
  }
}
loadEnvLocal();

import { dbExecute, dbQuery, dbQueryOne } from '../src/lib/db';

const SEZIONALE = 'AIR';
const ANNO = 2026;
const NUMERI_KROSSBOOKING = [1, 2, 3, 4];

// Date placeholder (Aprile 2026, una distribuita per ogni numero — solo per
// avere data_documento valido nel DB, NON sono date reali Krossbooking).
const DATE_PLACEHOLDER: Record<number, string> = {
  1: '2026-04-01',
  2: '2026-04-08',
  3: '2026-04-15',
  4: '2026-04-22',
};

async function ensurePlaceholderCustomer(): Promise<number> {
  const existing = await dbQueryOne(
    `SELECT id FROM customers WHERE cognome = ? AND nome = ? LIMIT 1`,
    ['Krossbooking', 'Legacy'],
  );
  if (existing) {
    return Number((existing as any).id);
  }
  const result = await dbExecute(
    `INSERT INTO customers (
       tipo, cognome, nome, codice_fiscale, partita_iva,
       nazione, indirizzo, cap, comune, provincia,
       email, codice_destinatario, is_estero, notes
     ) VALUES ('PF', ?, ?, NULL, NULL, 'IT', 'N/D', '00000', 'N/D', '',
              NULL, '0000000', 0, ?)`,
    [
      'Krossbooking',
      'Legacy',
      'Cliente placeholder per fatture emesse via Krossbooking (legacy). NON usare per nuove fatture.',
    ],
  );
  return Number((result as any).lastInsertRowid ?? (result as any).insertId);
}

async function seedInvoice(customerId: number, numero: number) {
  const numeroCompleto = `${numero}/${ANNO}`;
  const dataDoc = DATE_PLACEHOLDER[numero];

  const exists = await dbQueryOne(
    `SELECT id FROM invoices WHERE sezionale = ? AND anno = ? AND numero = ? LIMIT 1`,
    [SEZIONALE, ANNO, numero],
  );
  if (exists) {
    console.log(`   ⏭  invoice ${numeroCompleto} già presente (id=${(exists as any).id}), skip`);
    return;
  }

  const notes =
    `[KROSSBOOKING-LEGACY] Fattura emessa via Krossbooking (sistema legacy). ` +
    `Record placeholder creato per continuità numerazione progressiva. ` +
    `NON corrisponde a una fattura reale gestita da questa app: per ` +
    `consultare l'XML/PDF originale fare riferimento a Krossbooking.`;

  await dbExecute(
    `INSERT INTO invoices (
       tipo_documento, sezionale, numero, anno, numero_completo,
       data_documento, customer_id,
       imponibile_cents, iva_cents, totale_cents, aliquota_iva,
       modalita_pagamento, data_pagamento, stato, notes,
       inviata_at, consegnata_at
     ) VALUES (
       'TD01', ?, ?, ?, ?,
       ?, ?,
       0, 0, 0, 10.0,
       'MP08', ?, 'consegnata', ?,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )`,
    [SEZIONALE, numero, ANNO, numeroCompleto, dataDoc, customerId, dataDoc, notes],
  );
  console.log(`   ✅ invoice ${numeroCompleto} seedata`);
}

async function detectAndIsolateSandboxInvoices() {
  // Fatture 1-4/2026 esistenti su sezionale='AIR' che NON sono Krossbooking
  // (es. la 1/2026 sandbox di stasera). Le riassegnamo a sezionale='SANDBOX-AIR'
  // così liberano i numeri 1..4 per il seed Krossbooking. Identificazione:
  //   - hanno external_id (UUID Openapi) → erano fatture sandbox della nostra app
  //   - oppure notes NON contiene il marker [KROSSBOOKING-LEGACY]
  const conflicts = await dbQuery(
    `SELECT id, numero, numero_completo, external_id, notes, stato
       FROM invoices
       WHERE sezionale = ? AND anno = ? AND numero IN (1,2,3,4)`,
    [SEZIONALE, ANNO],
  );
  for (const c of conflicts) {
    const row: any = c;
    const isKrossbookingPlaceholder =
      typeof row.notes === 'string' && row.notes.includes('[KROSSBOOKING-LEGACY]');
    if (isKrossbookingPlaceholder) continue; // già seedato in run precedente
    console.log(
      `   ⚠️  conflitto: fattura id=${row.id} (${row.numero_completo}) external_id=${row.external_id ?? '-'} stato=${row.stato}`,
    );
    console.log(`       → riassegno a sezionale='SANDBOX-AIR' per liberare il numero ${row.numero}`);
    await dbExecute(
      `UPDATE invoices
         SET sezionale = 'SANDBOX-AIR',
             updated_at = CURRENT_TIMESTAMP,
             notes = COALESCE(notes, '') || ' [moved from AIR by seed script]'
         WHERE id = ?`,
      [row.id],
    );
  }
}

async function main() {
  console.log('🌱 Seed placeholder Krossbooking — fatture 1-4 / 2026\n');

  console.log('1) Identifica e isola eventuali fatture sandbox sui numeri 1..4…');
  await detectAndIsolateSandboxInvoices();
  console.log();

  console.log('2) Customer placeholder…');
  const customerId = await ensurePlaceholderCustomer();
  console.log(`   ✅ Krossbooking Legacy id=${customerId}\n`);

  console.log('3) Invoices placeholder…');
  for (const n of NUMERI_KROSSBOOKING) {
    await seedInvoice(customerId, n);
  }
  console.log();

  console.log('4) Verifica MAX(numero) post-seed…');
  const maxRow = await dbQueryOne(
    `SELECT COALESCE(MAX(numero), 0) AS max_num FROM invoices
     WHERE sezionale = ? AND anno = ?`,
    [SEZIONALE, ANNO],
  );
  const max = Number((maxRow as any).max_num);
  console.log(`   ✅ MAX(numero) = ${max}  →  prossima fattura sarà ${max + 1}/${ANNO}\n`);

  if (max >= 4) {
    console.log('🎉 Seed completato. La prima fattura via app Fiumana sarà 5/2026.');
  } else {
    console.warn(`⚠️  MAX dovrebbe essere ≥ 4 — controllare manualmente`);
  }
}

main().catch((e) => {
  console.error('❌ Seed fallito:', e.message ?? e);
  process.exit(1);
});
