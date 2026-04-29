/**
 * GET  /api/invoices/customers   — lista clienti con search & paginazione
 * POST /api/invoices/customers   — crea cliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery, dbQueryOne } from '@/lib/db';
import {
  codiceDestinatarioFor,
  validateCustomerForInvoice,
} from '@/lib/fatturapa/customer-mapper';
import { rowToCustomer } from '@/lib/fatturapa/db-mapper';

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    const where: string[] = [];
    const args: any[] = [];

    if (search) {
      where.push(
        '(cognome LIKE ? OR nome LIKE ? OR ragione_sociale LIKE ? OR partita_iva LIKE ? OR codice_fiscale LIKE ? OR email LIKE ?)',
      );
      const q = `%${search}%`;
      args.push(q, q, q, q, q, q);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await dbQuery(
      `SELECT * FROM customers ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, limit, offset],
    );
    const totalRow = await dbQueryOne(
      `SELECT COUNT(*) AS n FROM customers ${whereSql}`,
      args,
    );

    return NextResponse.json({
      customers: rows.map(rowToCustomer).filter(Boolean),
      total: Number((totalRow as any)?.n ?? 0),
      limit,
      offset,
    });
  } catch (e: any) {
    console.error('GET /api/invoices/customers error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const body = await req.json();
    const tipo = body.tipo === 'PG' ? 'PG' : 'PF';
    const nazione = (body.nazione ?? 'IT').toUpperCase();
    const isEstero = nazione !== 'IT';

    const customer = {
      tipo,
      ragioneSociale: body.ragioneSociale ?? null,
      cognome: body.cognome ?? null,
      nome: body.nome ?? null,
      codiceFiscale: body.codiceFiscale ?? null,
      partitaIva: body.partitaIva ?? null,
      nazione,
      indirizzo: body.indirizzo ?? null,
      cap: body.cap ?? null,
      comune: body.comune ?? null,
      provincia: isEstero ? 'EE' : (body.provincia ?? null),
      email: body.email ?? null,
      pec: body.pec ?? null,
      codiceDestinatario:
        body.codiceDestinatario ??
        codiceDestinatarioFor({ isEstero, codiceSdiFornito: body.codiceDestinatario }),
      sourceGuestId: body.sourceGuestId ?? null,
      notes: body.notes ?? null,
    };

    const validation = validateCustomerForInvoice({
      tipo: customer.tipo as 'PF' | 'PG',
      ragioneSociale: customer.ragioneSociale ?? undefined,
      cognome: customer.cognome ?? undefined,
      nome: customer.nome ?? undefined,
      codiceFiscale: customer.codiceFiscale ?? undefined,
      partitaIva: customer.partitaIva ?? undefined,
      nazione: customer.nazione,
      indirizzo: customer.indirizzo ?? undefined,
      cap: customer.cap ?? undefined,
      comune: customer.comune ?? undefined,
      provincia: customer.provincia ?? undefined,
      email: customer.email ?? undefined,
      pec: customer.pec ?? undefined,
      codiceDestinatario: customer.codiceDestinatario,
    });
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Dati cliente non validi', details: validation.errors, warnings: validation.warnings },
        { status: 400 },
      );
    }

    const result = await dbExecute(
      `INSERT INTO customers (
         tipo, ragione_sociale, cognome, nome, codice_fiscale, partita_iva,
         nazione, indirizzo, cap, comune, provincia, email, pec,
         codice_destinatario, is_estero, source_guest_id, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.tipo,
        customer.ragioneSociale,
        customer.cognome,
        customer.nome,
        customer.codiceFiscale,
        customer.partitaIva,
        customer.nazione,
        customer.indirizzo,
        customer.cap,
        customer.comune,
        customer.provincia,
        customer.email,
        customer.pec,
        customer.codiceDestinatario,
        isEstero ? 1 : 0,
        customer.sourceGuestId,
        customer.notes,
      ],
    );

    const id = Number((result as any).lastInsertRowid ?? 0);
    const created = await dbQueryOne('SELECT * FROM customers WHERE id = ?', [id]);
    return NextResponse.json(
      { success: true, customer: rowToCustomer(created), warnings: validation.warnings },
      { status: 201 },
    );
  } catch (e: any) {
    console.error('POST /api/invoices/customers error:', e);
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
