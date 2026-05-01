/**
 * Costruttore del payload JSON FatturaPA per A-Cube API.
 *
 * Formato snake_case (trasposizione del tracciato AdE 1.2.2 — vedi:
 * https://docs.acubeapi.com/documentation/italy/gov-it/invoices/composing-invoice).
 *
 * A-Cube auto-compila dentro `dati_trasmissione`:
 *   - id_trasmittente
 *   - progressivo_invio
 *   - formato_trasmissione
 *
 * Quindi noi forniamo SOLO `codice_destinatario` (e opzionalmente `pec_destinatario`).
 *
 * Numerazione: usa il placeholder `getNumero(<sequence_name>)` invece del numero
 * letterale; A-Cube sostituisce con il prossimo numero della sequenza.
 */

import { centsToEuros } from './calculator';
import type {
  Customer,
  Invoice,
  InvoiceItem,
  InvoiceSettings,
  TipoDocumento,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format numerico FatturaPA (sempre 2 decimali, punto, no separatore migliaia)
// ─────────────────────────────────────────────────────────────────────────────

function fmtAmount(cents: number): string {
  return centsToEuros(cents).toFixed(2);
}

function fmtQuantita(q: number): string {
  // FatturaPA accetta fino a 8 decimali; tipicamente 2 sono sufficienti
  return q.toFixed(2);
}

function fmtAliquota(percent: number): string {
  return percent.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanificazione testo per FatturaPA
// ─────────────────────────────────────────────────────────────────────────────
//
// FatturaPA (e quindi ACube) accetta SOLO caratteri di:
//   - Basic Latin       U+0020 .. U+007E
//   - Latin-1 Supplement U+00A0 .. U+00FF (con eccezioni di controllo)
//
// I caratteri tipografici "smart" che vengono spesso copiati dal browser/Word
// (em-dash —, en-dash –, virgolette ricurve "" '' « » ‹ ›, bullet •, …)
// devono essere sostituiti o rimossi.

const TYPO_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[‐-―]/g, '-'],   // hyphen / en-dash / em-dash → -
  [/[‘’‚‛]/g, "'"], // virgolette singole curve → '
  [/[“”„‟]/g, '"'], // virgolette doppie curve → "
  [/[«»]/g, '"'],    // « » → "
  [/[‹›]/g, "'"],    // ‹ › → '
  [/[•·]/g, '*'],    // bullet • · → *
  [/[…]/g, '...'],         // ellipsis … → ...
  [/[ ]/g, ' '],           // NBSP → spazio
  [/[‰]/g, '%%'],          // ‰ → %%
  [/[€]/g, 'EUR'],         // € resta valido in Latin-1? in realtà 0x20AC NON è Latin-1
];

