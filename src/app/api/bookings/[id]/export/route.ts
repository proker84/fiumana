import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

interface Guest {
  id: number;
  progressivo: number;
  tipo_alloggiato: string;
  camere_occupate: number;
  cognome: string;
  nome: string;
  sesso: string;
  data_nascita: string;
  comune_nascita: string;
  comune_nascita_codice: string;
  provincia_nascita: string;
  stato_nascita: string;
  cittadinanza: string;
  stato_residenza: string;
  comune_residenza: string;
  comune_residenza_codice: string;
  provincia_residenza: string;
  indirizzo_residenza: string;
  tipo_documento: string;
  numero_documento: string;
  stato_rilascio: string;
  comune_rilascio: string;
  comune_rilascio_codice: string;
  luogo_rilascio: string;
  data_arrivo: string;
  giorni_permanenza: number;
}

interface Booking {
  id: number;
  booking_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
}

/**
 * GET /api/bookings/[id]/export
 * Export guest data in XML format for Portale Alloggiati and ROSS1000
 *
 * Query params:
 * - format: 'alloggiati' | 'ross1000' | 'txt'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get('format') || 'alloggiati';

  try {
    const bookingRow = await dbQueryOne(
      'SELECT * FROM bookings WHERE id = ?',
      [params.id]
    );
    const booking = bookingRow as unknown as Booking | null;

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    const guestsRows = await dbQuery(
      'SELECT * FROM guests WHERE booking_id = ? ORDER BY progressivo ASC',
      [params.id]
    );
    const guests = guestsRows as unknown as Guest[];

    if (guests.length === 0) {
      return NextResponse.json({ error: 'Nessun ospite registrato' }, { status: 400 });
    }

    let content: string;
    let filename: string;
    let contentType: string;

    switch (format) {
      case 'alloggiati':
        content = generateAlloggiatiXML(booking, guests);
        filename = `alloggiati_${booking.booking_id}_${formatDateFile(booking.check_in)}.xml`;
        contentType = 'application/xml';
        break;

      case 'txt':
        content = generateAlloggiatiTXT(booking, guests);
        filename = `alloggiati_${booking.booking_id}_${formatDateFile(booking.check_in)}.txt`;
        contentType = 'text/plain';
        break;

      case 'ross1000':
        content = generateRoss1000XML(booking, guests);
        filename = `ross1000_${booking.booking_id}_${formatDateFile(booking.check_in)}.xml`;
        contentType = 'application/xml';
        break;

      default:
        return NextResponse.json({ error: 'Formato non valido' }, { status: 400 });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Errore export: ' + error.message }, { status: 500 });
  }
}

function formatDateFile(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function formatDateIT(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateISO(dateStr: string): string {
  return dateStr; // Already in YYYY-MM-DD format
}

function pad(str: string | null | undefined, len: number): string {
  return (str || '').toUpperCase().padEnd(len).substring(0, len);
}

function padNum(num: number, len: number): string {
  return String(num).padStart(len, '0');
}

/**
 * Generate Portale Alloggiati XML format
 */
