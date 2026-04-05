import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
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

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `documents/${uuidv4()}_${side}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      filename: blob.pathname,
      path: blob.url,
      url: blob.url,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento: ' + error.message },
      { status: 500 }
    );
  }
}