/**
 * Sanifica un testo per renderlo compatibile con il tracciato FatturaPA.
 * - Sostituisce caratteri tipografici comuni con equivalenti ASCII
 * - Rimuove qualsiasi carattere fuori dal range Basic Latin + Latin-1
 * - Compatta gli spazi multipli
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input);
  for (const [re, sub] of TYPO_REPLACEMENTS) s = s.replace(re, sub);
  // Rimuovi tutto ciò che NON è Basic Latin (0x20-0x7E) o Latin-1 stampabile (0xA0-0xFF, escluse soft-hyphen 0xAD)
  s = s.replace(/[^ -~¡-¬®-ÿ]/g, '');
  // Spazi multipli → singolo
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────────────

interface CedentePayload {
  dati_anagrafici: {
    id_fiscale_iva: { id_paese: string; id_codice: string };
    codice_fiscale?: string;
    anagrafica: {
      denominazione?: string;
      nome?: string;
      cognome?: string;
    };
    regime_fiscale: string;
  };
  sede: SedePayload;
  // ⚠️ ACube usa il nome `iscrizione_r_e_a` (con underscore fra R-E-A)
  iscrizione_r_e_a?: {
    ufficio: string;
    numero_rea: string;
    capitale_sociale?: string;
    socio_unico?: 'SU' | 'SM';
    stato_liquidazione: 'LS' | 'LN'; // obbligatorio quando si valorizza iscrizione REA
  };
  contatti?: { email?: string; telefono?: string };
}

interface SedePayload {
  indirizzo: string;
  numero_civico?: string;
  cap: string;
  comune: string;
  provincia?: string;
  nazione: string;
}

function buildCedente(s: InvoiceSettings): CedentePayload {
  const sede: SedePayload = {
    indirizzo: sanitizeText(s.indirizzo),
    cap: s.cap,
    comune: sanitizeText(s.comune),
    provincia: s.provincia,
    nazione: s.nazione,
  };

  const cedente: CedentePayload = {
    dati_anagrafici: {
      id_fiscale_iva: { id_paese: s.nazione, id_codice: s.partitaIva },
      codice_fiscale: s.codiceFiscale,
      anagrafica: { denominazione: sanitizeText(s.ragioneSociale) },
      regime_fiscale: s.regimeFiscale,
    },
    sede,
  };

  if (s.rea) {
    // Es. REA "PO-480791": ufficio=PO, numero=480791
    const m = /^([A-Za-z]{2})[\s-]?(\d+)$/.exec(s.rea.trim());
    if (m) {
      cedente.iscrizione_r_e_a = {
        ufficio: m[1].toUpperCase(),
        numero_rea: m[2],
        // 'LN' = società non in liquidazione (default ragionevole per SRL operativa).
        // Per società in liquidazione l'admin dovrà sovrascriverlo.
        stato_liquidazione: 'LN',
        ...(s.capitaleSocialeCents
          ? { capitale_sociale: fmtAmount(s.capitaleSocialeCents) }
          : {}),
      };
    }
  }

  if (s.pecEmittente) {
    cedente.contatti = { email: s.pecEmittente };
  }

  return cedente;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cessionario / Committente (cliente)
// ─────────────────────────────────────────────────────────────────────────────

interface CessionarioPayload {
  dati_anagrafici: {
    id_fiscale_iva?: { id_paese: string; id_codice: string };
    codice_fiscale?: string;
    anagrafica: {
      denominazione?: string;
      nome?: string;
      cognome?: string;
    };
  };
  sede: SedePayload;
}

function buildCessionario(c: Customer): CessionarioPayload {
  const sede: SedePayload = {
    indirizzo: sanitizeText(c.indirizzo ?? c.comune ?? 'N/D'),
    cap: c.cap ?? '00000',
    comune: sanitizeText(c.comune ?? 'N/D'),
    provincia: c.provincia ?? (c.isEstero ? 'EE' : ''),
    nazione: c.nazione ?? 'IT',
  };

  // Anagrafica (Denominazione XOR Nome+Cognome)
  const anagrafica: { denominazione?: string; nome?: string; cognome?: string } = {};
  if (c.tipo === 'PG' && c.ragioneSociale) {
    anagrafica.denominazione = sanitizeText(c.ragioneSociale);
  } else {
    if (c.cognome) anagrafica.cognome = sanitizeText(c.cognome);
    if (c.nome) anagrafica.nome = sanitizeText(c.nome);
  }

  // Regole di compilazione (FatturaPA 1.2.2 — CessionarioCommittente):
  //
  // Lo schema richiede ESATTAMENTE UNO tra IdFiscaleIVA o CodiceFiscale:
  //   - Cliente con P.IVA (IT o estera) → IdFiscaleIVA(id_paese, id_codice)
  //   - Privato italiano con CF        → CodiceFiscale (16 char)
  //   - Privato ESTERO senza P.IVA     → IdFiscaleIVA(id_paese=Nazione estera,
  //                                       id_codice='99999999999' placeholder).
  //     NON usare CodiceFiscale='0000000' (causa scarto AdE 00301:
  //     "CodiceFiscale formalmente non valido"). La convenzione consolidata
  //     è id_codice di soli "9" (11 caratteri) — accettata da AdE.
  //   - Italiano senza CF noto         → fallback CodiceFiscale='0000000' (resta
  //     un caso anomalo: il customer-mapper dovrebbe già aver bloccato il flusso).
  let idFiscaleIva: { id_paese: string; id_codice: string } | undefined;
  let codiceFiscale: string | undefined;
  if (c.partitaIva) {
    idFiscaleIva = {
      id_paese: c.nazione,
      id_codice: c.partitaIva.replace(/^IT/i, ''),
    };
  } else if (c.isEstero) {
    idFiscaleIva = {
      id_paese: (c.nazione && c.nazione !== 'IT' ? c.nazione : 'XX').toUpperCase(),
      id_codice:
        c.codiceFiscale && c.codiceFiscale.replace(/[^A-Za-z0-9]/g, '').length >= 2
          ? c.codiceFiscale.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
          : '99999999999',
    };
  } else if (c.codiceFiscale) {
    codiceFiscale = c.codiceFiscale;
  } else {
    // Italiano senza CF noto — fallback (la validazione customer-mapper avrà già protestato)
    codiceFiscale = '0000000';
  }

  // Ordine FatturaPA schema: IdFiscaleIVA → CodiceFiscale → Anagrafica.
  // Costruisco l'oggetto inserendo le chiavi nell'ordine richiesto (JS preserva
  // insertion order). NON pre-inizializzare anagrafica nel literal iniziale.
  const dati_anagrafici = {} as CessionarioPayload['dati_anagrafici'];
  if (idFiscaleIva) dati_anagrafici.id_fiscale_iva = idFiscaleIva;
  if (codiceFiscale) dati_anagrafici.codice_fiscale = codiceFiscale;
  dati_anagrafici.anagrafica = anagrafica;

  return { dati_anagrafici, sede };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dati generali documento
// ─────────────────────────────────────────────────────────────────────────────

interface DatiGeneraliDocumentoPayload {
  tipo_documento: TipoDocumento;
  divisa: string;
  data: string;
  numero: string;
  importo_totale_documento: string;
  causale?: string[];
}

function buildDatiGeneraliDocumento(
  inv: Invoice,
  numberingSequenceName: string,
): DatiGeneraliDocumentoPayload {
  return {
    tipo_documento: inv.tipoDocumento,
    divisa: 'EUR',
    data: inv.dataDocumento,
    // Se ho già un numero (riemissione manuale o nota credito), lo uso letterale.
    // Altrimenti delego ad ACube via placeholder.
    numero: inv.numeroCompleto ?? `getNumero(${numberingSequenceName})`,
    importo_totale_documento: fmtAmount(inv.totaleCents),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Righe + riepilogo
// ─────────────────────────────────────────────────────────────────────────────

interface DettaglioLineaPayload {
  numero_linea: number;
  descrizione: string;
  quantita: string;
  prezzo_unitario: string;
  prezzo_totale: string;
  aliquota_iva: string;
  natura?: string;
}

interface DatiRiepilogoPayload {
  aliquota_iva: string;
  imponibile_importo: string;
  imposta: string;
  esigibilita_iva: 'I' | 'D' | 'S';
  natura?: string;
}

function buildDettaglioLinee(items: InvoiceItem[]): DettaglioLineaPayload[] {
  return items.map((it) => {
    const linea: DettaglioLineaPayload = {
      numero_linea: it.rigaNumero,
      descrizione: sanitizeText(it.descrizione),
      quantita: fmtQuantita(it.quantita ?? 1),
      prezzo_unitario: fmtAmount(it.prezzoUnitarioCents),
      prezzo_totale: fmtAmount(it.imponibileCents),
      aliquota_iva: fmtAliquota(it.aliquotaIva),
    };
    if (it.naturaIva) linea.natura = it.naturaIva;
    return linea;
  });
}

function buildDatiRiepilogo(inv: Invoice): DatiRiepilogoPayload[] {
  // Per Fiumana: aliquota unica 10%. Quando in futuro avremo più aliquote,
  // andrà fatto un raggruppamento per aliquota delle righe.
  const riepilogo: DatiRiepilogoPayload = {
    aliquota_iva: fmtAliquota(inv.aliquotaIva),
    imponibile_importo: fmtAmount(inv.imponibileCents),
    imposta: fmtAmount(inv.ivaCents),
    esigibilita_iva: 'I',
  };
  if (inv.naturaIva) {
    riepilogo.natura = inv.naturaIva;
  }
  return [riepilogo];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dati pagamento
// ─────────────────────────────────────────────────────────────────────────────

interface DatiPagamentoPayload {
  condizioni_pagamento: string;
  dettaglio_pagamento: Array<{
    modalita_pagamento: string;
    data_scadenza_pagamento?: string;
    importo_pagamento: string;
    iban?: string;
  }>;
}

function buildDatiPagamento(
  inv: Invoice,
  settings: InvoiceSettings,
): DatiPagamentoPayload[] {
  return [
    {
      condizioni_pagamento: 'TP02', // pagamento completo
      dettaglio_pagamento: [
        {
          modalita_pagamento: inv.modalitaPagamento || 'MP08',
          ...(inv.dataPagamento ? { data_scadenza_pagamento: inv.dataPagamento } : {}),
          importo_pagamento: fmtAmount(inv.totaleCents),
          ...(settings.iban ? { iban: settings.iban } : {}),
        },
      ],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dati fatture collegate (per note di credito)
// ─────────────────────────────────────────────────────────────────────────────

interface DatiFattureCollegatePayload {
  riferimento_numero_linea?: number[];
  id_documento: string;
  data?: string;
}

function buildDatiFattureCollegate(parent: {
  numeroCompleto: string;
  dataDocumento: string;
}): DatiFattureCollegatePayload {
  return {
    id_documento: parent.numeroCompleto,
    data: parent.dataDocumento,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload top-level
// ─────────────────────────────────────────────────────────────────────────────

export interface AcubeInvoicePayload {
  fattura_elettronica_header: {
    dati_trasmissione: { codice_destinatario: string; pec_destinatario?: string };
    cedente_prestatore: CedentePayload;
    cessionario_committente: CessionarioPayload;
  };
  fattura_elettronica_body: Array<{
    dati_generali: {
      dati_generali_documento: DatiGeneraliDocumentoPayload;
      dati_fatture_collegate?: DatiFattureCollegatePayload[];
    };
    dati_beni_servizi: {
      dettaglio_linee: DettaglioLineaPayload[];
      dati_riepilogo: DatiRiepilogoPayload[];
    };
    dati_pagamento: DatiPagamentoPayload[];
  }>;
}

export interface BuildPayloadInput {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
  settings: InvoiceSettings;
  parent?: { numeroCompleto: string; dataDocumento: string }; // solo per TD04
}

/**
 * Costruisce il payload completo da inviare ad A-Cube via `POST /invoices`.
 *
 * Esempio (caso Yana Kachura):
 *   const payload = buildAcubePayload({ invoice, items, customer, settings });
 *   await fetch(endpoint + '/invoices', {
 *     method: 'POST',
 *     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   });
 */
