/**
 * Parser del testo copiato dalla scheda prenotazione Airbnb (nuova interfaccia
 * host "Oggi"). Airbnb ha tolto l'export CSV delle prenotazioni: l'admin apre
 * la prenotazione su Airbnb, seleziona tutto il testo della scheda, lo incolla
 * nel gestionale e questo modulo estrae i campi utili.
 *
 * Il testo è "sporco" (righe di UI, pulsanti, note vuote), quindi ogni campo
 * viene cercato in modo tollerante e, se manca, viene lasciato vuoto e
 * segnalato in `warnings` — l'admin corregge a mano prima di salvare.
 *
 * Funziona sia lato client (anteprima live) che lato server (nessuna dipendenza).
 */

export interface ParsedReservation {
  booking_id: string;          // codice di conferma Airbnb, es. HMZ5W5R8WH
  guest_name: string;          // nome completo del prenotante (da "Chi parteciperà")
  first_name: string;          // nome breve (da "Gruppo di Giacomo ...")
  check_in: string;            // YYYY-MM-DD
  check_out: string;           // YYYY-MM-DD
  nights: number | null;
  num_guests: number;
  num_adults: number | null;
  num_children: number | null;
  num_infants: number | null;
  total_amount: number | null; // payout host (es. "354,90 € Totale per 4 notti")
  booking_date: string;        // YYYY-MM-DD (data in cui è stata fatta la prenotazione)
  checkin_time: string;        // "15:00"
  checkout_time: string;       // "10:00"
  access_code: string;         // "Codice d'accesso suggerito"
  cancellation_policy: string; // "Moderati", "Flessibili", ...
  interests: string;           // "film"
  participants: string[];      // nomi in "Chi parteciperà"
  user_notes: string;          // contenuto di "Le tue note"
  notes: string;               // riepilogo pronto da salvare in bookings.notes
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  gen: 1, gennaio: 1, jan: 1, january: 1,
  feb: 2, febbraio: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  apr: 4, aprile: 4, april: 4,
  mag: 5, maggio: 5, may: 5,
  giu: 6, giugno: 6, jun: 6, june: 6,
  lug: 7, luglio: 7, jul: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, settembre: 9, sep: 9, sept: 9, september: 9,
  ott: 10, ottobre: 10, oct: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dic: 12, dicembre: 12, dec: 12, december: 12,
};

function monthNum(s: string): number | null {
  const k = s.toLowerCase().replace(/\./g, '');
  return MONTHS[k] ?? null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** "mer 16 set" / "16 set" / "sabato 5 settembre 2026" / "16 set 2026" → {d, m, y?} */
function parseDayMonth(s: string): { d: number; m: number; y: number | null } | null {
  const m = s.match(/(\d{1,2})\s+([a-zà-ú]{3,10})\.?(?:\s+(\d{4}))?/i);
  if (!m) return null;
  const mm = monthNum(m[2]);
  if (!mm) return null;
  return { d: parseInt(m[1], 10), m: mm, y: m[3] ? parseInt(m[3], 10) : null };
}

function parseAmount(s: string): number | null {
  // "354,90 €" | "€ 1.234,56" | "1,234.56 €"
  const m = s.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)\s*€|€\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return null;
  let cleaned = raw.replace(/\s/g, '');
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Riga successiva non vuota (e non "*") dopo l'indice i */
function nextValue(lines: string[], i: number, skip = 0): string {
  let n = 0;
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (!l || l === '*') continue;
    if (n === skip) return l;
    n++;
  }
  return '';
}

