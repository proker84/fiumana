/**
 * Calcoli economici del modulo fatturazione.
 *
 * Tutti gli importi sono memorizzati e processati in CENTESIMI (intero),
 * per evitare errori di arrotondamento da floating point.
 *
 * Formula chiave (Fiumana, IVA 10% strutture ricettive):
 *   totale_fattura  = booking.total_amount − city_tax           (lordo IVA)
 *   imponibile      = round(totale_fattura / 1.10, 2 decimali)
 *   iva             = totale_fattura − imponibile
 *
 * Le commissioni Airbnb NON si sottraggono: sono già incluse nel prezzo
 * pagato dall'ospite e quindi nel totale fatturato. Si scaricano lato costi
 * con la fattura passiva ricevuta da Airbnb (reverse charge UE).
 */

import type { InvoiceItem } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Conversioni euro <-> centesimi
// ─────────────────────────────────────────────────────────────────────────────

/** Converte un importo in euro (number) a centesimi interi. */
export function eurosToCents(eur: number): number {
  if (!Number.isFinite(eur)) return 0;
  // Math.round per evitare problemi di floating, *100 senza overflow per importi normali.
  return Math.round(eur * 100);
}

/** Converte centesimi interi a euro con 2 decimali (number). */
export function centsToEuros(cents: number): number {
  return Math.round(cents) / 100;
}

/** Formatta centesimi come stringa "309.09" (senza simbolo, punto decimale, due decimali). */
export function formatCentsString(cents: number): string {
  return centsToEuros(cents).toFixed(2);
}

