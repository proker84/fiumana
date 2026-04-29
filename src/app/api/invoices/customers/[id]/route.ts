/**
 * GET   /api/invoices/customers/[id]   — dettaglio cliente
 * PATCH /api/invoices/customers/[id]   — aggiorna cliente
 * DELETE è volutamente non supportato: i clienti possono essere referenziati da
 *   fatture storiche e cancellarli romperebbe l'integrità referenziale.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQueryOne } from '@/lib/db';
import { rowToCustomer } from '@/lib/fatturapa/db-mapper';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const row = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [Number(params.id)]);
    if (!row) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    return NextResponse.json({ customer: rowToCustomer(row) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const id = Number(params.id);
    const existing = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });

    const body = await req.json();

    const fieldMap: Record<string, string> = {
      tipo: 'tipo',
      ragioneSociale: 'ragione_sociale',
      cognome: 'cognome',
      nome: 'nome',
      codiceFiscale: 'codice_fiscale',
      partitaIva: 'partita_iva',
      nazione: 'nazione',
      indirizzo: 'indirizzo',
      cap: 'cap',
      comune: 'comune',
      provincia: 'provincia',
      email: 'email',
      pec: 'pec',
      codiceDestinatario: 'codice_destinatario',
      notes: 'notes',
    };

    const sets: string[] = [];
    const args: any[] = [];
    for (const [k, col] of Object.entries(fieldMap)) {
      if (k in body) {
        sets.push(`${col} = ?`);
        args.push(body[k]);
      }
    }

    // Auto-aggiorna is_estero se cambia la nazione
    if ('nazione' in body) {
      const nz = String(body.nazione ?? 'IT').toUpperCase();
      sets.push('is_estero = ?');
      args.push(nz !== 'IT' ? 1 : 0);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }

    args.push(id);
    await dbExecute(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, args);
    const updated = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [id]);
    return NextResponse.json({ success: true, customer: rowToCustomer(updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
