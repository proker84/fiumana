import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQueryOne } from '@/lib/db';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { note } = await req.json();
    const bookingId = params.id;

    if (!note || !note.trim()) {
      return NextResponse.json(
        { error: 'Inserisci una nota con le correzioni richieste' },
        { status: 400 }
      );
    }

    // Get booking info
    const booking = await dbQueryOne(
      'SELECT * FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    // Update booking status and add correction note
    await dbExecute(
      `UPDATE bookings SET status = 'needs_correction', correction_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [note.trim(), bookingId]
    );

    // Send email notification if configured
    let emailSent = false;
    if (resend && booking.guest_email) {
      const guestLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://immobiliare-fiumana.vercel.app'}/guest/${booking.guest_token}`;

      try {
        await resend.emails.send({
          from: 'Immobiliare Fiumana <noreply@immobiliarefiumana.com>',
          to: booking.guest_email as string,
          subject: 'Correzione richiesta per la tua prenotazione',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a5f;">Correzione Richiesta</h2>
              <p>Gentile ${booking.guest_name},</p>
              <p>Abbiamo bisogno di alcune correzioni per completare la registrazione della tua prenotazione <strong>${booking.booking_id}</strong>.</p>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <strong>Note:</strong><br>
                ${note.trim().replace(/\n/g, '<br>')}
              </div>

              <p>Per favore, clicca sul link seguente per correggere i dati:</p>
              <p><a href="${guestLink}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Correggi i dati</a></p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Grazie per la collaborazione.<br>
                Immobiliare Fiumana
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Richiesta di correzione inviata via email'
        : 'Stato aggiornato. Email non inviata (configura RESEND_API_KEY)',
      emailSent,
    });
  } catch (error: any) {
    console.error('Request correction error:', error);
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}
