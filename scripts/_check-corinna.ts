/**
 * Quick check: stato di Corinna Kilger e di tutte le booking cancellate.
 * Read-only. Usa-e-getta — cancellare dopo.
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

import { dbQuery } from '../src/lib/db';

async function main() {
  console.log('🔍 Corinna Kilger:');
  const corinna = await dbQuery(
    `SELECT id, booking_id, guest_name, check_in, check_out, cancelled
       FROM bookings WHERE LOWER(guest_name) LIKE '%kilger%' OR booking_id = 'HMQYPSEA4P'`,
  );
  for (const c of corinna) {
    const r: any = c;
    console.log(`  id=${r.id} bk=${r.booking_id} ${r.guest_name} ${r.check_in}→${r.check_out}  cancelled=${r.cancelled}`);
  }
  if (corinna.length === 0) console.log('  (non trovata in DB)');

  console.log('\n📋 Tutte le booking cancellate (cancelled=1):');
  const cancelled = await dbQuery(
    `SELECT id, booking_id, guest_name, check_in FROM bookings WHERE cancelled = 1 ORDER BY check_in DESC`,
  );
  if (cancelled.length === 0) console.log('  (nessuna)');
  else for (const c of cancelled) {
    const r: any = c;
    console.log(`  id=${r.id} bk=${r.booking_id} ${r.guest_name} ${r.check_in}`);
  }

  console.log('\n📊 Counter:');
  const total = await dbQuery(`SELECT COUNT(*) as c FROM bookings`);
  const active = await dbQuery(`SELECT COUNT(*) as c FROM bookings WHERE COALESCE(cancelled,0) = 0`);
  const canc = await dbQuery(`SELECT COUNT(*) as c FROM bookings WHERE cancelled = 1`);
  console.log(`  totali=${(total[0] as any).c}  attive=${(active[0] as any).c}  cancellate=${(canc[0] as any).c}`);
}

main().catch((e) => { console.error('❌', e.message ?? e); process.exit(1); });
