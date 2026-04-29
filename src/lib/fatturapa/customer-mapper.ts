/**
 * Mapping da Guest (anagrafica Portale Alloggiati) a Customer (anagrafica fiscale FatturaPA).
 *
 * Punti chiave:
 * - `guests.stato_residenza` è un codice ISTAT (es. "100000100" = Italia, "100000243" = Ucraina).
 *   FatturaPA richiede invece un codice ISO 3166 alpha-2 (es. "IT", "UA"). Forniamo qui un
 *   mapping per i ~60 paesi più frequenti nel turismo italiano. Per gli altri, ritorniamo
 *   `null` e l'admin compila manualmente il campo nazione in fase di review.
 *
 * - Codice destinatario:
 *     · cliente italiano privato senza P.IVA   →  '0000000'
 *     · cliente italiano azienda con SDI       →  7 char SDI o PEC
 *     · cliente estero                         →  'XXXXXXX'
 *
 * - Provincia:
 *     · italiano  →  sigla 2 lettere (es. "FE")
 *     · estero    →  'EE' (convenzione FatturaPA)
 */

import type { CustomerInput } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Mapping codice ISTAT → ISO 3166 alpha-2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sottoinsieme dei paesi più comuni nel turismo italiano.
 * Codici ISTAT in `src/data/stati_alloggiati.json`, ISO 3166 da standard internazionale.
 *
 * NB: per "Spagna" ISO è ES — è un caso ambiguo, FatturaPA accetta ES.
 *     Il codice ISTAT "100000222" è Spagna, non confondere con la sigla `ES` che
 *     `stati_alloggiati.csv` usa nella colonna "Provincia" (significa "estero").
 */
export const ISTAT_TO_ISO: Record<string, string> = {
  // Europa UE
  '100000100': 'IT', // Italia
  '100000216': 'DE', // Germania
  '100000215': 'FR', // Francia
  '100000222': 'ES', // Spagna
  '100000201': 'AT', // Austria
  '100000203': 'BE', // Belgio
  '100000208': 'NL', // Paesi Bassi (Olanda)
  '100000223': 'PT', // Portogallo
  '100000219': 'IE', // Irlanda
  '100000218': 'LU', // Lussemburgo
  '100000206': 'DK', // Danimarca
  '100000220': 'SE', // Svezia
  '100000214': 'FI', // Finlandia
  '100000213': 'GR', // Grecia
  '100000226': 'PL', // Polonia
  '100000228': 'CZ', // Repubblica Ceca
  '100000242': 'SK', // Slovacchia
  '100000260': 'SI', // Slovenia
  '100000262': 'HR', // Croazia
  '100000209': 'HU', // Ungheria
  '100000207': 'RO', // Romania
  '100000204': 'BG', // Bulgaria
  '100000254': 'EE', // Estonia (NB: ISO 'EE' coincide con la convenzione "estero")
  '100000256': 'LT', // Lituania
  '100000255': 'LV', // Lettonia
  '100000211': 'MT', // Malta
  '100000264': 'CY', // Cipro

  // Europa non UE
  '100000221': 'CH', // Svizzera
  '100000244': 'NO', // Norvegia
  '100000217': 'IS', // Islanda
  '100000219x': 'GB', // Regno Unito (fallback nominale, vedi sotto)
  '100000219y': 'GB',
  '100000241': 'TR', // Turchia
  '100000243': 'UA', // Ucraina
  '100000231': 'RU', // Federazione Russa
  '100000234': 'BY', // Bielorussia
  '100000232': 'RS', // Serbia
  '100000252': 'ME', // Montenegro
  '100000235': 'BA', // Bosnia ed Erzegovina
  '100000253': 'MK', // Macedonia del Nord
  '100000236': 'AL', // Albania
  '100000237': 'XK', // Kosovo
  '100000245': 'MD', // Moldova

  // Americhe
  '100000536': 'US', // Stati Uniti
  '100000537': 'CA', // Canada
  '100000538': 'MX', // Messico
  '100000532': 'BR', // Brasile
  '100000528': 'AR', // Argentina
  '100000533': 'CL', // Cile
  '100000529': 'PE', // Peru
  '100000531': 'CO', // Colombia
  '100000523': 'VE', // Venezuela
  '100000534': 'UY', // Uruguay

  // Asia/Oceania
  '100000314': 'CN', // Cina
  '100000316': 'JP', // Giappone
  '100000315': 'KR', // Corea del Sud
  '100000307': 'IL', // Israele
  '100000302': 'SA', // Arabia Saudita
  '100000324': 'AE', // Emirati Arabi
  '100000305': 'IN', // India
  '100000345': 'TH', // Thailandia
  '100000308': 'ID', // Indonesia
  '100000338': 'PH', // Filippine
  '100000341': 'VN', // Vietnam
  '100000349': 'SG', // Singapore
  '100000343': 'MY', // Malesia
  '100000601': 'AU', // Australia
  '100000602': 'NZ', // Nuova Zelanda

  // Africa
  '100000401': 'DZ', // Algeria
  '100000408': 'EG', // Egitto
  '100000414': 'MA', // Marocco
  '100000418': 'TN', // Tunisia
  '100000425': 'ZA', // Sudafrica
  '100000409': 'ET', // Etiopia
  '100000419': 'KE', // Kenya
  '100000423': 'NG', // Nigeria

  // Apolide (caso speciale)
  '100000999': 'XX', // sigla non standard, da gestire manualmente
};

