/**
 * Cancella dal DB la fattura sandbox di stasera (Roehreke HM5MANT333).
 *
 * La fattura era stata generata via sandbox Openapi (UUID 019de058…) per testare
 * end-to-end l'integrazione. Era stata isolata in sezionale='SANDBOX-AIR' dal
 * seed script Krossbooking così da non occupare il numero 1 della sezione AIR.
 *
 * Adesso la rimuoviamo del tutto perché:
 *   - La booking di Roehreke (HM5MANT333) è una prenotazione reale futura
 *     (10-24/05/2026), non ancora fatturata
 *   - Lasciare l'invoice linkata fa apparire la booking come "fatturata" in UI
 *     mentre invece deve mostrare "Da emettere"
 *   - Sandbox lato Openapi non si cancella ma non serve: era solo un test
 *
 * Cancella anche righe correlate (invoice_items + invoice_sdi_logs) per non
 * lasciare orfani.
 *
 * Idempotente: se la fattura non esiste più, non fa nulla.
 *
 * Uso:
 *   npx tsx scripts/delete-sandbox-roehreke.ts
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

import { dbExecute, dbQuery, dbQueryOne } from '../src/lib/db';

async function main() {
  console.log('🗑  Cancello fattura sandbox Roehreke (HM5MANT333)\n');

  // Selezione robusta: tutte le invoice in sezionale SANDBOX-AIR oppure con
  // external_id che inizia con 019de058 (UUID Openapi della sandbox di stasera).
  const candidates = await dbQuery(
    `SELECT i.id, i.sezionale, i.numero_completo, i.stato, i.external_id, b.booking_id
       FROM invoices i
       LEFT JOIN bookings b ON b.id = i.booking_id
       WHERE i.sezionale = 'SANDBOX-AIR'
          OR (i.external_id IS NOT NULL AND i.external_id LIKE '019de058%')`,
  );

  if (candidates.length === 0) {
    console.log('   ✅ nessuna fattura sandbox trovata, nulla da fare');
    return;
  }

  for (const c of candidates) {
    const row: any = c;
    console.log(
      `▶ id=${row.id}  sezionale=${row.sezionale}  numero=${row.numero_completo ?? '-'}  stato=${row.stato}  uuid=${row.external_id ?? '-'}  booking=${row.booking_id ?? '-'}`,
    );
    const itemsRes = await dbExecute(`DELETE FROM invoice_items WHERE invoice_id = ?`, [row.id]);
    console.log(`   • invoice_items eliminate: ${(itemsRes as any).rowsAffected ?? 0}`);
    const logsRes = await dbExecute(`DELETE FROM invoice_sdi_logs WHERE invoice_id = ?`, [row.id]);
    console.log(`   • invoice_sdi_logs eliminati: ${(logsRes as any).rowsAffected ?? 0}`);
    const invRes = await dbExecute(`DELETE FROM invoices WHERE id = ?`, [row.id]);
    console.log(`   • invoice eliminata: ${(invRes as any).rowsAffected ?? 0}\n`);
  }

  // Verifica residua
  const remaining = await dbQueryOne(
    `SELECT COUNT(*) AS c FROM invoices WHERE sezionale = 'SANDBOX-AIR'`,
  );
  console.log(`Verifica: invoices residue su SANDBOX-AIR = ${(remaining as any).c}`);
  console.log('🎉 Operazione completata. Roehreke (HM5MANT333) tornerà "Da emettere".');
}

main().catch((e) => {
  console.error('❌ Errore:', e.message ?? e);
  process.exit(1);
});
