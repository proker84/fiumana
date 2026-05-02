import { NextRequest, NextResponse } from 'next/server';
import { dbExecute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

const columnMap: Record<string, string[]> = {
  booking_id: ['Confirmation Code', 'confirmation_code', 'Confirmation code', 'Code', 'Codice di conferma', 'Codice conferma'],
  guest_name: ['Guest Name', 'guest_name', 'Guest', 'Nome ospite', 'Ospite', "Nome dell'ospite"],
  contact: ['Contact', 'contact', 'Email', 'email', 'Guest Email', 'Email ospite', 'Contatti', 'Phone', 'Telefono'],
  check_in: ['Start Date', 'start_date', 'Check-in', 'check_in', 'Inizio', 'Data inizio', 'Data di inizio'],
  check_out: ['End Date', 'end_date', 'Check-out', 'check_out', 'Fine', 'Data fine', 'Data di fine'],
  num_guests: ['Number of Guests', 'number_of_guests', 'Guests', 'guests', 'N. ospiti', 'Numero ospiti'],
  num_adults: ['N. di adulti', 'N. adulti', 'Adults', 'Adulti'],
  num_children: ['N. di bambini', 'N. bambini', 'Children', 'Bambini'],
  num_infants: ['N. di neonati', 'N. neonati', 'Infants', 'Neonati'],
  total: ['Total Payout', 'total_payout', 'Amount', 'Payout', 'Totale', 'Importo', 'Guadagni'],
  listing: ['Annuncio', 'Listing', 'Property'],
};

function findColumn(record: Record<string, string>, field: string): string {
  for (const col of columnMap[field] || []) {
    if (record[col] !== undefined) return record[col];
  }
  return '';
}

function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // DD/MM/YYYY format (European/Italian)
  const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    const day = match1[1].padStart(2, '0');
    const month = match1[2].padStart(2, '0');
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }
  // DD-MM-YYYY format
  const match2 = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match2) {
    const day = match2[1].padStart(2, '0');
    const month = match2[2].padStart(2, '0');
    const year = match2[3];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  // Remove currency symbols and spaces, replace comma with dot
  const cleaned = amountStr.replace(/[€$£\s]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, imported: 0, errors: ['Nessun file caricato'] },
        { status: 400 }
      );
    }

    const csvContent = await file.text();

    // Parse CSV with flexible options to handle Airbnb exports
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
      relaxQuotes: true,
    });

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, imported: 0, errors: ['Il file CSV è vuoto'] },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const imported: any[] = [];
    const csvBookingIds: string[] = []; // Raccoglie tutti i booking_id validi dal CSV

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 for header + 1-indexed

      const bookingId = findColumn(record, 'booking_id');
      const guestName = findColumn(record, 'guest_name');
      const contact = findColumn(record, 'contact');
      const checkIn = parseDate(findColumn(record, 'check_in'));
      const checkOut = parseDate(findColumn(record, 'check_out'));

      // Calculate total guests from adults + children + infants, or use num_guests
      let numGuests = parseInt(findColumn(record, 'num_guests') || '0') || 0;
      if (numGuests === 0) {
        const adults = parseInt(findColumn(record, 'num_adults') || '0') || 0;
        const children = parseInt(findColumn(record, 'num_children') || '0') || 0;
        const infants = parseInt(findColumn(record, 'num_infants') || '0') || 0;
        numGuests = adults + children + infants || 1;
      }

      const total = parseAmount(findColumn(record, 'total'));

      if (!bookingId) {
        errors.push(`Riga ${rowNum}: Codice conferma mancante, riga saltata`);
        continue;
      }

      // Aggiungi alla lista di booking_id validi (anche se già esistente)
      csvBookingIds.push(bookingId);

      if (!checkIn || !checkOut) {
        errors.push(`Riga ${rowNum}: Date check-in/check-out mancanti per ${bookingId}`);
        continue;
      }

      const guestToken = uuidv4();

      try {
        const result = await dbExecute(
          `INSERT OR IGNORE INTO bookings (booking_id, guest_token, guest_name, guest_email, check_in, check_out, num_guests, total_amount, platform, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'airbnb', 'confirmed')`,
          [
            bookingId,
            guestToken,
            guestName || 'Ospite',
            contact || null,
            checkIn,
            checkOut,
            numGuests,
            total || null,
          ]
        );

        if (result.rowsAffected > 0) {
          imported.push({
            booking_id: bookingId,
            guest_name: guestName,
            check_in: checkIn,
            check_out: checkOut,
            guest_token: guestToken,
          });
        } else {
          // Prenotazione già esistente: riattivala se era cancellata
          await dbExecute(
            `UPDATE bookings SET cancelled = 0 WHERE booking_id = ? AND cancelled = 1`,
            [bookingId]
          );
        }
      } catch (err: any) {
        errors.push(`Riga ${rowNum}: Errore - ${err.message}`);
      }
    }

    // Marca come cancellate SOLO le prenotazioni FUTURE non presenti nel CSV.
    //
    // Airbnb esporta nel CSV solo i soggiorni futuri o in corso ("Confermata",
    // "Soggiorno in corso") — esclude le booking concluse e quelle cancellate.
    // Quindi la mancanza dal CSV è ambigua:
    //   - check_in >= oggi → realmente cancellata dal cliente
    //   - check_in <  oggi → semplicemente passata (e quindi non più nel CSV)
    //
    // Senza questo filtro le booking storiche (per cui spesso abbiamo già
    // fatturato e fatto alloggiati) verrebbero marcate come cancellate per
    // errore. Quindi limitiamo il soft-delete alle sole booking future.
    let cancelledCount = 0;
    if (csvBookingIds.length > 0) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const placeholders = csvBookingIds.map(() => '?').join(',');
      const cancelResult = await dbExecute(
        `UPDATE bookings
           SET cancelled = 1
           WHERE booking_id NOT IN (${placeholders})
             AND cancelled = 0
             AND check_in >= ?`,
        [...csvBookingIds, today]
      );
      cancelledCount = Number(cancelResult.rowsAffected || 0);
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      cancelled: cancelledCount,
      errors,
      bookings: imported,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, imported: 0, errors: ['Errore parsing CSV: ' + error.message] },
      { status: 500 }
    );
  }
}