/**
 * Converte un codice ISTAT AdE (es. "100000243") in ISO 3166 alpha-2 (es. "UA").
 * Ritorna `null` se il paese non è mappato (richiede input manuale).
 */
export function nazioneIstatToIso(istatCode?: string | null): string | null {
  if (!istatCode) return null;
  return ISTAT_TO_ISO[istatCode] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Codice destinatario SDI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina il `CodiceDestinatario` da inserire nel header FatturaPA.
 *
 * Regole AdE:
 *   - cliente estero (qualunque tipo)               →  'XXXXXXX' (sette X)
 *   - cliente italiano privato senza canale         →  '0000000' (sette zeri)
 *   - cliente italiano con codice SDI a 7 char      →  il codice fornito
 *   - cliente italiano con sola PEC                 →  '0000000' + valorizzare PEC altrove
 *   - PA                                            →  6 char (non gestito qui — non è il caso d'uso Fiumana)
 */
export function codiceDestinatarioFor(opts: {
  isEstero: boolean;
  codiceSdiFornito?: string | null;
}): string {
  if (opts.isEstero) return 'XXXXXXX';
  const sdi = (opts.codiceSdiFornito ?? '').trim();
  if (sdi.length === 7) return sdi.toUpperCase();
  return '0000000';
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest → CustomerInput
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forma "minima" del Guest che ci serve per costruire un Customer.
 * Combaciante con la tabella `guests` (vedi src/lib/db.ts).
 */
export interface GuestForCustomer {
  id: number;
  cognome: string;
  nome: string;
  stato_residenza?: string | null; // codice ISTAT
  comune_residenza?: string | null; // descrizione/nome
  provincia_residenza?: string | null;
  indirizzo_residenza?: string | null;
  numero_documento?: string | null; // usato come fallback per CF estero
  // codice fiscale italiano: i guest non lo memorizzano direttamente, va richiesto
  // manualmente in UI fattura quando l'ospite è italiano. Lasciamo `undefined` qui.
}

/**
 * Costruisce un `CustomerInput` a partire da un `Guest` + email del booking.
 * L'admin dovrà comunque verificare/integrare i dati prima di emettere fattura
 * (in particolare il CF italiano per i clienti residenti in Italia).
 */
export function guestToCustomerInput(
  guest: GuestForCustomer,
  bookingEmail?: string | null,
): CustomerInput {
  const iso = nazioneIstatToIso(guest.stato_residenza);
  const isEstero = iso !== null && iso !== 'IT';

  const provincia = isEstero
    ? 'EE'
    : (guest.provincia_residenza ?? '').trim().toUpperCase().slice(0, 2) || 'EE';

  return {
    tipo: 'PF',
    cognome: guest.cognome,
    nome: guest.nome,
    nazione: iso ?? 'EE', // fallback estero generico se non riconosciuto
    indirizzo: guest.indirizzo_residenza ?? guest.comune_residenza ?? undefined,
    cap: isEstero ? '00000' : undefined,
    comune: guest.comune_residenza ?? undefined,
    provincia,
    email: bookingEmail ?? undefined,
    codiceDestinatario: codiceDestinatarioFor({ isEstero }),
    sourceGuestId: guest.id,
    // codiceFiscale: lasciato undefined; per privati italiani va inserito a mano,
    //                per esteri non si compila (FatturaPA accetta IdPaese estero senza CF).
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validazione minima Customer per emissione
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifica che un Customer abbia i campi minimi richiesti per emettere fattura.
 * Restituisce errori bloccanti (la fattura NON può essere inviata) e warning.
 */
export function validateCustomerForInvoice(c: CustomerInput): CustomerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (c.tipo === 'PF') {
    if (!c.cognome?.trim()) errors.push('Cognome obbligatorio per persona fisica');
    if (!c.nome?.trim()) errors.push('Nome obbligatorio per persona fisica');
  } else if (c.tipo === 'PG') {
    if (!c.ragioneSociale?.trim()) errors.push('Ragione sociale obbligatoria per azienda');
  }

  if (!c.nazione?.trim()) errors.push('Nazione obbligatoria');

  const isEstero = c.nazione !== 'IT';

  if (!isEstero) {
    if (!c.codiceFiscale?.trim() && !c.partitaIva?.trim()) {
      errors.push('Per cliente italiano serve almeno il codice fiscale (o P.IVA per azienda)');
    }
    if (!c.provincia?.trim()) warnings.push('Provincia non specificata per cliente italiano');
    if (!c.cap?.trim()) warnings.push('CAP non specificato per cliente italiano');
  } else {
    if (!c.indirizzo?.trim()) warnings.push('Indirizzo estero mancante (verrà usato il comune)');
    if (c.codiceDestinatario !== 'XXXXXXX') {
      warnings.push("Cliente estero: codice destinatario dovrebbe essere 'XXXXXXX'");
    }
  }

  if (!c.codiceDestinatario || c.codiceDestinatario.length !== 7) {
    errors.push("Codice destinatario deve essere esattamente 7 caratteri");
  }

  return { ok: errors.length === 0, errors, warnings };
}
