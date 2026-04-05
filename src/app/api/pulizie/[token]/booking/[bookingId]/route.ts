import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Verify cleaning access token
async function verifyCleaningToken(token: string) {
  const config = await dbQueryOne(
    'SELECT * FROM cleaning_config WHERE access_token = ? AND active = 1',
    [token]
  );
  return config;
}

// GET - Get cleaning details for a booking
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string; bookingId: string } }
) {
  try {
    const config = await verifyCleaningToken(params.token);
    if (!config) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 401 });
    }

    const booking = await dbQueryOne(
      'SELECT * FROM bookings WHERE id = ?',
      [params.bookingId]
    );

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    let cleaning = await dbQueryOne(
      'SELECT * FROM cleaning_schedules WHERE booking_id = ?',
      [params.bookingId]
    );

    // Auto-create cleaning schedule if not exists
    if (!cleaning) {
      await dbExecute(
        `INSERT INTO cleaning_schedules (booking_id, scheduled_date, status)
         VALUES (?, ?, 'pending')`,
        [params.bookingId, booking.check_out]
      );
      cleaning = await dbQueryOne(
        'SELECT * FROM cleaning_schedules WHERE booking_id = ?',
        [params.bookingId]
      );
    }

    const photos = await dbQuery(
      'SELECT * FROM cleaning_photos WHERE cleaning_id = ? ORDER BY created_at DESC',
      [cleaning.id]
    );

    const issues = await dbQuery(
      'SELECT * FROM cleaning_issues WHERE cleaning_id = ? ORDER BY created_at DESC',
      [cleaning.id]
    );

    return NextResponse.json({
      booking,
      cleaning,
      photos,
      issues
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}

// POST - Update cleaning (schedule, start, complete, add note)
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; bookingId: string } }
) {
  try {
    const config = await verifyCleaningToken(params.token);
    if (!config) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { action, scheduled_date, scheduled_time, notes } = body;

    // Get or create cleaning schedule
    let cleaning = await dbQueryOne(
      'SELECT * FROM cleaning_schedules WHERE booking_id = ?',
      [params.bookingId]
    );

    const booking = await dbQueryOne(
      'SELECT * FROM bookings WHERE id = ?',
      [params.bookingId]
    );

    if (!cleaning) {
      await dbExecute(
        `INSERT INTO cleaning_schedules (booking_id, scheduled_date, status)
         VALUES (?, ?, 'pending')`,
        [params.bookingId, booking?.check_out || new Date().toISOString().split('T')[0]]
      );
      cleaning = await dbQueryOne(
        'SELECT * FROM cleaning_schedules WHERE booking_id = ?',
        [params.bookingId]
      );
    }

    switch (action) {
      case 'schedule':
        await dbExecute(
          `UPDATE cleaning_schedules
           SET scheduled_date = ?, scheduled_time = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [scheduled_date, scheduled_time, cleaning.id]
        );
        break;

      case 'start':
        await dbExecute(
          `UPDATE cleaning_schedules
           SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [cleaning.id]
        );
        break;

      case 'complete':
        await dbExecute(
          `UPDATE cleaning_schedules
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [cleaning.id]
        );
        break;

      case 'add_note':
        const existingNotes = cleaning.notes || '';
        const timestamp = new Date().toLocaleString('it-IT');
        const newNotes = existingNotes
          ? `${existingNotes}\n\n[${timestamp}]\n${notes}`
          : `[${timestamp}]\n${notes}`;
        await dbExecute(
          `UPDATE cleaning_schedules
           SET notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newNotes, cleaning.id]
        );
        break;

      default:
        return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Aggiornamento completato' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