function generateAlloggiatiXML(booking: Booking, guests: Guest[]): string {
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const giorni = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<SchedineAlloggiati>
  <DataInvio>${formatDateIT(booking.check_in)}</DataInvio>
  <NumeroSchedine>${guests.length}</NumeroSchedine>
  <Schedine>`;

  guests.forEach((guest, index) => {
    xml += `
    <Schedina>
      <Progressivo>${index + 1}</Progressivo>
      <TipoAlloggiato>${guest.tipo_alloggiato || '16'}</TipoAlloggiato>
      <DataArrivo>${formatDateIT(guest.data_arrivo || booking.check_in)}</DataArrivo>
      <GiorniPermanenza>${guest.giorni_permanenza || giorni}</GiorniPermanenza>
      <CamereOccupate>${guest.camere_occupate || 1}</CamereOccupate>
      <Cognome>${escapeXml(guest.cognome.toUpperCase())}</Cognome>
      <Nome>${escapeXml(guest.nome.toUpperCase())}</Nome>
      <Sesso>${guest.sesso === 'M' ? '1' : '2'}</Sesso>
      <DataNascita>${formatDateIT(guest.data_nascita)}</DataNascita>
      <ComuneNascita>${guest.comune_nascita_codice || ''}</ComuneNascita>
      <ProvinciaNascita>${guest.provincia_nascita || ''}</ProvinciaNascita>
      <StatoNascita>${guest.stato_nascita}</StatoNascita>
      <Cittadinanza>${guest.cittadinanza}</Cittadinanza>
      <StatoResidenza>${guest.stato_residenza || guest.cittadinanza}</StatoResidenza>
      <ComuneResidenza>${guest.comune_residenza_codice || ''}</ComuneResidenza>
      <ProvinciaResidenza>${guest.provincia_residenza || ''}</ProvinciaResidenza>
      <IndirizzoResidenza>${escapeXml(guest.indirizzo_residenza || '')}</IndirizzoResidenza>
      <TipoDocumento>${guest.tipo_documento}</TipoDocumento>
      <NumeroDocumento>${escapeXml(guest.numero_documento.toUpperCase())}</NumeroDocumento>
      <StatoRilascio>${guest.stato_rilascio || guest.cittadinanza}</StatoRilascio>
      <LuogoRilascio>${guest.comune_rilascio_codice || guest.luogo_rilascio || ''}</LuogoRilascio>
    </Schedina>`;
  });

  xml += `
  </Schedine>
</SchedineAlloggiati>`;

  return xml;
}

/**
 * Generate Portale Alloggiati TXT format (fixed-length fields)
 */
function generateAlloggiatiTXT(booking: Booking, guests: Guest[]): string {
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const giorni = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  const lines: string[] = [];

  guests.forEach((guest) => {
    const dataArrivo = guest.data_arrivo || booking.check_in;
    const arrivo = new Date(dataArrivo);
    const nascita = new Date(guest.data_nascita);

    // Determine if document fields should be included
    const needsDocument = ['16', '17', '18'].includes(guest.tipo_alloggiato);

    const record = [
      (guest.tipo_alloggiato || '16').padStart(2, '0'),                           // 2: Tipo alloggiato
      `${padNum(arrivo.getDate(), 2)}/${padNum(arrivo.getMonth() + 1, 2)}/${arrivo.getFullYear()}`, // 10: Data arrivo
      padNum(guest.giorni_permanenza || giorni, 2),                               // 2: Giorni permanenza
      pad(guest.cognome, 50),                                                      // 50: Cognome
      pad(guest.nome, 30),                                                         // 30: Nome
      guest.sesso === 'M' ? '1' : '2',                                            // 1: Sesso
      `${padNum(nascita.getDate(), 2)}/${padNum(nascita.getMonth() + 1, 2)}/${nascita.getFullYear()}`, // 10: Data nascita
      pad(guest.comune_nascita_codice || '', 9),                                   // 9: Comune nascita (codice ISTAT)
      pad(guest.provincia_nascita || '', 2),                                       // 2: Provincia nascita
      pad(guest.stato_nascita, 9),                                                 // 9: Stato nascita
      pad(guest.cittadinanza, 9),                                                  // 9: Cittadinanza
      needsDocument ? pad(guest.tipo_documento, 5) : '     ',                      // 5: Tipo documento
      needsDocument ? pad(guest.numero_documento, 20) : '                    ',    // 20: Numero documento
      needsDocument ? pad(guest.luogo_rilascio || guest.provincia_nascita || '', 9) : '         ', // 9: Luogo rilascio
      needsDocument ? pad(guest.comune_rilascio_codice || '', 9) : '         ',    // 9: Codice comune rilascio
    ].join('');

    lines.push(record);
  });

  return lines.join('\r\n');
}

/**
 * Generate ROSS1000 XML format for ISTAT statistics
 */
function generateRoss1000XML(booking: Booking, guests: Guest[]): string {
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const giorni = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Group guests by nationality for statistics
  const italiani = guests.filter(g => g.cittadinanza === '100000100');
  const stranieri = guests.filter(g => g.cittadinanza !== '100000100');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MovimentoTuristico xmlns="http://ross1000.regione.emilia-romagna.it/schema">
  <Testata>
    <DataRiferimento>${formatDateISO(booking.check_in)}</DataRiferimento>
    <TipoMovimento>A</TipoMovimento>
  </Testata>
  <Movimenti>`;

  guests.forEach((guest, index) => {
    xml += `
    <Movimento>
      <Progressivo>${index + 1}</Progressivo>
      <DataArrivo>${formatDateISO(guest.data_arrivo || booking.check_in)}</DataArrivo>
      <DataPartenza>${formatDateISO(booking.check_out)}</DataPartenza>
      <TipoAlloggiato>${getTipoAlloggiatoRoss(guest.tipo_alloggiato)}</TipoAlloggiato>
      <Cognome>${escapeXml(guest.cognome.toUpperCase())}</Cognome>
      <Nome>${escapeXml(guest.nome.toUpperCase())}</Nome>
      <Sesso>${guest.sesso}</Sesso>
      <DataNascita>${formatDateISO(guest.data_nascita)}</DataNascita>
      <LuogoNascita>
        <Stato>${guest.stato_nascita}</Stato>
        ${guest.stato_nascita === '100000100' ? `<Comune>${guest.comune_nascita_codice || ''}</Comune>
        <Provincia>${guest.provincia_nascita || ''}</Provincia>` : ''}
      </LuogoNascita>
      <Cittadinanza>${guest.cittadinanza}</Cittadinanza>
      <Residenza>
        <Stato>${guest.stato_residenza || guest.cittadinanza}</Stato>
        ${(guest.stato_residenza || guest.cittadinanza) === '100000100' ? `<Comune>${guest.comune_residenza_codice || ''}</Comune>
        <Provincia>${guest.provincia_residenza || ''}</Provincia>` : ''}
        <Indirizzo>${escapeXml(guest.indirizzo_residenza || '')}</Indirizzo>
      </Residenza>
      <Documento>
        <Tipo>${guest.tipo_documento}</Tipo>
        <Numero>${escapeXml(guest.numero_documento.toUpperCase())}</Numero>
        <StatoRilascio>${guest.stato_rilascio || guest.cittadinanza}</StatoRilascio>
        <LuogoRilascio>${guest.comune_rilascio_codice || guest.luogo_rilascio || ''}</LuogoRilascio>
      </Documento>
      <Permanenza>
        <Notti>${guest.giorni_permanenza || giorni}</Notti>
        <CamereOccupate>${guest.camere_occupate || 1}</CamereOccupate>
      </Permanenza>
    </Movimento>`;
  });

  xml += `
  </Movimenti>
  <Riepilogo>
    <TotaleArrivi>${guests.length}</TotaleArrivi>
    <TotalePresenze>${guests.length * giorni}</TotalePresenze>
    <ArriviItaliani>${italiani.length}</ArriviItaliani>
    <ArriviStranieri>${stranieri.length}</ArriviStranieri>
    <PresenzeItaliani>${italiani.length * giorni}</PresenzeItaliani>
    <PresenzeStranieri>${stranieri.length * giorni}</PresenzeStranieri>
  </Riepilogo>
</MovimentoTuristico>`;

  return xml;
}

function getTipoAlloggiatoRoss(tipo: string): string {
  const map: Record<string, string> = {
    '16': 'SINGOLO',
    '17': 'CAPOFAMIGLIA',
    '18': 'CAPOGRUPPO',
    '19': 'FAMILIARE',
    '20': 'MEMBRO_GRUPPO',
  };
  return map[tipo] || 'SINGOLO';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
