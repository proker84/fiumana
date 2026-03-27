import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import {
  generateAlloggiatiTextRecord,
  submitToAlloggiati,
  validateGuestData,
  ALLOGGIATI_TEST_MODE,
  type GuestData,
  type AlloggiatiCredentials,
} from '@/lib/alloggiati';

/**
 * POST /api/alloggiati
 * Send guest data to Portale Alloggiati for a specific booking
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { bookingId, testMode: requestTestMode } = await req.json();

    // Test mode can be forced via request or environment variable
    const isTestMode = requestTestMode === true || ALLOGGIATI_TEST_MODE;

    if (!bookingId) {
      return NextResponse.json({ error: 'ID prenotazione obbligatorio' }, { status: 400 });
    }

    // Get booking
    const booking = await dbQueryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    // Get guests for this booking
    const guests = await dbQuery(
      'SELECT * FROM guests WHERE booking_id = ? ORDER BY id ASC',
      [bookingId]
    );

    if (guests.length === 0) {
      return NextResponse.json(
        { error: 'Nessun ospite registrato per questa prenotazione. Invia prima il link di compilazione agli ospiti.' },
        { status: 400 }
      );
    }

    // Get Alloggiati credentials for the property
    const config = await dbQueryOne(
      'SELECT * FROM alloggiati_config WHERE property_id = ?',
      [booking.property_id || 1]
    );

    // Validate all guest data
    const allErrors: string[] = [];
    const guestRecords: string[] = [];

    for (const guest of guests) {
      const guestData: GuestData = {
        tipoAlloggiato: guest.tipo_alloggiato as string,
        cognome: guest.cognome as string,
        nome: guest.nome as string,
        sesso: guest.sesso as string,
        dataNascita: guest.data_nascita as string,
        comuneNascita: guest.comune_nascita as string,
        provinciaNascita: guest.provincia_nascita as string,
        statoNascita: guest.stato_nascita as string,
        cittadinanza: guest.cittadinanza as string,
        tipoDocumento: guest.tipo_documento as string,
        numeroDocumento: guest.numero_documento as string,
        luogoRilascio: guest.luogo_rilascio as string,
      };

      const errors = validateGuestData(guestData);
      if (errors.length > 0) {
        allErrors.push(`${guest.nome} ${guest.cognome}: ${errors.join(', ')}`);
      }

      // Generate text record
      const record = generateAlloggiatiTextRecord(
        guestData,
        (guest.data_arrivo as string) || (booking.check_in as string),
        (guest.giorni_permanenza as number) || 1
      );
      guestRecords.push(record);
    }

    if (allErrors.length > 0) {
      return NextResponse.json({
        error: 'Errori di validazione',
        details: allErrors,
      }, { status: 400 });
    }

    // If we have credentials, attempt SOAP submission
    if (config && config.wskey) {
      const credentials: AlloggiatiCredentials = {
        username: config.username as string,
        password: (config.password_encrypted as string) || '',
        wskey: config.wskey as string,
      };

      const combinedRecords = guestRecords.join('\n');
      const result = await submitToAlloggiati(
        credentials,
        combinedRecords,
        new Date(booking.check_in as string),
        isTestMode
      );

      if (result.success) {
        // Mark as sent with timestamp for document cleanup
        const receiptValue = result.testMode
          ? `TEST:${result.receipt}`
          : (result.receipt || 'sent');

        await dbExecute(
          'UPDATE bookings SET alloggiati_sent = 1, alloggiati_sent_at = CURRENT_TIMESTAMP, alloggiati_receipt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [receiptValue, bookingId]
        );

        return NextResponse.json({
          success: true,
          message: result.testMode
            ? `[TEST MODE] Simulazione invio completata per ${guests.length} ospiti`
            : `Schedine inviate con successo per ${guests.length} ospiti`,
          receipt: result.receipt,
          testMode: result.testMode || false,
          records: isTestMode ? guestRecords : undefined,
        });
      } else {
        return NextResponse.json({
          error: `Errore dal Portale Alloggiati: ${result.error}`,
          records: guestRecords,
        }, { status: 502 });
      }
    }

    // No credentials configured - use test mode or generate file
    if (isTestMode) {
      // Simulate submission in test mode even without credentials
      const fakeReceipt = `TEST-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      await dbExecute(
        'UPDATE bookings SET alloggiati_sent = 1, alloggiati_sent_at = CURRENT_TIMESTAMP, alloggiati_receipt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [`TEST:${fakeReceipt}`, bookingId]
      );

      return NextResponse.json({
        success: true,
        message: `[TEST MODE] Simulazione invio completata per ${guests.length} ospiti (senza credenziali)`,
        receipt: fakeReceipt,
        testMode: true,
        records: guestRecords,
        textFile: guestRecords.join('\r\n'),
      });
    }

    // Production mode without credentials - generate file for manual upload
    const textContent = guestRecords.join('\r\n');

    // Mark as "generated" but not "sent"
    await dbExecute(
      'UPDATE bookings SET alloggiati_receipt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['file_generated', bookingId]
    );

    return NextResponse.json({
      success: true,
      message: `File schedine generato per ${guests.length} ospiti. Credenziali Alloggiati non configurate - scarica il file per upload manuale.`,
      textFile: textContent,
      records: guestRecords,
      note: 'Per l\'invio automatico, configura le credenziali del Portale Alloggiati (username + WSKEY) nella sezione Impostazioni.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}

/**
 * GET /api/alloggiati
 * Get Alloggiati configuration status
 */
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const configs = await dbQuery(
      'SELECT id, property_id, username, last_sync FROM alloggiati_config'
    );

    return NextResponse.json({ configs });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
