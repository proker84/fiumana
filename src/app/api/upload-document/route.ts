import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const guestId = formData.get('guestId') as string;
    const side = formData.get('side') as string; // 'front' or 'back'

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file caricato' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo file non supportato. Usa JPG, PNG, WEBP o PDF' },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File troppo grande. Massimo 10MB' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}_${side}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      path: `/uploads/documents/${filename}`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento: ' + error.message },
      { status: 500 }
    );
  }
}
