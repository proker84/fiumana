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
      const totalBookingsResult = await dbQueryOne('SELECT COUNT(*) as count FROM bookings');
      const totalBookings = Number(totalBookingsResult?.count || 0);

      const today = new Date().toISOString().split('T')[0];
      const todayCheckinsResult = await dbQueryOne(
        'SELECT COUNT(*) as count FROM bookings WHERE check_in = ?',
        [today]
      );
      const todayCheckins = Number(todayCheckinsResult?.count || 0);

      const pendingGuestsResult = await dbQueryOne(`
        SELECT COUNT(*) as count FROM bookings b
        WHERE b.id NOT IN (SELECT DISTINCT booking_id FROM guests)
      `);
      const pendingGuests = Number(pendingGuestsResult?.count || 0);

      const alloggiatiPendingResult = await dbQueryOne(
        'SELECT COUNT(*) as count FROM bookings WHERE alloggiati_sent = 0'
      );
      const alloggiatiPending = Number(alloggiatiPendingResult?.count || 0);

      // Restituiamo TUTTE le prenotazioni ordinate per check-in crescente.
      // Il client poi separa la "prossima imminente" (in alto come card) dal
      // resto (tabella sotto). Niente più LIMIT — la dashboard deve mostrare
      // tutto l'elenco senza dover andare su /admin/prenotazioni.
      const recentBookings = await dbQuery(
        'SELECT * FROM bookings ORDER BY check_in ASC'
      );

      return NextResponse.json({
        totalBookings,
        todayCheckins,
        pendingGuests,
        alloggiatiPending,
        recentBookings,
      });
    }

    const bookings = await dbQuery(`
      SELECT b.*,
        (SELECT COUNT(*) FROM guests g WHERE g.booking_id = b.id) as guests_count
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

    const { v4: uuidv4 } = require('uuid');
    const guestToken = uuidv4();

    const result = await dbExecute(
      `INSERT INTO bookings (booking_id, guest_token, guest_name, guest_email, check_in, check_out, num_guests, total_amount, platform, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.booking_id,
        guestToken,
        body.guest_name,
        body.guest_email || null,
        body.check_in,
        body.check_out,
        body.num_guests || 1,
        body.total_amount || null,
        body.platform || 'airbnb',
        'confirmed',
      ]
    );

    return NextResponse.json({
      id: result.lastInsertRowid,
      guest_token: guestToken,
      message: 'Prenotazione creata',
    });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Prenotazione già esistente' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
