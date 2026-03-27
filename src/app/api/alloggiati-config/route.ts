import { NextRequest, NextResponse } from 'next/server';
import { dbQueryOne, dbExecute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

/**
 * GET /api/alloggiati-config
 * Get current Alloggiati configuration
 */
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const config = await dbQueryOne(
      'SELECT id, property_id, username, wskey, last_sync FROM alloggiati_config WHERE property_id = 1'
    );

    return NextResponse.json({
      config: config || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alloggiati-config
 * Save Alloggiati configuration
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { property_id = 1, username, wskey } = await req.json();

    if (!username || !wskey) {
      return NextResponse.json(
        { error: 'Username e WSKEY sono obbligatori' },
        { status: 400 }
      );
    }

    // Check if config exists
    const existing = await dbQueryOne(
      'SELECT id FROM alloggiati_config WHERE property_id = ?',
      [property_id]
    );

    if (existing) {
      // Update
      await dbExecute(
        `UPDATE alloggiati_config
         SET username = ?, wskey = ?, last_sync = CURRENT_TIMESTAMP
         WHERE property_id = ?`,
        [username, wskey, property_id]
      );
    } else {
      // Insert
      await dbExecute(
        `INSERT INTO alloggiati_config (property_id, username, wskey, last_sync)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [property_id, username, wskey]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configurazione salvata',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore server: ' + error.message },
      { status: 500 }
    );
  }
}
