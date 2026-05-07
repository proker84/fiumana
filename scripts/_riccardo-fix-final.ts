/**
 * Procedura finale (validata commercialista mag 2026):
 *
 *   Stato attuale:
 *     5/2026 → bozza ANNULLATA (residuo invio fallito Riccardo)
 *     6/2026 → TD01 inviata_sdi (Riccardo, totale errato 250,50)
 *
 *   Stato finale:
 *     5/2026 → TD01 BOZZA "rinata", totale 300,00, data 04/05/2026 (stessa
 *              della 6/2026), pronta per invio al SDI
 *     6/2026 → resta com'è (sbagliata ma già al SDI)
 *     7/2026 → TD04 BOZZA, nota di credito di storno della 6/2026
 *              (numerazione sequenziale stessa serie AIR, NON NC-)
 *
 * Lo script crea SOLO bozze, non invia nulla. L'admin verifica e clicca
 * "Invia al SDI" prima sulla 5 (per averla ufficialmente al SDI), poi sulla 7
 * (TD04 di storno).
 *
 * Uso: npx tsx scripts/_riccardo-fix-final.ts
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
import { computeBookingInvoice } from '../src/lib/fatturapa/calculator';

async function main() {
  console.log('🔧 Riccardo: rinasce 5/2026 corretta + crea 7/2026 TD04 storno\n');

  // ─── 1. Recupera la 6/2026 sbagliata ─────────────────────────────────────
  const inv6 = (await dbQueryOne(
    `SELECT * FROM invoices WHERE sezionale = 'AIR' AND anno = 2026 AND numero = 6 LIMIT 1`,
  )) as any;
  if (!inv6) {
    console.error('❌ fattura 6/2026 non trovata — abortisco');
    process.exit(1);
  }
  console.log(
    `📄 6/2026 (id=${inv6.id}) stato=${inv6.stato} totale=${inv6.totale_cents / 100} € data=${inv6.data_documento}`,
  );

  // ─── 2. Recupera la 5/2026 annullata ─────────────────────────────────────
  const inv5 = (await dbQueryOne(
    `SELECT * FROM invoices WHERE sezionale = 'AIR' AND anno = 2026 AND numero = 5 LIMIT 1`,
  )) as any;
  if (!inv5) {
    console.error('❌ fattura 5/2026 placeholder non trovata — abortisco');
    process.exit(1);
  }
  console.log(
    `📄 5/2026 (id=${inv5.id}) stato=${inv5.stato} totale=${inv5.totale_cents / 100} €`,
  );

  // ─── 3. Recupera booking + calcolo importi corretti ──────────────────────
  const booking = (await dbQueryOne(
    `SELECT * FROM bookings WHERE id = ?`,
    [inv6.booking_id],
  )) as any;
  if (!booking) {
    console.error('❌ booking di Riccardo non trovata');
    process.exit(1);
  }
  const calc = computeBookingInvoice(
    {
      totalAmount: Number(booking.total_amount ?? 0),
      cityTaxAmount: Number(booking.city_tax_amount ?? 0),
      airbnbCommission: Number(booking.airbnb_commission ?? 0),
    },
    Number(inv6.aliquota_iva ?? 10),
  );
  console.log(`\n💰 Calcolo nuova 5/2026:`);
  console.log(
    `   net (Guadagni)=${booking.total_amount}  + commission=${booking.airbnb_commission}  = TOTALE FATTURA ${calc.totaleFatturaCents / 100} €`,
  );
  console.log(`   imponibile=${calc.split.imponibileCents / 100}  IVA=${calc.split.ivaCents / 100}`);

  // ─── 4. RINASCI 5/2026 con dati corretti ─────────────────────────────────
  console.log('\n▶ Step 1/2: aggiorno 5/2026 da "annullata" a TD01 bozza corretta…');
  await dbExecute(
    `UPDATE invoices
        SET tipo_documento = 'TD01',
            stato = 'bozza',
            booking_id = ?,
            customer_id = ?,
            data_documento = ?,
            data_pagamento = ?,
            imponibile_cents = ?,
            iva_cents = ?,
            totale_cents = ?,
            aliquota_iva = ?,
            booking_total_cents = ?,
            city_tax_cents = ?,
            airbnb_commission_cents = ?,
            modalita_pagamento = ?,
            parent_invoice_id = NULL,
            external_id = NULL,
            sdi_identificativo = NULL,
            xml_url = NULL,
            xml_filename = NULL,
            pdf_url = NULL,
            ricevuta_consegna_url = NULL,
            inviata_at = NULL,
            consegnata_at = NULL,
            last_polled_at = NULL,
            poll_attempts = 0,
            marking_acube = NULL,
            idempotency_key = NULL,
            notes = 'Fattura 5/2026 corretta (totale al lordo commissioni Airbnb). Riemissione concordata con commercialista — sostituisce la 6/2026 errata che sarà stornata via TD04 7/2026.',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
    [
      inv6.booking_id,
      inv6.customer_id,
      inv6.data_documento,
      inv6.data_pagamento,
      calc.split.imponibileCents,
      calc.split.ivaCents,
      calc.split.totaleCents,
      Number(inv6.aliquota_iva ?? 10),
      calc.totaleOspiteCents,
      calc.cityTaxCents,
      calc.airbnbCommissionCents,
      inv6.modalita_pagamento ?? 'MP08',
      inv5.id,
    ],
  );
  // Cancella eventuali righe vecchie + inserisci la nuova
  await dbExecute(`DELETE FROM invoice_items WHERE invoice_id = ?`, [inv5.id]);
  await dbExecute(
    `INSERT INTO invoice_items (
       invoice_id, riga_numero, descrizione, quantita,
       prezzo_unitario_cents, aliquota_iva,
       imponibile_cents, iva_cents, totale_cents
     ) VALUES (?, 1, ?, 1, ?, ?, ?, ?, ?)`,
    [
      inv5.id,
      `Affitto soggiorno dal ${booking.check_in} al ${booking.check_out}`,
      calc.split.imponibileCents,
      Number(inv6.aliquota_iva ?? 10),
      calc.split.imponibileCents,
      calc.split.ivaCents,
      calc.split.totaleCents,
    ],
  );
  console.log(`   ✅ 5/2026 (id=${inv5.id}) ora è bozza TD01 totale ${calc.totaleFatturaCents / 100} €`);

  // ─── 5. Crea TD04 (sarà 7/2026 quando inviata) ───────────────────────────
  console.log('\n▶ Step 2/2: creo bozza TD04 storno di 6/2026 (numero auto al primo invio)…');
  // Verifica che non ci sia già una TD04 per parent=6
  const existingTD04 = (await dbQueryOne(
    `SELECT id FROM invoices WHERE tipo_documento = 'TD04' AND parent_invoice_id = ? AND stato IN ('bozza','in_invio') LIMIT 1`,
    [inv6.id],
  )) as any;
  let td04Id: number;
  if (existingTD04) {
    td04Id = Number(existingTD04.id);
    console.log(`   ✓ TD04 di storno per 6/2026 già esistente: id=${td04Id}`);
  } else {
    const insertTD04 = await dbExecute(
      `INSERT INTO invoices (
         tipo_documento, sezionale, data_documento,
         booking_id, customer_id, parent_invoice_id,
         imponibile_cents, iva_cents, totale_cents, aliquota_iva,
         booking_total_cents, city_tax_cents, airbnb_commission_cents,
         modalita_pagamento, data_pagamento, stato, notes
       ) VALUES (
         'TD04', 'AIR', ?,
         ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?,
         'MP08', ?, 'bozza',
         'Nota di credito di storno totale per fattura 6/2026 emessa con totale errato (250,50 € invece di 300 €). Riemissione corretta come 5/2026. Numerazione progressiva concordata con commercialista.'
       )`,
      [
        inv6.data_documento,
        inv6.booking_id,
        inv6.customer_id,
        inv6.id,
        inv6.imponibile_cents,
        inv6.iva_cents,
        inv6.totale_cents,
        Number(inv6.aliquota_iva ?? 10),
        inv6.booking_total_cents,
        inv6.city_tax_cents,
        inv6.airbnb_commission_cents,
        inv6.data_pagamento,
      ],
    );
    td04Id = Number((insertTD04 as any).lastInsertRowid ?? 0);
    // Copia righe della 6/2026 con prefisso "Storno: "
    const rows = await dbQuery(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY riga_numero`,
      [inv6.id],
    );
    for (const r of rows) {
      const it: any = r;
      await dbExecute(
        `INSERT INTO invoice_items (
           invoice_id, riga_numero, descrizione, quantita,
           prezzo_unitario_cents, aliquota_iva, natura_iva,
           imponibile_cents, iva_cents, totale_cents
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          td04Id,
          it.riga_numero,
          `Storno: ${it.descrizione}`,
          it.quantita,
          it.prezzo_unitario_cents,
          it.aliquota_iva,
          it.natura_iva,
          it.imponibile_cents,
          it.iva_cents,
          it.totale_cents,
        ],
      );
    }
    console.log(`   ✅ TD04 creata id=${td04Id} totale=${inv6.totale_cents / 100} € (storno della 6/2026)`);
  }

  // ─── 6. Riepilogo ────────────────────────────────────────────────────────
  console.log('\n📋 Riepilogo finale (da fare in UI):');
  console.log(`   1° invio → /admin/fatturazione/${inv5.id}  (5/2026 TD01 corretta, totale ${calc.totaleFatturaCents / 100} €)`);
  console.log(`   2° invio → /admin/fatturazione/${td04Id}  (TD04 storno della 6, prenderà numero 7/2026)`);
  console.log(`\nLa 6/2026 (id=${inv6.id}) resta intatta come fattura sbagliata già al SDI.`);
}

main().catch((e) => {
  console.error('❌', e.message ?? e);
  process.exit(1);
});
