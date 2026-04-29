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

  try {
    const bookingId = params.id;

    // Get booking info
    const booking = await dbQueryOne(
      'SELECT id, booking_id, guest_name, check_in, check_out, num_guests FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    // Get cleaning schedule
    let cleaning = await dbQueryOne(
      'SELECT * FROM cleaning_schedules WHERE booking_id = ?',
      [bookingId]
    );

    // If no cleaning exists, create one
    if (!cleaning) {
      const result = await dbQuery(
        'INSERT INTO cleaning_schedules (booking_id, scheduled_date, status) VALUES (?, ?, ?) RETURNING *',
        [bookingId, booking.check_out, 'pending']
      );
      cleaning = result[0] || null;
    }

    // Get photos
    const photos = cleaning ? await dbQuery(
      'SELECT * FROM cleaning_photos WHERE cleaning_id = ? ORDER BY created_at DESC',
      [cleaning.id]
    ) : [];

    // Get issues
    const issues = cleaning ? await dbQuery(
      'SELECT * FROM cleaning_issues WHERE cleaning_id = ? ORDER BY created_at DESC',
      [cleaning.id]
    ) : [];

    // Calculate duration if completed
    let duration = null;
    if (cleaning?.started_at && cleaning?.completed_at) {
      const start = new Date(String(cleaning.started_at));
      const end = new Date(String(cleaning.completed_at));
      duration = Math.round((end.getTime() - start.getTime()) / 60000); // minutes
    }

    return NextResponse.json({
      booking,
      cleaning: cleaning ? {
        ...cleaning,
        duration_calculated: duration,
      } : null,
      photos,
      issues,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