export function buildAcubePayload(input: BuildPayloadInput): AcubeInvoicePayload {
  const { invoice, items, customer, settings, parent } = input;

  const sequenceName =
    invoice.tipoDocumento === 'TD04'
      ? settings.acubeCreditNoteSequenceName
      : settings.acubeNumberingSequenceName;

  const datiGenerali: AcubeInvoicePayload['fattura_elettronica_body'][0]['dati_generali'] = {
    dati_generali_documento: buildDatiGeneraliDocumento(invoice, sequenceName),
  };

  if (invoice.tipoDocumento === 'TD04' && parent) {
    datiGenerali.dati_fatture_collegate = [buildDatiFattureCollegate(parent)];
  }

  return {
    fattura_elettronica_header: {
      dati_trasmissione: {
        codice_destinatario: customer.codiceDestinatario,
        ...(customer.pec ? { pec_destinatario: customer.pec } : {}),
      },
      cedente_prestatore: buildCedente(settings),
      cessionario_committente: buildCessionario(customer),
    },
    fattura_elettronica_body: [
      {
        dati_generali: datiGenerali,
        dati_beni_servizi: {
          dettaglio_linee: buildDettaglioLinee(items),
          dati_riepilogo: buildDatiRiepilogo(invoice),
        },
        dati_pagamento: buildDatiPagamento(invoice, settings),
      },
    ],
  };
}