export function parseAirbnbReservation(raw: string): ParsedReservation {
  const warnings: string[] = [];
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/ /g, ' ').trim());
  const text = lines.join('\n');
  const lower = lines.map((l) => l.toLowerCase());

  const findIdx = (...labels: string[]): number =>
    lower.findIndex((l) => labels.some((lab) => l === lab || l.startsWith(lab)));

  // ---- Codice di conferma ---------------------------------------------
  let booking_id = '';
  const ci = findIdx('confirmation code', 'codice di conferma', 'codice conferma');
  if (ci >= 0) {
    const v = nextValue(lines, ci).toUpperCase();
    if (/^[A-Z0-9]{8,12}$/.test(v)) booking_id = v;
  }
  if (!booking_id) {
    const m = text.match(/\b(HM[A-Z0-9]{8})\b/);
    if (m) booking_id = m[1];
  }
  if (!booking_id) warnings.push('Codice di conferma non trovato');

  // ---- Data prenotazione (serve per l'anno) ----------------------------
  let booking_date = '';
  const bi = findIdx('booking date', 'data di prenotazione', 'data prenotazione', 'prenotato il', 'prenotato');
  if (bi >= 0) {
    const p = parseDayMonth(nextValue(lines, bi));
    if (p) booking_date = iso(p.y ?? new Date().getFullYear(), p.m, p.d);
  }
  const refYear = booking_date ? parseInt(booking_date.slice(0, 4), 10) : new Date().getFullYear();
  const refMonth = booking_date ? parseInt(booking_date.slice(5, 7), 10) : new Date().getMonth() + 1;

  // Se il mese del soggiorno è precedente a quello di prenotazione, è l'anno dopo.
  const resolveYear = (m: number, explicit: number | null): number => {
    if (explicit) return explicit;
    return m < refMonth ? refYear + 1 : refYear;
  };

  // ---- Check-in / Check-out --------------------------------------------
  let check_in = '';
  let check_out = '';
  let checkin_time = '';
  let checkout_time = '';

  const cin = findIdx('check-in', 'check in', 'arrivo');
  if (cin >= 0) {
    const p = parseDayMonth(nextValue(lines, cin));
    if (p) check_in = iso(resolveYear(p.m, p.y), p.m, p.d);
    const t = nextValue(lines, cin, 1).match(/^(\d{1,2}:\d{2})/);
    if (t) checkin_time = t[1];
  }
  const cout = findIdx('check-out', 'check out', 'partenza');
  if (cout >= 0) {
    const p = parseDayMonth(nextValue(lines, cout));
    if (p) check_out = iso(resolveYear(p.m, p.y), p.m, p.d);
    const t = nextValue(lines, cout, 1).match(/^(\d{1,2}:\d{2})/);
    if (t) checkout_time = t[1];
  }

  // ---- Notti (dall'intestazione "16–20 set · 4 notti" o "Totale per 4 notti")
  let nights: number | null = null;
  const nm = text.match(/(\d+)\s+nott[ei]/i);
  if (nm) nights = parseInt(nm[1], 10);

  // Fallback date dall'intestazione "16–20 set" / "28 set – 2 ott"
  if (!check_in || !check_out) {
    const hm = text.match(/(\d{1,2})(?:\s+([a-zà-ú]{3,10}))?\s*[–\-]\s*(\d{1,2})\s+([a-zà-ú]{3,10})/i);
    if (hm) {
      const m2 = monthNum(hm[4]);
      const m1 = hm[2] ? monthNum(hm[2]) : m2;
      if (m1 && m2) {
        if (!check_in) check_in = iso(resolveYear(m1, null), m1, parseInt(hm[1], 10));
        if (!check_out) check_out = iso(resolveYear(m2, null), m2, parseInt(hm[3], 10));
      }
    }
  }
  if (check_in && !check_out && nights) check_out = addDays(check_in, nights);
  if (!check_in) warnings.push('Data di check-in non trovata');
  if (!check_out) warnings.push('Data di check-out non trovata');
  if (check_in && check_out && check_out <= check_in) {
    // es. check-in a dicembre e check-out a gennaio con anno sbagliato
    check_out = iso(parseInt(check_out.slice(0, 4), 10) + 1, parseInt(check_out.slice(5, 7), 10), parseInt(check_out.slice(8, 10), 10));
    if (check_out <= check_in) warnings.push('Check-out non successivo al check-in: verifica le date');
  }
  if (check_in && check_out && nights == null) {
    const a = new Date(check_in + 'T00:00:00Z').getTime();
    const b = new Date(check_out + 'T00:00:00Z').getTime();
    nights = Math.round((b - a) / 86400000);
  }

  // ---- Ospiti -----------------------------------------------------------
  let first_name = '';
  let num_guests = 0;
  const gm = text.match(/Gruppo di\s+(.+?)\s+composto da\s+(\d+)\s+person[ae]/i)
    || text.match(/Il gruppo di\s+(.+?),\s+composto da\s+(\d+)\s+ospit[ei]/i);
  if (gm) {
    first_name = gm[1].trim();
    num_guests = parseInt(gm[2], 10);
  } else {
    const sm = text.match(/(?:Prenotazione|Soggiorno) di\s+([A-Za-zÀ-ú' ]+)/);
    if (sm) first_name = sm[1].trim();
    const om = text.match(/(\d+)\s+ospit[ei]/i);
    if (om) num_guests = parseInt(om[1], 10);
  }

  const countOf = (re: RegExp): number | null => {
    const m = text.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  const num_adults = countOf(/(\d+)\s+adult[oi]/i);
  const num_children = countOf(/(\d+)\s+bambin[oi]/i);
  const num_infants = countOf(/(\d+)\s+neonat[oi]/i);
  if (!num_guests) {
    const sum = (num_adults ?? 0) + (num_children ?? 0) + (num_infants ?? 0);
    num_guests = sum || 1;
    if (!sum) warnings.push('Numero ospiti non trovato: impostato a 1');
  }

  // ---- Chi parteciperà --------------------------------------------------
  const participants: string[] = [];
  let interests = '';
  const pi = findIdx('chi parteciperà', 'chi partecipera', 'who\'s coming', 'ospiti');
  if (pi >= 0) {
    for (let j = pi + 1; j < lines.length; j++) {
      const l = lines[j];
      const ll = l.toLowerCase();
      if (!l || l === '*') continue;
      if (/^termini di cancellazione|^cancellation policy|^gestisci|^booking date|^data di prenotazione|€/.test(ll)) break;
      const im = l.match(/^Interessi\s*:\s*(.+)$/i);
      if (im) { interests = im[1].trim(); continue; }
      if (/^\+\d+$/.test(l)) continue;                        // "+1"
      if (/^\d+\s+(adult|bambin|neonat|person|ospit)/i.test(l)) continue;
      const name = l.replace(/^[*\-•]\s*/, '').trim();
      if (name && /^[A-Za-zÀ-ú' .\-]+$/.test(name)) participants.push(name);
    }
  }

  let guest_name = participants[0] || first_name;
  if (participants[0] && first_name && !participants[0].toLowerCase().startsWith(first_name.toLowerCase())) {
    // Il primo partecipante non è il prenotante: preferisci chi corrisponde al nome breve
    const match = participants.find((p) => p.toLowerCase().startsWith(first_name.toLowerCase()));
    if (match) guest_name = match;
  }
  if (!guest_name) warnings.push('Nome ospite non trovato');

  // ---- Importo ----------------------------------------------------------
  let total_amount: number | null = null;
  const ti = lower.findIndex((l) => /^totale(\s+per\s+\d+\s+nott[ei])?$/.test(l) || /^total(\s+for)?/.test(l));
  if (ti > 0) {
    // l'importo è la riga PRIMA di "Totale per N notti"
    for (let j = ti - 1; j >= Math.max(0, ti - 3); j--) {
      const a = parseAmount(lines[j]);
      if (a != null) { total_amount = a; break; }
    }
  }
  if (total_amount == null) {
    // fallback: prima riga con € nel testo
    for (const l of lines) {
      const a = parseAmount(l);
      if (a != null) { total_amount = a; break; }
    }
  }
  if (total_amount == null) warnings.push('Importo totale non trovato');

  // ---- Altri campi ------------------------------------------------------
  let access_code = '';
  const ai = findIdx("codice d'accesso", 'codice di accesso', 'codice d’accesso', 'suggested access code');
  if (ai >= 0) {
    const v = nextValue(lines, ai);
    if (/^[A-Za-z0-9#*]{3,12}$/.test(v)) access_code = v;
  }

  let cancellation_policy = '';
  const ki = findIdx('termini di cancellazione', 'cancellation policy', 'politica di cancellazione');
  if (ki >= 0) cancellation_policy = nextValue(lines, ki);

  let user_notes = '';
  const ni = findIdx('le tue note', 'your notes', 'note');
  if (ni >= 0) {
    const buf: string[] = [];
    for (let j = ni + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^chi parteciper|^who's coming|^ospiti$/i.test(l)) break;
      if (l && l !== '*') buf.push(l.replace(/^[*\-•]\s*/, ''));
    }
    user_notes = buf.join('\n').trim();
  }

  // ---- Riepilogo note pronto per bookings.notes -------------------------
  const notesParts: string[] = [];
  if (checkin_time || checkout_time) notesParts.push(`Orari: check-in ${checkin_time || '?'} · check-out ${checkout_time || '?'}`);
  if (access_code) notesParts.push(`Codice accesso suggerito: ${access_code}`);
  const comp = [
    num_adults != null ? `${num_adults} adult${num_adults === 1 ? 'o' : 'i'}` : '',
    num_children != null ? `${num_children} bambin${num_children === 1 ? 'o' : 'i'}` : '',
    num_infants != null ? `${num_infants} neonat${num_infants === 1 ? 'o' : 'i'}` : '',
  ].filter(Boolean).join(', ');
  if (comp) notesParts.push(`Composizione: ${comp}`);
  if (participants.length) notesParts.push(`Partecipanti: ${participants.join(', ')}`);
  if (interests) notesParts.push(`Interessi: ${interests}`);
  if (cancellation_policy) notesParts.push(`Termini di cancellazione: ${cancellation_policy}`);
  if (booking_date) notesParts.push(`Prenotato il: ${booking_date}`);
  if (user_notes) notesParts.push(`Note Airbnb: ${user_notes}`);
  notesParts.push('Inserita manualmente da testo Airbnb');

  return {
    booking_id,
    guest_name,
    first_name,
    check_in,
    check_out,
    nights,
    num_guests,
    num_adults,
    num_children,
    num_infants,
    total_amount,
    booking_date,
    checkin_time,
    checkout_time,
    access_code,
    cancellation_policy,
    interests,
    participants,
    user_notes,
    notes: notesParts.join('\n'),
    warnings,
  };
}
