import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM alloggiati_receipts WHERE booking_id = ? ORDER BY created_at DESC`,
      args: [params.id],
    });

    return NextResponse.json({ receipts: result.rows });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ error: 'Errore nel recupero ricevute' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const receiptId = formData.get('receipt_id') as string;
    const sendDate = formData.get('send_date') as string;
    const schedineCount = formData.get('schedine_count') as string;
    const permanenzaDays = formData.get('permanenza_days') as string;
    const questura = formData.get('questura') as string || 'FERRARA';

    if (!file) {
      return NextResponse.json({ error: 'File PDF richiesto' }, { status: 400 });
    }

    if (!receiptId || !sendDate) {
      return NextResponse.json({ error: 'ID ricevuta e data invio richiesti' }, { status: 400 });
    }

    // Upload PDF to Vercel Blob
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `receipts/alloggiati_${params.id}_${Date.now()}.pdf`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    // Save to database
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO alloggiati_receipts
            (booking_id, receipt_id, send_date, schedine_count, permanenza_days, questura, pdf_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        params.id,
        receiptId,
        sendDate,
        parseInt(schedineCount) || 1,
        parseInt(permanenzaDays) || 1,
        questura,
        blob.url,
      ],
    });

    // Update booking alloggiati_sent status
    await db.execute({
      sql: `UPDATE bookings SET alloggiati_sent = 1, alloggiati_sent_at = CURRENT_TIMESTAMP, alloggiati_receipt = ? WHERE id = ?`,
      args: [blob.url, params.id],
    });

    return NextResponse.json({
      success: true,
      message: 'Ricevuta caricata con successo',
      pdf_url: blob.url
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json({ error: 'Errore nel caricamento ricevuta' }, { status: 500 });
  }
}
