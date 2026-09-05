import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const isDashboard = req.nextUrl.searchParams.get('dashboard');

  try {
    if (isDashboard) {
      // Tutti i counter escludono le booking cancellate (cancelled = 1).
      // Le cancellate restano consultabili solo su /admin/prenotazioni filtro "Cancellate".
      const totalBookingsResult = await dbQueryOne(
        'SELECT COUNT(*) as count FROM bookings WHERE COALESCE(cancelled,0) = 0'
      );
      const totalBookings = Number(totalBookingsResult?.count || 0);

      const today = new Date().toISOString().split('T')[0];
      const todayCheckinsResult = await dbQueryOne(
        'SELECT COUNT(*) as count FROM bookings WHERE check_in = ? AND COALESCE(cancelled,0) = 0',
        [today]
      );
      const todayCheckins = Number(todayCheckinsResult?.count || 0);

      const pendingGuestsResult = await dbQueryOne(`
        SELECT COUNT(*) as count FROM bookings b
        WHERE b.id NOT IN (SELECT DISTINCT booking_id FROM guests)
          AND COALESCE(b.cancelled,0) = 0
      `);
      const pendingGuests = Number(pendingGuestsResult?.count || 0);

      const alloggiatiPendingResult = await dbQueryOne(
        'SELECT COUNT(*) as count FROM bookings WHERE alloggiati_sent = 0 AND COALESCE(cancelled,0) = 0'
      );
      const alloggiatiPending = Number(alloggiatiPendingResult?.count || 0);

      // Restituiamo TUTTE le prenotazioni ordinate per check-in crescente.
      // Il client poi separa la "prossima imminente" (in alto come card) dal
      // resto (tabella sotto). Niente più LIMIT — la dashboard deve mostrare
      // tutto l'elenco senza dover andare su /admin/prenotazioni.
      // Arricchimento stato fatturazione identico a GET /api/bookings normale.
      const recentBookings = await dbQuery(`
        SELECT
          b.*,
          (SELECT COUNT(*) FROM invoices i WHERE i.booking_id = b.id) as invoice_count,
          (SELECT i.stato FROM invoices i WHERE i.booking_id = b.id
             ORDER BY i.created_at DESC LIMIT 1) as invoice_stato_last,
          (SELECT i.id FROM invoices i WHERE i.booking_id = b.id
             ORDER BY i.created_at DESC LIMIT 1) as invoice_id_last,
          (SELECT i.numero_completo FROM invoices i WHERE i.booking_id = b.id
             ORDER BY i.created_at DESC LIMIT 1) as invoice_numero_last,
          (SELECT CASE
              WHEN MAX(CASE WHEN i.stato IN ('consegnata','mancata_consegna','inviata_sdi') THEN 1 ELSE 0 END) = 1
              THEN 1 ELSE 0 END
             FROM invoices i WHERE i.booking_id = b.id) as fatturazione_completata
        FROM bookings b
        ORDER BY b.check_in ASC
      `);

      return NextResponse.json({
        totalBookings,
        todayCheckins,
        pendingGuests,
        alloggiatiPending,
        recentBookings,
      });
    }

    // Arricchiamo ogni booking con:
    //   - guests_count: quanti ospiti hanno compilato il form
    //   - invoice_count: numero totale di fatture associate (di solito 0 o 1)
    //   - invoice_stato_last: stato della fattura più recente
    //   - invoice_id_last: id della fattura più recente (per link diretto)
    //   - invoice_numero_last: es. "5/2026" da mostrare in UI
    //   - fatturazione_completata: true se la fattura è stata trasmessa
    //     correttamente al SDI (consegnata / mancata_consegna / inviata_sdi)
    const bookings = await dbQuery(`
      SELECT
        b.*,
        (SELECT COUNT(*) FROM guests g WHERE g.booking_id = b.id) as guests_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.booking_id = b.id) as invoice_count,
        (SELECT i.stato FROM invoices i WHERE i.booking_id = b.id
           ORDER BY i.created_at DESC LIMIT 1) as invoice_stato_last,
        (SELECT i.id FROM invoices i WHERE i.booking_id = b.id
           ORDER BY i.created_at DESC LIMIT 1) as invoice_id_last,
        (SELECT i.numero_completo FROM invoices i WHERE i.booking_id = b.id
           ORDER BY i.created_at DESC LIMIT 1) as invoice_numero_last,
        (SELECT CASE
            WHEN MAX(CASE WHEN i.stato IN ('consegnata','mancata_consegna','inviata_sdi') THEN 1 ELSE 0 END) = 1
            THEN 1 ELSE 0 END
           FROM invoices i WHERE i.booking_id = b.id) as fatturazione_completata
      FROM bookings b
      ORDER BY b.check_in DESC
    `);

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validazione minima: codice, nome, date YYYY-MM-DD con check-out > check-in
    const bookingId = String(body.booking_id || '').trim().toUpperCase();
    const guestName = String(body.guest_name || '').trim();
    const checkIn = String(body.check_in || '').trim();
    const checkOut = String(body.check_out || '').trim();
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!bookingId) {
      return NextResponse.json({ error: 'Codice di conferma mancante' }, { status: 400 });
    }
    if (!guestName) {
      return NextResponse.json({ error: 'Nome ospite mancante' }, { status: 400 });
    }
    if (!dateRe.test(checkIn) || !dateRe.test(checkOut)) {
      return NextResponse.json({ error: 'Date non valide (atteso YYYY-MM-DD)' }, { status: 400 });
    }
    if (checkOut <= checkIn) {
      return NextResponse.json({ error: 'Il check-out deve essere successivo al check-in' }, { status: 400 });
    }
    const numGuests = Math.max(1, parseInt(String(body.num_guests ?? 1), 10) || 1);
    let totalAmount: number | null = null;
    if (body.total_amount !== undefined && body.total_amount !== null && body.total_amount !== '') {
      const n = Number(body.total_amount);
      totalAmount = Number.isFinite(n) && n >= 0 ? n : null;
    }
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    const guestEmail = typeof body.guest_email === 'string' && body.guest_email.trim() ? body.guest_email.trim() : null;

    const { v4: uuidv4 } = require('uuid');
    const guestToken = uuidv4();

    const result = await dbExecute(
      `INSERT INTO bookings (booking_id, guest_token, guest_name, guest_email, check_in, check_out, num_guests, total_amount, platform, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        guestToken,
        guestName,
        guestEmail,
        checkIn,
        checkOut,
        numGuests,
        totalAmount,
        body.platform || 'airbnb',
        'confirmed',
        notes,
      ]
    );

    return NextResponse.json({
      id: Number(result.lastInsertRowid),
      booking_id: bookingId,
      guest_token: guestToken,
      message: 'Prenotazione creata',
    });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Prenotazione già esistente con questo codice di conferma' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
