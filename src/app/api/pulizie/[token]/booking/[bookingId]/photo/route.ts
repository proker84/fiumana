import { NextRequest, NextResponse } from 'next/server';
import { dbQueryOne, dbExecute } from '@/lib/db';
import { put } from '@vercel/blob';

// Verify cleaning access token
async function verifyCleaningToken(token: string) {
  const config = await dbQueryOne(
    'SELECT * FROM cleaning_config WHERE access_token = ? AND active = 1',
    [token]
  );
  return config;
}

// POST - Upload multiple photos
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; bookingId: string } }
) {
  try {
    const config = await verifyCleaningToken(params.token);
    if (!config) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const photoType = formData.get('type') as string || 'post';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 });
    }

    // Get or create cleaning schedule
    let cleaning = await dbQueryOne(
      'SELECT * FROM cleaning_schedules WHERE booking_id = ?',
      [params.bookingId]
    );

    if (!cleaning) {
      const booking = await dbQueryOne(
        'SELECT * FROM bookings WHERE id = ?',
        [params.bookingId]
      );
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

    const uploadedUrls: string[] = [];

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const filename = `cleaning/${params.bookingId}/${photoType}_${timestamp}_${i}_${file.name}`;

      const blob = await put(filename, file, {
        access: 'public',
      });

      // Save to database
      await dbExecute(
        `INSERT INTO cleaning_photos (cleaning_id, photo_url, photo_type, caption)
         VALUES (?, ?, ?, ?)`,
        [cleaning.id, blob.url, photoType, '']
      );

      uploadedUrls.push(blob.url);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      message: `${uploadedUrls.length} foto caricate con successo`
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
