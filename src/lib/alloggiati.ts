/**
 * Portale Alloggiati Integration
 *
 * Uses SOAP 1.1 Web Service at:
 * https://alloggiatiweb.poliziadistato.it/service/Service.asmx
 *
 * Authentication: WSKEY-based token system
 * Documentation: https://alloggiatiweb.poliziadistato.it/portalealloggiati/supmanuali.aspx
 */

import { Builder } from 'xml2js';

// Portale Alloggiati Constants
export const ALLOGGIATI_ENDPOINT = 'https://alloggiatiweb.poliziadistato.it/service/Service.asmx';
export const ALLOGGIATI_TEST_ENDPOINT = 'https://alloggiatiweb.poliziadistato.it/service/Service.asmx'; // Same endpoint, test mode via credentials

// Test mode flag - set via environment variable
export const ALLOGGIATI_TEST_MODE = process.env.ALLOGGIATI_TEST_MODE === 'true';

// Tipo Alloggiato codes
export const TIPO_ALLOGGIATO = {
  OSPITE_SINGOLO: '16',
  CAPOFAMIGLIA: '17',
  CAPOGRUPPO: '18',
  FAMILIARE: '19',
  MEMBRO_GRUPPO: '20',
} as const;

// Tipo Documento codes
export const TIPO_DOCUMENTO: Record<string, string> = {
  'CARTA_IDENTITA': 'IDENT',
  'PASSAPORTO': 'PASOR',
  'PATENTE': 'PATEN',
  'CARTA_IDENTITA_ESTERA': 'IDEST',
  'PASSAPORTO_ESTERO': 'PASEX',
};

// Tipo Documento labels for UI
export const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  'IDENT': "Carta d'Identità",
  'PASOR': 'Passaporto',
  'PATEN': 'Patente di Guida',
  'IDEST': "Carta d'Identità Estera",
  'PASEX': 'Passaporto Estero',
};

// Common nationalities
export const NAZIONALITA: Record<string, string> = {
  'ITALIA': '100000100',
  'GERMANIA': '100000203',
  'FRANCIA': '100000209',
  'SPAGNA': '100000219',
  'REGNO_UNITO': '100000215',
  'STATI_UNITI': '100000336',
  'SVIZZERA': '100000220',
  'AUSTRIA': '100000201',
  'OLANDA': '100000213',
  'BELGIO': '100000202',
  'PORTOGALLO': '100000214',
  'ROMANIA': '100000235',
  'POLONIA': '100000233',
  'BRASILE': '100000602',
  'CINA': '100000404',
  'GIAPPONE': '100000413',
  'AUSTRALIA': '100000501',
};

export interface GuestData {
  tipoAlloggiato: string;
  cognome: string;
  nome: string;
  sesso: string;
  dataNascita: string;
  comuneNascita?: string;
  provinciaNascita?: string;
  statoNascita: string;
  cittadinanza: string;
  tipoDocumento: string;
  numeroDocumento: string;
  luogoRilascio: string;
}

export interface AlloggiatiCredentials {
  username: string;
  password: string;
  wskey: string;
}

/**
 * Generates the fixed-length text format required by Portale Alloggiati
 * for batch file upload (alternative to SOAP submission)
 */
export function generateAlloggiatiTextRecord(
  guest: GuestData,
  dataArrivo: string,
  giorniPermanenza: number,
): string {
  const pad = (str: string, len: number) => str.padEnd(len).substring(0, len);
  const padNum = (num: number, len: number) => String(num).padStart(len, '0');

  // Format: Tipo|Arrivo|Permanenza|Cognome|Nome|Sesso|Nascita|Stato|Cittadinanza|DocTipo|DocNum|DocRilascio
  const arrivo = new Date(dataArrivo);
  const nascita = new Date(guest.dataNascita);

  const record = [
    guest.tipoAlloggiato.padStart(2, '0'),
    `${padNum(arrivo.getDate(), 2)}/${padNum(arrivo.getMonth() + 1, 2)}/${arrivo.getFullYear()}`,
    padNum(giorniPermanenza, 2),
    pad(guest.cognome.toUpperCase(), 50),
    pad(guest.nome.toUpperCase(), 30),
    guest.sesso === 'M' ? '1' : '2',
    `${padNum(nascita.getDate(), 2)}/${padNum(nascita.getMonth() + 1, 2)}/${nascita.getFullYear()}`,
    pad(guest.comuneNascita?.toUpperCase() || '', 9),
    pad(guest.provinciaNascita?.toUpperCase() || '', 2),
    pad(guest.statoNascita, 9),
    pad(guest.cittadinanza, 9),
    pad(guest.tipoDocumento, 5),
    pad(guest.numeroDocumento.toUpperCase(), 20),
    pad(guest.luogoRilascio.toUpperCase(), 9),
  ].join('');

  return record;
}

