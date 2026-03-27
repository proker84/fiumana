import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { nome, cognome, email, telefono, citta_immobile, tipo_immobile, formula_interesse, messaggio } = body;

    if (!nome || !cognome || !email) {
      return NextResponse.json({ error: 'Nome, cognome e email obbligatori' }, { status: 400 });
    }

    const db = getDb();

    db.prepare(`
      INSERT INTO contact_requests (nome, cognome, email, telefono, citta_immobile, tipo_immobile, formula_interesse, messaggio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nome, cognome, email, telefono || null, citta_immobile || null, tipo_immobile || null, formula_interesse || null, messaggio || null);

    return NextResponse.json({ success: true, message: 'Richiesta inviata con successo' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
