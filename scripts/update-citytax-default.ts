/**
 * Aggiorna nel DB il default `tassa_soggiorno_default_cents` da 200 (2 €) a 50
 * (0,50 €). Il default sullo schema vale solo per righe nuove — la riga
 * `invoice_settings` di Fiumana è già presente, quindi il valore vecchio
 * resterebbe finché non lo aggiorniamo esplicitamente.
 *
 * Uso:
 *   npx tsx scripts/update-citytax-default.ts
 *
 * Idempotente: se il valore è già 50 non fa nulla. NON tocca i city_tax_cents
 * delle fatture già emesse né i city_tax_amount delle bookings importate —
 * quelle sono storiche e vanno lasciate intatte.
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

import { dbExecute, dbQueryOne } from '../src/lib/db';

async function main() {
  const before = (await dbQueryOne(
    `SELECT tassa_soggiorno_default_cents FROM invoice_settings WHERE id = 1`,
  )) as any;
  const beforeVal = Number(before?.tassa_soggiorno_default_cents ?? 0);
  console.log(`tassa_soggiorno_default_cents attuale: ${beforeVal} (= ${(beforeVal / 100).toFixed(2)} €/notte/persona)`);

  if (beforeVal === 50) {
    console.log('✅ già a 50, nulla da fare');
    return;
  }

  await dbExecute(
    `UPDATE invoice_settings
        SET tassa_soggiorno_default_cents = 50,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1`,
  );

  const after = (await dbQueryOne(
    `SELECT tassa_soggiorno_default_cents FROM invoice_settings WHERE id = 1`,
  )) as any;
  console.log(`✅ aggiornato a: ${after?.tassa_soggiorno_default_cents} (= 0,50 €/notte/persona)`);
  console.log('\nNota: le bookings già importate con city_tax_amount calcolato a 2€');
  console.log('non vengono toccate. Per ricalcolare quelle future, apri il pannello');
  console.log('booking e clicca su "Ricalcola tassa di default".');
}

main().catch((e) => {
  console.error('❌ Errore:', e.message ?? e);
  process.exit(1);
});
