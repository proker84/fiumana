/**
 * State machine della fattura.
 *
 * Stati locali Fiumana ↔ marking ACube ↔ esiti notifiche SDI.
 * Gestisce sia transizioni triggerate dall'utente (UI) sia quelle triggerate dai webhook ACube.
 */

import type {
  AcubeMarking,
  InvoiceStato,
  SdiNotificationOutcome,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Mapping marking ACube → stato locale
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina lo stato locale a partire dal marking ACube e dall'eventuale esito di notifica SDI.
 *
 * Esempi:
 *   markingToStato('waiting')                           → 'accettata_acube'
 *   markingToStato('quarantena')                        → 'quarantena'
 *   markingToStato('sent')                              → 'inviata_sdi'  (in attesa esito)
 *   markingToStato('sent', 'RC')                        → 'consegnata'
 *   markingToStato('sent', 'MC')                        → 'mancata_consegna'
 *   markingToStato('sent', 'NS')                        → 'scartata'
 *   markingToStato('sent', 'DT')                        → 'consegnata'
 *   markingToStato('invoice-error')                     → 'errore_invio'
 */
export function markingToStato(
  marking: AcubeMarking,
  outcome?: SdiNotificationOutcome | null,
): InvoiceStato {
  switch (marking) {
    case 'waiting':
      return 'accettata_acube';
    case 'quarantena':
      return 'quarantena';
    case 'invoice-error':
      return 'errore_invio';
    case 'sent':
      switch (outcome) {
        case 'RC':
        case 'DT':
          return 'consegnata';
        case 'MC':
          return 'mancata_consegna';
        case 'NS':
          return 'scartata';
        case 'NE':
        case 'EC':
        case 'AT':
        case undefined:
        case null:
          // Non ancora definitivo, manteniamo "inviata_sdi"
          return 'inviata_sdi';
        default:
          return 'inviata_sdi';
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Eventi della state machine (azioni applicative + eventi webhook)
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceEvent =
  | { kind: 'EDIT' }
  | { kind: 'DELETE' }
  | { kind: 'SEND_START' } // POST /api/invoices/[id]/send chiamato
  | { kind: 'SEND_ACCEPTED'; externalId: string } // ACube ha risposto 202
  | { kind: 'SEND_FAILED'; reason: string } // ACube 4xx/5xx prima dell'accettazione
  | { kind: 'WEBHOOK_MARKING'; marking: AcubeMarking }
  | { kind: 'WEBHOOK_NOTIFICATION'; outcome: SdiNotificationOutcome }
  | { kind: 'CREDIT_NOTE_CREATED' }
  | { kind: 'REISSUE' };

// ─────────────────────────────────────────────────────────────────────────────
// Tabella delle transizioni valide
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcola lo stato successivo a partire dallo stato corrente e da un evento.
 * Restituisce `null` se la transizione non è valida (l'utente vede errore in UI).
 */
export function nextStato(
  current: InvoiceStato,
  event: InvoiceEvent,
): InvoiceStato | null {
  switch (current) {
    case 'bozza':
      switch (event.kind) {
        case 'EDIT':
          return 'bozza';
        case 'DELETE':
          return 'annullata';
        case 'SEND_START':
          return 'in_invio';
        default:
          return null;
      }

    case 'in_invio':
      switch (event.kind) {
        case 'SEND_ACCEPTED':
          return 'accettata_acube';
        case 'SEND_FAILED':
          return 'bozza';
        default:
          return null;
      }

    case 'accettata_acube':
      switch (event.kind) {
        case 'WEBHOOK_MARKING':
          return markingToStato(event.marking);
        default:
          return null;
      }

    case 'quarantena':
      switch (event.kind) {
        case 'WEBHOOK_MARKING':
          return markingToStato(event.marking);
        default:
          return null;
      }

    case 'inviata_sdi':
      switch (event.kind) {
        case 'WEBHOOK_NOTIFICATION':
          return markingToStato('sent', event.outcome);
        case 'WEBHOOK_MARKING':
          return markingToStato(event.marking);
        default:
          return null;
      }

    case 'consegnata':
    case 'mancata_consegna':
      switch (event.kind) {
        case 'CREDIT_NOTE_CREATED':
          return current; // resta nello stesso stato; la nota di credito è una nuova invoice
        case 'WEBHOOK_NOTIFICATION':
          // Notifiche tardive (es. EC committente dopo RC): aggiorniamo solo il log
          return current;
        default:
          return null;
      }

    case 'scartata':
      switch (event.kind) {
        case 'REISSUE':
          // L'utente clona la fattura come nuova bozza per riemetterla
          return 'bozza';
        default:
          return null;
      }

    case 'errore_invio':
      switch (event.kind) {
        case 'REISSUE':
          return 'bozza';
        default:
          return null;
      }

    case 'annullata':
      return null; // stato terminale
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: stato editabile / inviabile / annullabile
// ─────────────────────────────────────────────────────────────────────────────

export function isEditable(stato: InvoiceStato): boolean {
  return stato === 'bozza';
}

export function isSendable(stato: InvoiceStato): boolean {
  return stato === 'bozza';
}

export function isDeletable(stato: InvoiceStato): boolean {
  return stato === 'bozza';
}

export function isFinal(stato: InvoiceStato): boolean {
  return (
    stato === 'consegnata' ||
    stato === 'mancata_consegna' ||
    stato === 'scartata' ||
    stato === 'errore_invio' ||
    stato === 'annullata'
  );
}

export function canCreateCreditNote(stato: InvoiceStato): boolean {
  return stato === 'consegnata' || stato === 'mancata_consegna';
}

export function canReissue(stato: InvoiceStato): boolean {
  return stato === 'scartata' || stato === 'errore_invio';
}

// ─────────────────────────────────────────────────────────────────────────────
// Etichette user-facing in italiano (per UI/badge)
// ─────────────────────────────────────────────────────────────────────────────

export const STATO_LABELS: Record<InvoiceStato, string> = {
  bozza: 'Bozza',
  in_invio: 'Invio in corso…',
  accettata_acube: 'In attesa SDI',
  quarantena: 'Quarantena (retry)',
  inviata_sdi: 'Inviata al SDI',
  consegnata: 'Consegnata',
  mancata_consegna: 'Mancata consegna',
  scartata: 'Scartata',
  errore_invio: 'Errore invio',
  annullata: 'Annullata',
};

export const STATO_COLORS: Record<InvoiceStato, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  bozza: 'gray',
  in_invio: 'blue',
  accettata_acube: 'blue',
  quarantena: 'amber',
  inviata_sdi: 'blue',
  consegnata: 'green',
  mancata_consegna: 'green',
  scartata: 'red',
  errore_invio: 'red',
  annullata: 'gray',
};
