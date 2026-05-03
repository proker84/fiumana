/**
 * Collega i 4 placeholder Krossbooking (1-4/2026) ai booking reali di Aprile.
 *
 * Le 4 fatture sono state emesse via Krossbooking (sistema legacy). Per avere
 * il flusso UI corretto:
 *   - Lista prenotazioni → badge "Fattura ✓ N/2026" verde
 *   - Sezione fatturazione → mostrarle come "consegnate"
 *   - Counter "fatture emesse" coerente
 *
 * Mappatura cronologica per check-in (Aprile 2026):
 *    1/2026 → HMPBP8SR5J  Nikolas Augusti  (03→06/04)
 *    2/2026 → HMF2HFZYWJ  Ronja Kolle      (06→10/04)
 *    3/2026 → HME34CHEBB  Xenia Polityko   (12→16/04)
 *    4/2026 → HMTAFDJS9M  Yana Kachura     (18→22/04)
 *
 * Lo script è idempotente: rilanciandolo aggiorna solo il necessario.
 *
 * Uso:
 *   npx tsx scripts/link-krossbooking-invoices.ts
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

import { dbExecute, dbQueryOne, dbQuery } from '../src/lib/db';

interface Mapping {
  numero: number;
  bookingExternal: string; // Codice di conferma Airbnb
  guest: string; // solo per log leggibile
  dataDocumento: string; // data check-in (YYYY-MM-DD)
}

const MAPPINGS: Mapping[] = [
  {
    numero: 1,
    bookingExternal: 'HMPBP8SR5J',
    guest: 'Nikolas Augusti',
    dataDocumento: '2026-04-03',
  },
  {
    numero: 2,
    bookingExternal: 'HMF2HFZYWJ',
    guest: 'Ronja Kolle',
    dataDocumento: '2026-04-06',
  },
  {
    numero: 3,
    bookingExternal: 'HME34CHEBB',
    guest: 'Xenia Polityko',
    dataDocumento: '2026-04-12',
  },
  {
    numero: 4,
    bookingExternal: 'HMTAFDJS9M',
    guest: 'Yana Kachura',
    dataDocumento: '2026-04-18',
  },
];

async function main() {
  console.log('🔗 Linka placeholder Krossbooking 1-4/2026 ai booking reali Aprile\n');

  for (const m of MAPPINGS) {
    console.log(`▶ ${m.numero}/2026 → ${m.guest} (${m.bookingExternal})`);

    // 1) Trova booking reale
    const bk = (await dbQueryOne(
      `SELECT id FROM bookings WHERE booking_id = ? LIMIT 1`,
      [m.bookingExternal],
    )) as any;
    if (!bk) {
      console.log(`   ⚠️  booking ${m.bookingExternal} NON trovato in DB — skip`);
      continue;
    }
    const bookingId: number = Number(bk.id);

    // 2) Trova invoice placeholder
    const inv = (await dbQueryOne(
      `SELECT id, booking_id, data_documento FROM invoices
        WHERE sezionale = 'AIR' AND anno = 2026 AND numero = ? LIMIT 1`,
      [m.numero],
    )) as any;
    if (!inv) {
      console.log(`   ⚠️  invoice ${m.numero}/2026 NON trovata — esegui prima seed-krossbooking-placeholders`);
      continue;
    }

    // 3) Linka + aggiorna data documento
    await dbExecute(
      `UPDATE invoices
         SET booking_id = ?,
             data_documento = ?,
             data_pagamento = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      [bookingId, m.dataDocumento, m.dataDocumento, inv.id],
    );
    console.log(
      `   ✅ invoice id=${inv.id} → booking_id=${bookingId}, data=${m.dataDocumento}`,
    );

    // 4) Annulla eventuali altre bozze sullo stesso booking (es. "Bozza #2" Nikolas)
    const otherDrafts = await dbQuery(
      `SELECT id, numero_completo FROM invoices
        WHERE booking_id = ? AND id <> ? AND stato = 'bozza'`,
      [bookingId, inv.id],
    );
    for (const d of otherDrafts) {
      const draftId = Number((d as any).id);
      await dbExecute(
        `UPDATE invoices
           SET stato = 'annullata',
               notes = COALESCE(notes,'') || ' [annullata: superata da Krossbooking placeholder]',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        [draftId],
      );
      console.log(`   🗑  annullata bozza residua id=${draftId} (${(d as any).numero_completo ?? '#' + draftId})`);
    }
    console.log();
  }

  // Verifica finale
  console.log('Verifica finale:');
  const rows = await dbQuery(
    `SELECT i.numero_completo, i.stato, i.booking_id, b.guest_name
       FROM invoices i
       LEFT JOIN bookings b ON b.id = i.booking_id
       WHERE i.sezionale = 'AIR' AND i.anno = 2026 AND i.numero IN (1,2,3,4)
       ORDER BY i.numero`,
  );
  for (const r of rows) {
    const row: any = r;
    console.log(
      `   ${row.numero_completo}  stato=${row.stato}  booking=${row.guest_name ?? '(no guest)'}`,
    );
  }
  console.log('\n🎉 Linking completato. Ricarica /admin/prenotazioni per vedere i badge verdi.');
}

main().catch((e) => {
  console.error('❌ Errore:', e.message ?? e);
  process.exit(1);
});
