import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const requests = await dbQuery(
      'SELECT * FROM contact_requests ORDER BY created_at DESC'
    );

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
