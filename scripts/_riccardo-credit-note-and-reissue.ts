/**
 * Procedura riemissione fattura Riccardo:
 *   1. Crea bozza Nota di Credito (TD04) per stornare la fattura 6/2026 errata
 *      → diventerà 7/2026 al momento dell'invio (totale -250,50 €)
 *   2. Crea bozza nuova fattura (TD01) corretta a 300 € usando il calculator
 *      aggiornato (totale = total_amount + airbnb_commission)
 *      → diventerà 8/2026 al momento dell'invio
 *
 * Lo script crea SOLO bozze, NON le invia al SDI. L'admin verifica i dati
 * sulla UI e poi clicca "Invia al SDI" su entrambe in sequenza.
 *
 * Idempotente: se trova bozze già esistenti per lo stesso scopo, le riutilizza.
 *
 * Uso: npx tsx scripts/_riccardo-credit-note-and-reissue.ts
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
import { computeBookingInvoice } from '../src/lib/fatturapa/calculator';

const ORIGINAL_INVOICE_ID = 6; // la 6/2026 errata
const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  console.log('🔧 Riemissione fattura Riccardo (TD04 + nuova TD01)\n');

  // 1) Recupera la fattura originale
  const orig = (await dbQueryOne(
    `SELECT i.*, c.id AS customer_id, b.id AS booking_id_real
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN bookings b ON b.id = i.booking_id
       WHERE i.id = ?`,
    [ORIGINAL_INVOICE_ID],
  )) as any;
  if (!orig) {
    console.error(`❌ fattura id=${ORIGINAL_INVOICE_ID} non trovata`);
    process.exit(1);
  }
  console.log(`Fattura padre: ${orig.numero_completo} stato=${orig.stato} totale=${orig.totale_cents / 100} €`);
  console.log(`  customer_id=${orig.customer_id} booking_id=${orig.booking_id}`);

  // 2) Verifica/crea bozza Nota di Credito (TD04)
  const existingTD04 = (await dbQueryOne(
    `SELECT id, numero_completo, stato FROM invoices
       WHERE tipo_documento = 'TD04' AND parent_invoice_id = ? AND stato IN ('bozza','in_invio')
       LIMIT 1`,
    [ORIGINAL_INVOICE_ID],
  )) as any;
  let td04Id: number;
  if (existingTD04) {
    td04Id = Number(existingTD04.id);
    console.log(`\n✓ Nota di Credito già esistente: id=${td04Id}, stato=${existingTD04.stato}`);
  } else {
    console.log('\n▶ Creo bozza TD04 (Nota di Credito di storno)…');
    const insertTD04 = await dbExecute(
      `INSERT INTO invoices (
         tipo_documento, sezionale, data_documento,
         booking_id, customer_id, parent_invoice_id,
         imponibile_cents, iva_cents, totale_cents, aliquota_iva,
         booking_total_cents, city_tax_cents, airbnb_commission_cents,
         modalita_pagamento, data_pagamento, stato, notes
       ) VALUES (
         'TD04', 'AIR-NC', ?,
         ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?,
         'MP08', ?, 'bozza',
         'Nota di credito di storno totale per fattura ${orig.numero_completo} emessa con totale errato (mancava commissione Airbnb 46,50 €). Riemissione corretta segue.'
       )`,
      [
        TODAY,
        orig.booking_id,
        orig.customer_id,
        ORIGINAL_INVOICE_ID,
        orig.imponibile_cents,
        orig.iva_cents,
        orig.totale_cents,
        orig.aliquota_iva,
        orig.booking_total_cents,
        orig.city_tax_cents,
        orig.airbnb_commission_cents,
        TODAY,
      ],
    );
    td04Id = Number((insertTD04 as any).lastInsertRowid ?? 0);

    // copia righe (stessi importi della fattura padre — la TD04 storna 1:1)
    const origItems = await import('../src/lib/db').then((m) => m.dbQuery(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY riga_numero`,
      [ORIGINAL_INVOICE_ID],
    ));
    for (const it of origItems) {
      const r: any = it;
      await dbExecute(
        `INSERT INTO invoice_items (
           invoice_id, riga_numero, descrizione, quantita,
           prezzo_unitario_cents, aliquota_iva, natura_iva,
           imponibile_cents, iva_cents, totale_cents
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          td04Id,
          r.riga_numero,
          `Storno: ${r.descrizione}`,
          r.quantita,
          r.prezzo_unitario_cents,
          r.aliquota_iva,
          r.natura_iva,
          r.imponibile_cents,
          r.iva_cents,
          r.totale_cents,
        ],
      );
    }
    console.log(`   ✅ TD04 creata id=${td04Id} totale=${orig.totale_cents / 100} € (storno)`);
  }

  // 3) Verifica/crea NUOVA bozza TD01 con totale corretto (300 €)
  const bk = (await dbQueryOne(
    `SELECT * FROM bookings WHERE id = ?`,
    [orig.booking_id],
  )) as any;
  if (!bk) {
    console.error(`❌ booking id=${orig.booking_id} non trovata`);
    process.exit(1);
  }
  const calc = computeBookingInvoice(
    {
      totalAmount: Number(bk.total_amount ?? 0),
      cityTaxAmount: Number(bk.city_tax_amount ?? 0),
      airbnbCommission: Number(bk.airbnb_commission ?? 0),
    },
    Number(orig.aliquota_iva ?? 10),
  );
  console.log(`\n▶ Nuova fattura TD01: totale=${calc.totaleFatturaCents / 100} €`);

  const existingNew = (await dbQueryOne(
    `SELECT id FROM invoices
       WHERE tipo_documento = 'TD01' AND booking_id = ? AND parent_invoice_id IS NULL
         AND stato IN ('bozza','in_invio') AND id <> ?
       LIMIT 1`,
    [orig.booking_id, ORIGINAL_INVOICE_ID],
  )) as any;
  let newId: number;
  if (existingNew) {
    newId = Number(existingNew.id);
    console.log(`   ✓ Nuova fattura già esistente: id=${newId}`);
  } else {
    const insertNew = await dbExecute(
      `INSERT INTO invoices (
         tipo_documento, sezionale, data_documento,
         booking_id, customer_id,
         imponibile_cents, iva_cents, totale_cents, aliquota_iva,
         booking_total_cents, city_tax_cents, airbnb_commission_cents,
         modalita_pagamento, data_pagamento, stato, notes
       ) VALUES (
         'TD01', 'AIR', ?,
         ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?,
         'MP08', ?, 'bozza',
         'Riemissione corretta — sostituisce ${orig.numero_completo} stornata con TD04. Totale corretto include commissione Airbnb 46,50 €.'
       )`,
      [
        TODAY,
        orig.booking_id,
        orig.customer_id,
        calc.split.imponibileCents,
        calc.split.ivaCents,
        calc.split.totaleCents,
        Number(orig.aliquota_iva ?? 10),
        calc.totaleOspiteCents,
        calc.cityTaxCents,
        calc.airbnbCommissionCents,
        bk.check_in,
      ],
    );
    newId = Number((insertNew as any).lastInsertRowid ?? 0);

    // riga descrittiva
    const checkIn = bk.check_in;
    const checkOut = bk.check_out;
    await dbExecute(
      `INSERT INTO invoice_items (
         invoice_id, riga_numero, descrizione, quantita,
         prezzo_unitario_cents, aliquota_iva,
         imponibile_cents, iva_cents, totale_cents
       ) VALUES (?, 1, ?, 1, ?, ?, ?, ?, ?)`,
      [
        newId,
        `Affitto soggiorno dal ${checkIn} al ${checkOut}`,
        calc.split.imponibileCents,
        Number(orig.aliquota_iva ?? 10),
        calc.split.imponibileCents,
        calc.split.ivaCents,
        calc.split.totaleCents,
      ],
    );
    console.log(`   ✅ Nuova fattura creata id=${newId} totale=${calc.split.totaleCents / 100} €`);
  }

  console.log('\n📋 Riepilogo finale:');
  console.log(`   1. TD04 (id=${td04Id}) sezionale=AIR-NC → al primo invio prenderà numero NC-1/2026 (sequenza dedicata note di credito, parte da 1)`);
  console.log(`   2. TD01 (id=${newId}) sezionale=AIR → al primo invio prenderà 7/2026 (continua la sequenza fatture)`);
  console.log('\n✏️  Vai sull\'app, verifica le 2 bozze e cliccale "Invia al SDI" in sequenza:');
  console.log(`   1° → /admin/fatturazione/${td04Id}  (TD04 prima!)`);
  console.log(`   2° → /admin/fatturazione/${newId}  (TD01 nuova)`);
}

main().catch((e) => {
  console.error('❌', e.message ?? e);
  process.exit(1);
});
