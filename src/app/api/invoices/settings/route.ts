/**
 * GET  /api/invoices/settings  → legge le impostazioni emittente (campi sensibili mascherati)
 * PATCH /api/invoices/settings → aggiorna le impostazioni; se viene passata una nuova
 *                                `senderApiKey` o `webhookSecret` viene cifrata e salvata.
 *
 * La riga è singleton (id=1). Se non esiste, viene creata con i dati di default Fiumana.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQueryOne } from '@/lib/db';
import { encrypt, maskSecret } from '@/lib/fatturapa/crypto';

// Defaults Fiumana (riempiti automaticamente al primo accesso)
const FIUMANA_DEFAULTS = {
  ragione_sociale: 'Immobiliare Fiumana S.r.l.',
  partita_iva: '01340960481',
  codice_fiscale: '01340960481',
  regime_fiscale: 'RF01',
  indirizzo: 'Via del Seminario, 79',
  cap: '59100',
  comune: 'Prato',
  provincia: 'PO',
  nazione: 'IT',
  rea: 'PO-480791',
  pec_emittente: '',
  sender_provider: 'openapi',
  sender_endpoint: 'https://test.sdi.openapi.it',
  sender_test_mode: 1,
  acube_numbering_sequence_name: 'FiumanaAIR',
  acube_credit_note_sequence_name: 'FiumanaAIRNC',
  conservazione_provider: 'openapi',
  tassa_soggiorno_default_cents: 50,
} as const;

/**
 * Crea la riga di default se non esiste e restituisce la riga corrente.
 */
