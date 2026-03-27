import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  // Only admins can view documents
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const filename = params.filename;

  // Validate filename (prevent directory traversal)
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Nome file non valido' }, { status: 400 });
  }

  const filepath = path.join(process.cwd(), 'uploads', 'documents', filename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: 'File non trovato' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filepath);

    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'heic': 'image/heic',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Errore lettura file: ' + error.message },
      { status: 500 }
    );
  }
}
