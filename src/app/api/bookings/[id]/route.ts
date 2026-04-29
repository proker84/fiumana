import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne, dbExecute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const bookingId = params.id;

  try {
    const booking = await dbQueryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    const guests = await dbQuery(
      'SELECT * FROM guests WHERE booking_id = ? ORDER BY id ASC',
      [bookingId]
    );

    return NextResponse.json({ booking, guests });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Aggiorna alcuni campi della prenotazione utili per la fatturazione:
 *   - city_tax_amount: tassa di soggiorno totale (in euro) — verrà sottratta dal totale fattura
 *   - airbnb_commission: commissione trattenuta da Airbnb (in euro) — info per riconciliazione
 *   - notes
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const allowed: Record<string, string> = {
      city_tax_amount: 'city_tax_amount',
      airbnb_commission: 'airbnb_commission',
      notes: 'notes',
    };

    const sets: string[] = [];
    const args: any[] = [];
    for (const [key, col] of Object.entries(allowed)) {
      if (key in body) {
        sets.push(`${col} = ?`);
        let v = body[key];
        if (key === 'city_tax_amount' || key === 'airbnb_commission') {
          v = Number(v);
          if (!Number.isFinite(v) || v < 0) v = 0;
        }
        args.push(v);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    args.push(params.id);

    await dbExecute(
      `UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`,
      args,
    );
    const updated = await dbQueryOne('SELECT * FROM bookings WHERE id = ?', [params.id]);
    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const bookingId = params.id;

  try {
    // First delete associated guests
    await dbExecute('DELETE FROM guests WHERE booking_id = ?', [bookingId]);

    // Then delete the booking
    await dbExecute('DELETE FROM bookings WHERE id = ?', [bookingId]);

    return NextResponse.json({ success: true, message: 'Prenotazione eliminata' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}
