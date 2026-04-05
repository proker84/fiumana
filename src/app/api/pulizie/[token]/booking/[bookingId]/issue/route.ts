import { NextRequest, NextResponse } from 'next/server';
import { dbQueryOne, dbExecute } from '@/lib/db';
import { put } from '@vercel/blob';
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

const ISSUE_TYPE_LABELS: Record<string, string> = {
  danno: 'Danno',
  mancanza: 'Mancanza',
  guasto: 'Guasto',
  sporco: 'Sporco eccessivo',
  altro: 'Altro',
};

const URGENCY_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  bassa: 'Bassa',
};

const URGENCY_COLORS: Record<string, string> = {
  alta: '#dc2626',
  media: '#f59e0b',
  bassa: '#22c55e',
};

// POST - Report issue
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
    const issueType = formData.get('issue_type') as string;
    const description = formData.get('description') as string;
    const urgency = formData.get('urgency') as string || 'media';
    const file = formData.get('file') as File | null;

    if (!issueType || !description) {
      return NextResponse.json({ error: 'Tipo e descrizione obbligatori' }, { status: 400 });
    }

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

    // Upload photo if provided
    let photoUrl = null;
    if (file) {
      const timestamp = Date.now();
      const filename = `cleaning/${params.bookingId}/issue_${timestamp}_${file.name}`;
      const blob = await put(filename, file, { access: 'public' });
      photoUrl = blob.url;
    }

    // Save issue
    await dbExecute(
      `INSERT INTO cleaning_issues (cleaning_id, issue_type, description, urgency, photo_url)
       VALUES (?, ?, ?, ?, ?)`,
      [cleaning.id, issueType, description, urgency, photoUrl]
    );

    // Send email notification
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Immobiliare Fiumana <noreply@immobiliarefiumana.com>',
          to: 'immobiliarefiumana@gmail.com',
          subject: `⚠️ [${URGENCY_LABELS[urgency]}] Segnalazione Pulizie - ${ISSUE_TYPE_LABELS[issueType]}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${URGENCY_COLORS[urgency]}; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">
                  Segnalazione Pulizie
                </h1>
              </div>

              <div style="padding: 30px; background: #f9fafb;">
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 18px;">
                    ${ISSUE_TYPE_LABELS[issueType]}
                  </h2>

                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Prenotazione:</strong>
                      </td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        ${booking?.booking_id || 'N/D'}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Ospite:</strong>
                      </td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        ${booking?.guest_name || 'N/D'}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Check-out:</strong>
                      </td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        ${booking?.check_out || 'N/D'}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Urgenza:</strong>
                      </td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="background: ${URGENCY_COLORS[urgency]}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                          ${URGENCY_LABELS[urgency]}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${URGENCY_COLORS[urgency]};">
                  <strong style="color: #6b7280; display: block; margin-bottom: 10px;">Descrizione:</strong>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">${description}</p>
                </div>

                ${photoUrl ? `
                <div style="margin-top: 20px;">
                  <strong style="color: #6b7280; display: block; margin-bottom: 10px;">Foto allegata:</strong>
                  <a href="${photoUrl}" target="_blank">
                    <img src="${photoUrl}" style="max-width: 100%; border-radius: 8px;" alt="Foto segnalazione" />
                  </a>
                </div>
                ` : ''}
              </div>

              <div style="padding: 20px; text-align: center; background: #1e3a5f;">
                <a href="https://www.immobiliarefiumana.com/admin/pulizie"
                   style="display: inline-block; background: #d4a853; color: #1e3a5f; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Vai al Pannello Pulizie
                </a>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Segnalazione inviata con successo'
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
