/**
 * Helpers per rendering dei template messaggi clienti.
 * Sostituisce placeholder `{{varName}}` con valori reali.
 */

export type TemplateVars = Record<string, string | number | null | undefined>;

/**
 * Sostituisce {{var}} con il valore corrispondente.
 * Variabili non trovate restano come stringa vuota (non `{{var}}` letterale,
 * per evitare di mandare al cliente un messaggio rotto).
 */
export function renderTemplate(body: string, vars: TemplateVars): string {
  if (!body) return '';
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    if (v === null || v === undefined) return '';
    return String(v);
  });
}

/**
 * Formatta una data ISO (YYYY-MM-DD) in italiano: "21 Maggio".
 */
export function formatDateItalian(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
}

/**
 * Estrae il primo nome da "Nome Cognome" o restituisce stringa vuota.
 */
export function firstNameFromGuest(guestName: string | null | undefined): string {
  if (!guestName) return '';
  return guestName.trim().split(/\s+/)[0] ?? '';
}

/**
 * Costruisce il set di variabili comune a tutti i template basati su una
 * booking. Ogni template usa solo quelle che gli servono.
 */
export interface BookingForTemplate {
  guest_name?: string | null;
  guest_email?: string | null;
  guest_token?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  num_guests?: number | null;
}

export function buildBookingVars(
  booking: BookingForTemplate,
  origin: string,
): TemplateVars {
  return {
    firstName: firstNameFromGuest(booking.guest_name),
    guestName: booking.guest_name ?? '',
    guestEmail: booking.guest_email ?? '',
    guestLink: booking.guest_token ? `${origin}/guest/${booking.guest_token}` : '',
    checkIn: booking.check_in ?? '',
    checkOut: booking.check_out ?? '',
    checkInDate: formatDateItalian(booking.check_in),
    checkOutDate: formatDateItalian(booking.check_out),
    numGuests: booking.num_guests ?? '',
  };
}

/** Lista delle variabili disponibili — usata dalla UI per mostrare l'help. */
export const AVAILABLE_VARS = [
  { key: 'firstName', desc: 'Primo nome dell\'ospite (es. "Riccardo")' },
  { key: 'guestName', desc: 'Nome completo (es. "Riccardo Lolatto")' },
  { key: 'guestEmail', desc: 'Email/contatto ospite' },
  { key: 'guestLink', desc: 'URL del form ospiti (alloggiati)' },
  { key: 'checkIn', desc: 'Data check-in raw (2026-05-21)' },
  { key: 'checkOut', desc: 'Data check-out raw (2026-05-25)' },
  { key: 'checkInDate', desc: 'Data check-in italiana ("21 Maggio")' },
  { key: 'checkOutDate', desc: 'Data check-out italiana ("25 Maggio")' },
  { key: 'numGuests', desc: 'Numero ospiti' },
];
