import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';

// Verify cleaning access token
async function verifyCleaningToken(token: string) {
  const config = await dbQueryOne(
    'SELECT * FROM cleaning_config WHERE access_token = ? AND active = 1',
    [token]
  );
  return config;
}

// GET - Get all bookings with cleaning status
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const config = await verifyCleaningToken(params.token);
    if (!config) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 401 });
    }

    // Get all bookings for the current year
    const currentYear = new Date().getFullYear();
    const bookings = await dbQuery(`
      SELECT
        b.id,
        b.booking_id,
        b.guest_name,
        b.check_in,
        b.check_out,
        b.num_guests,
        b.status as booking_status,
        cs.id as cleaning_id,
        cs.scheduled_date,
        cs.scheduled_time,
        cs.status as cleaning_status,
        cs.started_at,
        cs.completed_at,
        cs.notes as cleaning_notes
      FROM bookings b
      LEFT JOIN cleaning_schedules cs ON b.id = cs.booking_id
      WHERE b.check_out >= '${currentYear}-01-01'
        AND b.check_out <= '${currentYear}-12-31'
        AND (b.cancelled = 0 OR b.cancelled IS NULL)
      ORDER BY b.check_out ASC
    `);

    // Get photos count and issues count for each cleaning
    const enrichedBookings = await Promise.all(bookings.map(async (booking: any) => {
      if (booking.cleaning_id) {
        const photosCount = await dbQueryOne(
          'SELECT COUNT(*) as count FROM cleaning_photos WHERE cleaning_id = ?',
          [booking.cleaning_id]
        );
        const issuesCount = await dbQueryOne(
          'SELECT COUNT(*) as count FROM cleaning_issues WHERE cleaning_id = ? AND resolved = 0',
          [booking.cleaning_id]
        );
        return {
          ...booking,
          photos_count: Number(photosCount?.count || 0),
          open_issues: Number(issuesCount?.count || 0),
        };
      }
      return { ...booking, photos_count: 0, open_issues: 0 };
    }));

    return NextResponse.json({
      bookings: enrichedBookings,
      staffName: config.name
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
