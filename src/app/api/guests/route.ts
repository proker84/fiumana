import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';

// GET - Fetch booking info and existing guests by token (public endpoint)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 });
  }

  try {
    const booking = await dbQueryOne(
      'SELECT id, booking_id, guest_name, check_in, check_out, num_guests, status, correction_note FROM bookings WHERE guest_token = ?',
      [token]
    );

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    const guests = await dbQuery(
      'SELECT * FROM guests WHERE booking_id = ? ORDER BY id ASC',
      [booking.id]
    );

    return NextResponse.json({ booking, guests });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}

// POST - Save guest data (public endpoint, authenticated by token)
export async function POST(req: NextRequest) {
  try {
    const { token, guests } = await req.json();

    if (!token || !guests || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json(
        { error: 'Token e dati ospiti obbligatori' },
        { status: 400 }
      );
    }

    const booking = await dbQueryOne(
      'SELECT id, check_in, check_out FROM bookings WHERE guest_token = ?',
      [token]
    );

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    // Calculate days of stay
    const checkIn = new Date(booking.check_in as string);
    const checkOut = new Date(booking.check_out as string);
    const giorniPermanenza = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Delete existing guests for this booking (allow re-submission)
    await dbExecute('DELETE FROM guests WHERE booking_id = ?', [booking.id]);

    // Insert each guest
    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      // Codice fiscale: salviamo solo se ospite italiano (cittadinanza =
      // codice 100000100). Per stranieri il campo resta NULL.
      const cf = g.cittadinanza === '100000100'
        ? (typeof g.codice_fiscale === 'string'
            ? g.codice_fiscale.replace(/\s/g, '').toUpperCase()
            : null)
        : null;
      await dbExecute(
        `INSERT INTO guests (
          booking_id, progressivo, tipo_alloggiato, camere_occupate,
          cognome, nome, sesso, data_nascita,
          comune_nascita, comune_nascita_codice, provincia_nascita, stato_nascita, cittadinanza,
          stato_residenza, comune_residenza, comune_residenza_codice, provincia_residenza, indirizzo_residenza,
          tipo_documento, numero_documento, stato_rilascio, comune_rilascio, comune_rilascio_codice, luogo_rilascio,
          documento_fronte, documento_retro,
          data_arrivo, giorni_permanenza,
          codice_fiscale
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          booking.id,
          i + 1, // progressivo
          g.tipo_alloggiato || '16',
          g.camere_occupate || 1,
          g.cognome.trim(),
          g.nome.trim(),
          g.sesso,
          g.data_nascita,
          g.comune_nascita?.trim() || null,
          g.comune_nascita_codice || null,
          g.provincia_nascita?.trim() || null,
          g.stato_nascita,
          g.cittadinanza,
          g.stato_residenza || '100000100',
          g.comune_residenza?.trim() || null,
          g.comune_residenza_codice || null,
          g.provincia_residenza?.trim() || null,
          g.indirizzo_residenza?.trim() || null,
          g.tipo_documento,
          g.numero_documento.trim(),
          g.stato_rilascio || '100000100',
          g.comune_rilascio?.trim() || null,
          g.comune_rilascio_codice || null,
          g.luogo_rilascio?.trim() || null,
          g.documento_fronte || null,
          g.documento_retro || null,
          booking.check_in,
          giorniPermanenza,
          cf,
        ]
      );
    }

    // Update booking status and clear any correction note
    await dbExecute(
      "UPDATE bookings SET status = 'guests_registered', correction_note = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [booking.id]
    );

    return NextResponse.json({
      success: true,
      message: `${guests.length} ospiti registrati con successo`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
