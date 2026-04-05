import { NextRequest, NextResponse } from 'next/server';
import { dbExecute } from '@/lib/db';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FORMULA_LABELS: Record<string, string> = {
  gestione_standard: 'Gestione Standard',
  affitto_garantito: 'Affitto Garantito',
  consulenza: 'Consulenza',
};

const TIPO_LABELS: Record<string, string> = {
  appartamento: 'Appartamento',
  villa: 'Villa',
  casa: 'Casa',
  altro: 'Altro',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { nome, cognome, email, telefono, citta_immobile, tipo_immobile, formula_interesse, messaggio } = body;

    if (!nome || !cognome || !email) {
      return NextResponse.json({ error: 'Nome, cognome e email obbligatori' }, { status: 400 });
    }

    // Save to database
    await dbExecute(
      `INSERT INTO contact_requests (nome, cognome, email, telefono, citta_immobile, tipo_immobile, formula_interesse, messaggio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, cognome, email, telefono || null, citta_immobile || null, tipo_immobile || null, formula_interesse || null, messaggio || null]
    );

    // Send email notification
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Immobiliare Fiumana <noreply@immobiliarefiumana.com>',
          to: 'immobiliarefiumana@gmail.com',
          replyTo: email,
          subject: `Nuova richiesta da ${nome} ${cognome}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Nuova Richiesta di Contatto</h1>
              </div>

              <div style="padding: 30px; background: #f9fafb;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280;">Nome:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      ${nome} ${cognome}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280;">Email:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <a href="mailto:${email}" style="color: #1e3a5f;">${email}</a>
                    </td>
                  </tr>
                  ${telefono ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280;">Telefono:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <a href="tel:${telefono}" style="color: #1e3a5f;">${telefono}</a>
                    </td>
                  </tr>
                  ` : ''}
                  ${citta_immobile ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280;">Città immobile:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      ${citta_immobile}
                    </td>
                  </tr>
                  ` : ''}
                  ${tipo_immobile ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280;">Tipo immobile:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      ${TIPO_LABELS[tipo_immobile] || tipo_immobile}
                    </td>
                  </tr>
                  ` : ''}
                  ${formula_interesse ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong style="color: #6b7280;">Formula interesse:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                        ${FORMULA_LABELS[formula_interesse] || formula_interesse}
                      </span>
                    </td>
                  </tr>
                  ` : ''}
                </table>

                ${messaggio ? `
                <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #1e3a5f;">
                  <strong style="color: #6b7280; display: block; margin-bottom: 10px;">Messaggio:</strong>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">${messaggio}</p>
                </div>
                ` : ''}
              </div>

              <div style="padding: 20px; text-align: center; background: #1e3a5f;">
                <a href="https://www.immobiliarefiumana.com/admin/richieste"
                   style="display: inline-block; background: #d4a853; color: #1e3a5f; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Vai al Pannello Admin
                </a>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true, message: 'Richiesta inviata con successo' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
