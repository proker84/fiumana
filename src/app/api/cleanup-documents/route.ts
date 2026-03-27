import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * POST /api/cleanup-documents
 * Automatically delete document files 48 hours after Alloggiati submission
 * Can be called by a cron job or manually from admin
 */
export async function POST(req: NextRequest) {
  // Allow both admin auth and cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const auth = authenticateRequest(req);

  if (!auth && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    // Find all bookings where:
    // 1. alloggiati_sent = 1 (successfully sent)
    // 2. alloggiati_sent_at is more than 48 hours ago
    // 3. Has guests with documents
    const bookingsToClean = await dbQuery(`
      SELECT DISTINCT b.id, b.booking_id, b.alloggiati_sent_at
      FROM bookings b
      INNER JOIN guests g ON g.booking_id = b.id
      WHERE b.alloggiati_sent = 1
        AND b.alloggiati_sent_at IS NOT NULL
        AND datetime(b.alloggiati_sent_at, '+48 hours') < datetime('now')
        AND (g.documento_fronte IS NOT NULL OR g.documento_retro IS NOT NULL)
    `);

    if (bookingsToClean.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun documento da eliminare',
        cleaned: 0,
      });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    let deletedCount = 0;
    const errors: string[] = [];
    const cleanedBookings: string[] = [];

    for (const booking of bookingsToClean) {
      // Get guests with documents
      const guests = await dbQuery(
        `SELECT id, documento_fronte, documento_retro
         FROM guests
         WHERE booking_id = ?
           AND (documento_fronte IS NOT NULL OR documento_retro IS NOT NULL)`,
        [booking.id]
      );

      for (const guest of guests) {
        // Delete front document
        if (guest.documento_fronte) {
          const frontPath = path.join(uploadsDir, guest.documento_fronte as string);
          try {
            if (existsSync(frontPath)) {
              await unlink(frontPath);
              deletedCount++;
            }
          } catch (err: any) {
            errors.push(`Errore eliminazione ${guest.documento_fronte}: ${err.message}`);
          }
        }

        // Delete back document
        if (guest.documento_retro) {
          const backPath = path.join(uploadsDir, guest.documento_retro as string);
          try {
            if (existsSync(backPath)) {
              await unlink(backPath);
              deletedCount++;
            }
          } catch (err: any) {
            errors.push(`Errore eliminazione ${guest.documento_retro}: ${err.message}`);
          }
        }

        // Clear document references in database
        await dbExecute(
          `UPDATE guests SET documento_fronte = NULL, documento_retro = NULL WHERE id = ?`,
          [guest.id]
        );
      }

      cleanedBookings.push(booking.booking_id as string);
    }

    // Log cleanup action
    console.log(`[Cleanup] Eliminati ${deletedCount} documenti da ${cleanedBookings.length} prenotazioni`);

    return NextResponse.json({
      success: true,
      message: `Eliminati ${deletedCount} documenti da ${cleanedBookings.length} prenotazioni`,
      cleaned: deletedCount,
      bookings: cleanedBookings,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Cleanup] Errore:', error);
    return NextResponse.json(
      { error: 'Errore durante la pulizia: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cleanup-documents
 * Check cleanup status - how many documents are pending deletion
 */
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    // Documents ready for cleanup (48h passed)
    const readyForCleanup = await dbQueryOne(`
      SELECT COUNT(*) as count
      FROM guests g
      INNER JOIN bookings b ON b.id = g.booking_id
      WHERE b.alloggiati_sent = 1
        AND b.alloggiati_sent_at IS NOT NULL
        AND datetime(b.alloggiati_sent_at, '+48 hours') < datetime('now')
        AND (g.documento_fronte IS NOT NULL OR g.documento_retro IS NOT NULL)
    `);

    // Documents waiting (less than 48h)
    const pendingCleanup = await dbQueryOne(`
      SELECT COUNT(*) as count
      FROM guests g
      INNER JOIN bookings b ON b.id = g.booking_id
      WHERE b.alloggiati_sent = 1
        AND b.alloggiati_sent_at IS NOT NULL
        AND datetime(b.alloggiati_sent_at, '+48 hours') >= datetime('now')
        AND (g.documento_fronte IS NOT NULL OR g.documento_retro IS NOT NULL)
    `);

    // Documents not yet sent to Alloggiati
    const notSent = await dbQueryOne(`
      SELECT COUNT(*) as count
      FROM guests g
      INNER JOIN bookings b ON b.id = g.booking_id
      WHERE (b.alloggiati_sent = 0 OR b.alloggiati_sent IS NULL)
        AND (g.documento_fronte IS NOT NULL OR g.documento_retro IS NOT NULL)
    `);

    return NextResponse.json({
      readyForCleanup: Number(readyForCleanup?.count || 0),
      pendingCleanup: Number(pendingCleanup?.count || 0),
      notSent: Number(notSent?.count || 0),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore: ' + error.message },
      { status: 500 }
    );
  }
}
