import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQueryOne } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    // Deactivate existing tokens
    await dbExecute('UPDATE cleaning_config SET active = 0');

    // Generate new token
    const token = uuidv4();

    // Insert new config
    await dbExecute(
      'INSERT INTO cleaning_config (access_token, name, active) VALUES (?, ?, 1)',
      [token, 'Staff Pulizie']
    );

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
