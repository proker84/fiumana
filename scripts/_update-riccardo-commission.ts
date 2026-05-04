/**
 * Inserisce il valore esatto della commissione Airbnb per la booking di
 * Riccardo (HMWWY28HHH) — verificato dalla console host: 303 € pagato
 * dall'ospite, 253,50 € net al host, 3 € tassa soggiorno → commissione = 46,50.
 *
 * Usa-e-getta. Cancellare dopo l'esecuzione.
 *
 * Uso: npx tsx scripts/_update-riccardo-commission.ts
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

const BOOKING_CODE = 'HMWWY28HHH';
const COMMISSION = 46.5;
const CITY_TAX = 3.0;

async function main() {
  const bk = (await dbQueryOne(
    `SELECT id, guest_name, total_amount, airbnb_commission, city_tax_amount
       FROM bookings WHERE booking_id = ?`,
    [BOOKING_CODE],
  )) as any;
  if (!bk) {
    console.error(`❌ booking ${BOOKING_CODE} non trovata`);
    process.exit(1);
  }
  console.log(`Booking ${BOOKING_CODE} (${bk.guest_name}):`);
  console.log(`  total_amount (Guadagni)   = ${bk.total_amount} €`);
  console.log(`  airbnb_commission attuale = ${bk.airbnb_commission ?? 0} €`);
  console.log(`  city_tax_amount attuale   = ${bk.city_tax_amount ?? 0} €`);

  await dbExecute(
    `UPDATE bookings
        SET airbnb_commission = ?,
            city_tax_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
    [COMMISSION, CITY_TAX, bk.id],
  );

  console.log(`\n✅ aggiornato:`);
  console.log(`  airbnb_commission → ${COMMISSION} €`);
  console.log(`  city_tax_amount   → ${CITY_TAX} €`);
  console.log(`\nProssima bozza fattura per Riccardo avrà totale = ${bk.total_amount + COMMISSION} €`);
}

main().catch((e) => {
  console.error('❌', e.message ?? e);
  process.exit(1);
});