/** Formatta centesimi come stringa human-readable italiana, es. "309,09 €". */
export function formatCentsHuman(cents: number): string {
  return centsToEuros(cents).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcolo IVA (split lordo → imponibile + IVA)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImponibileSplit {
  imponibileCents: number;
  ivaCents: number;
  totaleCents: number;
  aliquotaIva: number;
}

/**
 * Date un totale lordo IVA (centesimi) e un'aliquota, calcola imponibile e IVA.
 *
 * Esempio (Yana Kachura): splitTotaleLordoIVA(34000, 10)
 *   → { imponibileCents: 30909, ivaCents: 3091, totaleCents: 34000, aliquotaIva: 10 }
 *
 * L'arrotondamento è "banker's safe": l'imponibile è arrotondato a 2 decimali
 * e l'IVA è calcolata come differenza, garantendo che imp + iva = totale esatto.
 */
export function splitTotaleLordoIVA(
  totaleLordoCents: number,
  aliquotaIva: number,
): ImponibileSplit {
  if (totaleLordoCents < 0) throw new Error('totaleLordoCents non può essere negativo');
  if (aliquotaIva < 0 || aliquotaIva > 100) throw new Error('aliquotaIva deve essere 0-100');

  const factor = 1 + aliquotaIva / 100;
  const imponibileCents = Math.round(totaleLordoCents / factor);
  const ivaCents = totaleLordoCents - imponibileCents;
  return {
    imponibileCents,
    ivaCents,
    totaleCents: totaleLordoCents,
    aliquotaIva,
  };
}

/**
 * Inversa: dato un imponibile e un'aliquota, calcola lordo IVA + IVA.
 * Utile per fatture create da zero (manuali) dove l'utente inserisce imponibile.
 */
export function calcLordoFromImponibile(
  imponibileCents: number,
  aliquotaIva: number,
): ImponibileSplit {
  const ivaCents = Math.round((imponibileCents * aliquotaIva) / 100);
  const totaleCents = imponibileCents + ivaCents;
  return { imponibileCents, ivaCents, totaleCents, aliquotaIva };
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking → totale fatturabile (scomputo city tax)
// ─────────────────────────────────────────────────────────────────────────────

export interface BookingForInvoice {
  totalAmount: number; // euro (lordo, totale ospite)
  cityTaxAmount?: number | null; // euro
  airbnbCommission?: number | null; // euro (info, non scomputato)
}

export interface BookingCalculation {
  totaleOspiteCents: number; // 344,00 € → 34400
  cityTaxCents: number; // 4,00 € → 400
  airbnbCommissionCents: number; // 52,70 € → 5270 (info)
  totaleFatturaCents: number; // = totaleOspite − cityTax (340,00 € → 34000)
  split: ImponibileSplit; // imponibile + iva sul totaleFattura
}

/**
 * Da una prenotazione produce gli importi necessari per pre-compilare la bozza fattura.
 *
 * Esempio Yana Kachura:
 *   computeBookingInvoice({ totalAmount: 344, cityTaxAmount: 4, airbnbCommission: 52.70 }, 10)
 *   → totaleFatturaCents=34000, split={imponibile=30909, iva=3091}
 */
export function computeBookingInvoice(
  booking: BookingForInvoice,
  aliquotaIva = 10,
): BookingCalculation {
  const totaleOspiteCents = eurosToCents(booking.totalAmount);
  const cityTaxCents = eurosToCents(booking.cityTaxAmount ?? 0);
  const airbnbCommissionCents = eurosToCents(booking.airbnbCommission ?? 0);
  const totaleFatturaCents = Math.max(0, totaleOspiteCents - cityTaxCents);
  const split = splitTotaleLordoIVA(totaleFatturaCents, aliquotaIva);
  return {
    totaleOspiteCents,
    cityTaxCents,
    airbnbCommissionCents,
    totaleFatturaCents,
    split,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tassa di soggiorno default (stima quando city_tax_amount non è fornita)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcola la tassa di soggiorno stimata in base a: tariffa per notte/persona,
 * numero ospiti, notti, e un cap massimo (es. Ferrara: max 5 notti tassabili).
 *
 * @param ratePerNightPerPersonCents tariffa in centesimi (es. 200 = 2,00 €)
 * @param numGuests numero ospiti (default 1)
 * @param nights notti totali del soggiorno
 * @param maxTaxableNights notti massime tassabili (default 5; usa Infinity per nessun limite)
 */
export function estimateCityTax(
  ratePerNightPerPersonCents: number,
  numGuests: number,
  nights: number,
  maxTaxableNights = 5,
): number {
  const billableNights = Math.min(Math.max(nights, 0), maxTaxableNights);
  return Math.max(0, billableNights * Math.max(numGuests, 0) * ratePerNightPerPersonCents);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validazione coerenza importi (per UI e API)
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceTotalsCheck {
  ok: boolean;
  errors: string[];
}

/**
 * Verifica che la somma dei items quadri con i totali della fattura.
 * Tolleranza: 1 centesimo (per arrotondamenti su righe multiple).
 */
export function checkInvoiceTotals(
  items: Pick<InvoiceItem, 'imponibileCents' | 'ivaCents' | 'totaleCents'>[],
  expected: { imponibileCents: number; ivaCents: number; totaleCents: number },
  tolleranza = 1,
): InvoiceTotalsCheck {
  const sumImp = items.reduce((s, i) => s + i.imponibileCents, 0);
  const sumIva = items.reduce((s, i) => s + i.ivaCents, 0);
  const sumTot = items.reduce((s, i) => s + i.totaleCents, 0);
  const errors: string[] = [];

  if (Math.abs(sumImp - expected.imponibileCents) > tolleranza) {
    errors.push(
      `Imponibile non quadra: somma items ${sumImp} vs atteso ${expected.imponibileCents}`,
    );
  }
  if (Math.abs(sumIva - expected.ivaCents) > tolleranza) {
    errors.push(`IVA non quadra: somma items ${sumIva} vs atteso ${expected.ivaCents}`);
  }
  if (Math.abs(sumTot - expected.totaleCents) > tolleranza) {
    errors.push(`Totale non quadra: somma items ${sumTot} vs atteso ${expected.totaleCents}`);
  }

  return { ok: errors.length === 0, errors };
}
