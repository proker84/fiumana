import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const bookingId = params.id;

  try {
    // First delete associated guests
    await dbExecute('DELETE FROM guests WHERE booking_id = ?', [bookingId]);

    // Then delete the booking
    await dbExecute('DELETE FROM bookings WHERE id = ?', [bookingId]);

    return NextResponse.json({ success: true, message: 'Prenotazione eliminata' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}