async function ensureSettingsRow() {
  const existing = await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
  if (existing) return existing;

  await dbExecute(
    `INSERT INTO invoice_settings (
       id, ragione_sociale, partita_iva, codice_fiscale, regime_fiscale,
       indirizzo, cap, comune, provincia, nazione, rea, pec_emittente,
       sender_provider, sender_endpoint, sender_test_mode,
       acube_numbering_sequence_name, acube_credit_note_sequence_name,
       conservazione_provider, tassa_soggiorno_default_cents
     ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      FIUMANA_DEFAULTS.ragione_sociale,
      FIUMANA_DEFAULTS.partita_iva,
      FIUMANA_DEFAULTS.codice_fiscale,
      FIUMANA_DEFAULTS.regime_fiscale,
      FIUMANA_DEFAULTS.indirizzo,
      FIUMANA_DEFAULTS.cap,
      FIUMANA_DEFAULTS.comune,
      FIUMANA_DEFAULTS.provincia,
      FIUMANA_DEFAULTS.nazione,
      FIUMANA_DEFAULTS.rea,
      FIUMANA_DEFAULTS.pec_emittente,
      FIUMANA_DEFAULTS.sender_provider,
      FIUMANA_DEFAULTS.sender_endpoint,
      FIUMANA_DEFAULTS.sender_test_mode,
      FIUMANA_DEFAULTS.acube_numbering_sequence_name,
      FIUMANA_DEFAULTS.acube_credit_note_sequence_name,
      FIUMANA_DEFAULTS.conservazione_provider,
      FIUMANA_DEFAULTS.tassa_soggiorno_default_cents,
    ],
  );
  return await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
}

/**
 * Sanifica una riga DB per la risposta API: i campi sensibili sono mascherati,
 * non decifrati. La UI mostra solo "configurato/non configurato" + ultimi 4 char.
 */
function publicView(row: any) {
  if (!row) return null;
  const apiKeyEnc = row.sender_api_key_encrypted as string | null;
  const webhookSec = row.webhook_secret as string | null;
  return {
    id: 1,
    ragioneSociale: row.ragione_sociale,
    partitaIva: row.partita_iva,
    codiceFiscale: row.codice_fiscale,
    regimeFiscale: row.regime_fiscale,
    indirizzo: row.indirizzo,
    cap: row.cap,
    comune: row.comune,
    provincia: row.provincia,
    nazione: row.nazione,
    iban: row.iban,
    rea: row.rea,
    capitaleSocialeCents: row.capitale_sociale_cents,
    pecEmittente: row.pec_emittente,
    senderProvider: row.sender_provider,
    senderEndpoint: row.sender_endpoint,
    senderTestMode: !!row.sender_test_mode,
    senderApiKeyConfigured: !!apiKeyEnc,
    webhookSecretConfigured: !!webhookSec,
    webhookSecretMasked: webhookSec ? maskSecret(webhookSec) : null, // mostriamo solo il maschera
    acubeBusinessRegistryUuid: row.acube_business_registry_uuid,
    acubeNumberingSequenceUuid: row.acube_numbering_sequence_uuid,
    acubeNumberingSequenceName: row.acube_numbering_sequence_name,
    acubeCreditNoteSequenceUuid: row.acube_credit_note_sequence_uuid,
    acubeCreditNoteSequenceName: row.acube_credit_note_sequence_name,
    conservazioneProvider: row.conservazione_provider,
    tassaSoggiornoDefaultCents: row.tassa_soggiorno_default_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — legge le impostazioni
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const row = await ensureSettingsRow();
    return NextResponse.json({ settings: publicView(row) });
  } catch (e: any) {
    console.error('GET /api/invoices/settings error:', e);
    return NextResponse.json(
      { error: 'Errore server: ' + (e.message ?? String(e)) },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — aggiorna le impostazioni
// ─────────────────────────────────────────────────────────────────────────────
//
// Body JSON (tutti i campi opzionali, solo quelli passati vengono aggiornati):
//
// {
//   "ragioneSociale": "...",
//   "partitaIva": "...",
//   "codiceFiscale": "...",
//   "regimeFiscale": "RF01",
//   "indirizzo": "...", "cap": "...", "comune": "...", "provincia": "...", "nazione": "IT",
//   "iban": "...", "rea": "...", "capitaleSocialeCents": 1000000,
//   "pecEmittente": "...",
//   "senderProvider": "acube" | "mock",
//   "senderEndpoint": "...",
//   "senderTestMode": true | false,
//   "senderApiKey": "...",            // sarà cifrato e salvato in sender_api_key_encrypted
//   "senderApiKeyClear": true,        // se true, azzera la chiave
//   "webhookSecret": "...",           // sarà salvato in chiaro (è già un secret rigenerato)
//   "acubeBusinessRegistryUuid": "...",
//   "acubeNumberingSequenceUuid": "...",
//   "acubeNumberingSequenceName": "...",
//   "acubeCreditNoteSequenceUuid": "...",
//   "acubeCreditNoteSequenceName": "...",
//   "conservazioneProvider": "acube",
//   "tassaSoggiornoDefaultCents": 200
// }
//
export async function PATCH(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    await ensureSettingsRow();
    const body = await req.json();

    // Mappatura camelCase API → snake_case DB
    const fieldMap: Record<string, string> = {
      ragioneSociale: 'ragione_sociale',
      partitaIva: 'partita_iva',
      codiceFiscale: 'codice_fiscale',
      regimeFiscale: 'regime_fiscale',
      indirizzo: 'indirizzo',
      cap: 'cap',
      comune: 'comune',
      provincia: 'provincia',
      nazione: 'nazione',
      iban: 'iban',
      rea: 'rea',
      capitaleSocialeCents: 'capitale_sociale_cents',
      pecEmittente: 'pec_emittente',
      senderProvider: 'sender_provider',
      senderEndpoint: 'sender_endpoint',
      senderTestMode: 'sender_test_mode',
      webhookSecret: 'webhook_secret',
      acubeBusinessRegistryUuid: 'acube_business_registry_uuid',
      acubeNumberingSequenceUuid: 'acube_numbering_sequence_uuid',
      acubeNumberingSequenceName: 'acube_numbering_sequence_name',
      acubeCreditNoteSequenceUuid: 'acube_credit_note_sequence_uuid',
      acubeCreditNoteSequenceName: 'acube_credit_note_sequence_name',
      conservazioneProvider: 'conservazione_provider',
      tassaSoggiornoDefaultCents: 'tassa_soggiorno_default_cents',
    };

    const sets: string[] = [];
    const args: any[] = [];

    for (const [apiKey, dbCol] of Object.entries(fieldMap)) {
      if (apiKey in body && body[apiKey] !== undefined) {
        sets.push(`${dbCol} = ?`);
        let v = body[apiKey];
        if (apiKey === 'senderTestMode') v = v ? 1 : 0;
        args.push(v);
      }
    }

    // Caso speciale: senderApiKey (in chiaro) → cifrare e salvare
    if (typeof body.senderApiKey === 'string' && body.senderApiKey.length > 0) {
      sets.push('sender_api_key_encrypted = ?');
      args.push(encrypt(body.senderApiKey));
    } else if (body.senderApiKeyClear === true) {
      sets.push('sender_api_key_encrypted = NULL');
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    args.push(1); // WHERE id = 1

    await dbExecute(
      `UPDATE invoice_settings SET ${sets.join(', ')} WHERE id = ?`,
      args,
    );

    const row = await dbQueryOne('SELECT * FROM invoice_settings WHERE id = 1');
    return NextResponse.json({ success: true, settings: publicView(row) });
  } catch (e: any) {
    console.error('PATCH /api/invoices/settings error:', e);
    return NextResponse.json(
      { error: 'Errore server: ' + (e.message ?? String(e)) },
      { status: 500 },
    );
  }
}
