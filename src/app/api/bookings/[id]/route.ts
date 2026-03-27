import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const bookingId = params.id;

  try {
    const booking = await dbQueryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    const guests = await dbQuery(
      'SELECT * FROM guests WHERE booking_id = ? ORDER BY id ASC',
      [bookingId]
    );

    return NextResponse.json({ booking, guests });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}
