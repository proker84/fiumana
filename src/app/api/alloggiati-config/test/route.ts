import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ALLOGGIATI_ENDPOINT } from '@/lib/alloggiati';

/**
 * POST /api/alloggiati-config/test
 * Test connection to Portale Alloggiati
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { username, wskey } = await req.json();

    if (!username || !wskey) {
      return NextResponse.json(
        { error: 'Username e WSKEY sono obbligatori' },
        { status: 400 }
      );
    }

    // Build a test SOAP request to verify credentials
    // Using the "Test" operation if available, or a minimal request
    const testSoapXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <Test xmlns="AlloggiatiService">
      <Utente>${escapeXml(username)}</Utente>
      <Token>${escapeXml(wskey)}</Token>
    </Test>
  </soap:Body>
</soap:Envelope>`;

    // Try to connect to the endpoint
    const response = await fetch(ALLOGGIATI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'AlloggiatiService/Test',
      },
      body: testSoapXml,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseText = await response.text();

    // Check for authentication errors
    if (responseText.includes('Autenticazione fallita') ||
        responseText.includes('credenziali non valide') ||
        responseText.includes('Token non valido')) {
      return NextResponse.json({
        success: false,
        error: 'Credenziali non valide. Verifica username e WSKEY.',
      });
    }

    // Check for SOAP fault
    if (responseText.includes('<soap:Fault>')) {
      const faultMatch = responseText.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
      const faultMessage = faultMatch ? faultMatch[1] : 'Errore sconosciuto';

      // Some faults might be OK for a test (e.g., "no data" is fine)
      if (faultMessage.includes('Nessuna schedina') || faultMessage.includes('no data')) {
        return NextResponse.json({
          success: true,
          message: 'Connessione riuscita! Credenziali valide.',
        });
      }

      return NextResponse.json({
        success: false,
        error: `Errore dal portale: ${faultMessage}`,
      });
    }

    // If we got a 200 response without errors, credentials are likely valid
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Connessione riuscita! Credenziali valide.',
      });
    }

    return NextResponse.json({
      success: false,
      error: `Errore HTTP: ${response.status} ${response.statusText}`,
    });

  } catch (error: any) {
    // Timeout or network error
    if (error.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'Timeout: il Portale Alloggiati non risponde. Riprova più tardi.',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Errore di connessione: ' + error.message,
    });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