/**
 * Generate the SOAP XML envelope for Portale Alloggiati submission
 */
export function buildSoapEnvelope(
  credentials: AlloggiatiCredentials,
  data: string,
  date: Date = new Date(),
): string {
  const dateStr = date.toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <Ricevuta xmlns="AlloggiatiService">
      <Utente>${escapeXml(credentials.username)}</Utente>
      <Token>${escapeXml(credentials.wskey)}</Token>
      <ElencoSchedine>${escapeXml(data)}</ElencoSchedine>
      <Data>${dateStr}</Data>
    </Ricevuta>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Submit guest data to Portale Alloggiati via SOAP
 * In test mode (ALLOGGIATI_TEST_MODE=true), simulates submission without actually sending
 */
export async function submitToAlloggiati(
  credentials: AlloggiatiCredentials,
  guestRecords: string,
  date: Date = new Date(),
  testMode: boolean = ALLOGGIATI_TEST_MODE,
): Promise<{ success: boolean; receipt?: string; error?: string; testMode?: boolean }> {

  // TEST MODE - Simulate successful submission
  if (testMode) {
    console.log('[ALLOGGIATI TEST MODE] Simulating submission...');
    console.log('[ALLOGGIATI TEST MODE] Records:', guestRecords);

    // Simulate a delay like real API
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate fake receipt number
    const fakeReceipt = `TEST-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    return {
      success: true,
      receipt: fakeReceipt,
      testMode: true,
    };
  }

  // PRODUCTION MODE - Real submission
  try {
    const soapXml = buildSoapEnvelope(credentials, guestRecords, date);

    const response = await fetch(ALLOGGIATI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'AlloggiatiService/Ricevuta',
      },
      body: soapXml,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const responseText = await response.text();

    // Parse SOAP response - look for receipt PDF in base64
    if (responseText.includes('<RicevutaResult>')) {
      const match = responseText.match(/<RicevutaResult>([\s\S]*?)<\/RicevutaResult>/);
      if (match) {
        return {
          success: true,
          receipt: match[1], // Base64 encoded PDF receipt
        };
      }
    }

    // Check for SOAP fault
    if (responseText.includes('<soap:Fault>')) {
      const faultMatch = responseText.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
      return {
        success: false,
        error: faultMatch ? faultMatch[1] : 'Unknown SOAP Fault',
      };
    }

    return {
      success: true,
      receipt: responseText,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Connection error: ${error.message}`,
    };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validate guest data before submission
 */
export function validateGuestData(guest: GuestData): string[] {
  const errors: string[] = [];

  if (!guest.cognome || guest.cognome.trim().length < 2) errors.push('Cognome obbligatorio');
  if (!guest.nome || guest.nome.trim().length < 2) errors.push('Nome obbligatorio');
  if (!guest.sesso || !['M', 'F'].includes(guest.sesso)) errors.push('Sesso non valido');
  if (!guest.dataNascita) errors.push('Data di nascita obbligatoria');
  if (!guest.statoNascita) errors.push('Stato di nascita obbligatorio');
  if (!guest.cittadinanza) errors.push('Cittadinanza obbligatoria');
  if (!guest.tipoDocumento) errors.push('Tipo documento obbligatorio');
  if (!guest.numeroDocumento || guest.numeroDocumento.trim().length < 3) errors.push('Numero documento obbligatorio');
  if (!guest.luogoRilascio) errors.push('Luogo rilascio documento obbligatorio');

  // Validate date format
  if (guest.dataNascita) {
    const date = new Date(guest.dataNascita);
    if (isNaN(date.getTime())) errors.push('Data di nascita non valida');
    if (date > new Date()) errors.push('Data di nascita nel futuro');
  }

  // Italian guests must have comune and provincia
  if (guest.statoNascita === '100000100') {
    if (!guest.comuneNascita) errors.push('Comune di nascita obbligatorio per cittadini italiani');
    if (!guest.provinciaNascita) errors.push('Provincia di nascita obbligatoria per cittadini italiani');
  }

  return errors;
}
