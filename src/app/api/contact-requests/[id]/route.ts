import { NextRequest, NextResponse } from 'next/server';
import { dbExecute } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { letto } = await req.json();

    await dbExecute(
      'UPDATE contact_requests SET letto = ? WHERE id = ?',
      [letto, params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    await dbExecute('DELETE FROM contact_requests WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
