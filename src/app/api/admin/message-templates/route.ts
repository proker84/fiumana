/**
 * GET  /api/admin/message-templates → lista tutti i template
 * PUT  /api/admin/message-templates → upsert un template (richiede template_key + body)
 *
 * Auth: admin (JWT).
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { dbExecute, dbQuery } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const rows = await dbQuery(
      `SELECT id, template_key, name, description, body, updated_at
         FROM message_templates ORDER BY id ASC`,
    );
    return NextResponse.json({ templates: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  try {
    const body = await req.json();
    const key = String(body.template_key ?? '').trim();
    const newBody = String(body.body ?? '');
    if (!key) {
      return NextResponse.json({ error: 'template_key obbligatorio' }, { status: 400 });
    }
    if (newBody.length > 20000) {
      return NextResponse.json({ error: 'Body troppo lungo (max 20.000 caratteri)' }, { status: 400 });
    }

    const result = await dbExecute(
      `UPDATE message_templates
          SET body = ?, updated_at = CURRENT_TIMESTAMP
          WHERE template_key = ?`,
      [newBody, key],
    );
    if (Number((result as any).rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: `Template ${key} non trovato` }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 });
  }
}
