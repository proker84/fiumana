import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    // Get access token
    const config = await dbQueryOne('SELECT * FROM cleaning_config WHERE active = 1 LIMIT 1');

    // Get all cleanings for the current year
    const currentYear = new Date().getFullYear();
    const cleanings = await dbQuery(`
      SELECT
        b.id,
        b.booking_id,
        b.guest_name,
        b.check_in,
        b.check_out,
        b.num_guests,
        cs.id as cleaning_id,
        cs.status as cleaning_status,
        cs.scheduled_date,
        cs.started_at,
        cs.completed_at
      FROM bookings b
      LEFT JOIN cleaning_schedules cs ON b.id = cs.booking_id
      WHERE b.check_out >= '${currentYear}-01-01'
        AND b.check_out <= '${currentYear}-12-31'
      ORDER BY b.check_out ASC
    `);

    // Enrich with photos and issues count
    const enrichedCleanings = await Promise.all(cleanings.map(async (c: any) => {
      if (c.cleaning_id) {
        const photosCount = await dbQueryOne(
          'SELECT COUNT(*) as count FROM cleaning_photos WHERE cleaning_id = ?',
          [c.cleaning_id]
        );
        const issuesCount = await dbQueryOne(
          'SELECT COUNT(*) as count FROM cleaning_issues WHERE cleaning_id = ? AND resolved = 0',
          [c.cleaning_id]
        );
        return {
          ...c,
          photos_count: Number(photosCount?.count || 0),
          open_issues: Number(issuesCount?.count || 0),
        };
      }
      return { ...c, photos_count: 0, open_issues: 0 };
    }));

    return NextResponse.json({
      cleanings: enrichedCleanings,
      accessToken: config?.access_token || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
