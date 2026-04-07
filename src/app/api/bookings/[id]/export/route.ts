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

function formatDateRoss(dateStr: string): string {
  // ROSS1000 requires YYYYMMDD format (no separators)
  return dateStr.replace(/-/g, '');
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
 * Generate ROSS1000 XML format for ISTAT statistics (Emilia-Romagna)
 * Formato conforme al tracciato GIES versione 3 del 18/03/2026
 */
function generateRoss1000XML(booking: Booking, guests: Guest[]): string {
  // Codice struttura CIR - TODO: rendere configurabile
  const codiceStruttura = '038006-CV-00255';
  const prodotto = 'ImmobiliareFiumana';

  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const giorni = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Find capogruppo (tipo 17 o 18) for idcapo reference
  const capogruppo = guests.find(g => g.tipo_alloggiato === '17' || g.tipo_alloggiato === '18');
  const idCapo = capogruppo ? `${booking.id}-${capogruppo.id}` : '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<movimenti>
  <codice>${codiceStruttura}</codice>
  <prodotto>${prodotto}</prodotto>`;

  // Generate a movimento for each day of the stay
  for (let day = 0; day <= giorni; day++) {
    const currentDate = new Date(checkIn);
    currentDate.setDate(checkIn.getDate() + day);
    const dateStr = formatDateRoss(currentDate.toISOString().split('T')[0]);

    const isArrivalDay = day === 0;
    const isDepartureDay = day === giorni;
    const isStayDay = day > 0 && day < giorni;

    // Camere occupate: 1 durante il soggiorno, 0 il giorno di partenza
    const camereOccupate = isDepartureDay ? 0 : 1;

    xml += `
  <movimento>
    <data>${dateStr}</data>
    <struttura>
      <apertura>SI</apertura>
      <camereoccupate>${camereOccupate}</camereoccupate>
      <cameredisponibili>1</cameredisponibili>
      <lettidisponibili>3</lettidisponibili>
    </struttura>`;

    // Arrivi solo il primo giorno
    if (isArrivalDay) {
      xml += `
    <arrivi>`;
      guests.forEach((guest) => {
        const guestId = `${booking.id}-${guest.id}`;
        const needsIdCapo = guest.tipo_alloggiato === '19' || guest.tipo_alloggiato === '20';
        const luogoResidenza = guest.stato_residenza === '100000100'
          ? (guest.comune_residenza_codice || '')
          : (guest.luogo_rilascio || guest.comune_residenza || '');

        xml += `
      <arrivo>
        <idswh>${guestId}</idswh>
        <tipoalloggiato>${guest.tipo_alloggiato || '16'}</tipoalloggiato>
        <idcapo>${needsIdCapo ? idCapo : ''}</idcapo>
        <sesso>${guest.sesso}</sesso>
        <cittadinanza>${guest.cittadinanza}</cittadinanza>
        <statoresidenza>${guest.stato_residenza || guest.cittadinanza}</statoresidenza>
        <luogoresidenza>${escapeXml(luogoResidenza)}</luogoresidenza>
        <datanascita>${formatDateRoss(guest.data_nascita)}</datanascita>
        <statonascita>${guest.stato_nascita}</statonascita>
        <comunenascita>${guest.stato_nascita === '100000100' ? (guest.comune_nascita_codice || '') : ''}</comunenascita>
        <tipoturismo>Balneare</tipoturismo>
        <mezzotrasporto>Auto</mezzotrasporto>
        <canaleprenotazione>Indiretta web</canaleprenotazione>
        <titolostudio></titolostudio>
        <professione></professione>
        <esenzioneimposta></esenzioneimposta>
      </arrivo>`;
      });
      xml += `
    </arrivi>`;
    }

    // Partenze solo l'ultimo giorno
    if (isDepartureDay) {
      xml += `
    <partenze>`;
      guests.forEach((guest) => {
        const guestId = `${booking.id}-${guest.id}`;
        xml += `
      <partenza>
        <idswh>${guestId}</idswh>
        <tipoalloggiato>${guest.tipo_alloggiato || '16'}</tipoalloggiato>
        <arrivo>${formatDateRoss(booking.check_in)}</arrivo>
      </partenza>`;
      });
      xml += `
    </partenze>`;
    }

    xml += `
  </movimento>`;
  }

  xml += `
</movimenti>`;

  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
