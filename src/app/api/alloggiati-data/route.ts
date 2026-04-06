import { NextRequest, NextResponse } from 'next/server';
import comuniData from '@/data/comuni_alloggiati.json';
import statiData from '@/data/stati_alloggiati.json';

interface Comune {
  codice: string;
  nome: string;
  provincia: string;
}

interface Stato {
  codice: string;
  nome: string;
}

const comuni: Comune[] = comuniData as Comune[];
const stati: Stato[] = statiData as Stato[];

// Documenti (from CSV)
const documenti = [
  { codice: 'IDENT', nome: "CARTA DI IDENTITA'" },
  { codice: 'IDELE', nome: "CARTA IDENTITA' ELETTRONICA" },
  { codice: 'PASOR', nome: 'PASSAPORTO ORDINARIO' },
  { codice: 'PATEN', nome: 'PATENTE DI GUIDA' },
  { codice: 'PASDI', nome: 'PASSAPORTO DIPLOMATICO' },
  { codice: 'PASSE', nome: 'PASSAPORTO DI SERVIZIO' },
];

// Tipo alloggiato
const tipiAlloggiato = [
  { codice: '16', nome: 'OSPITE SINGOLO' },
  { codice: '17', nome: 'CAPO FAMIGLIA' },
  { codice: '18', nome: 'CAPO GRUPPO' },
  { codice: '19', nome: 'FAMILIARE' },
  { codice: '20', nome: 'MEMBRO GRUPPO' },
];

/**
 * GET /api/alloggiati-data
 * Returns comuni, stati, documenti for guest registration form
 *
 * Query params:
 * - type: 'comuni' | 'stati' | 'documenti' | 'tipi' | 'all'
 * - search: search string for filtering comuni/stati
 * - provincia: filter comuni by provincia
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all';
  const search = searchParams.get('search')?.toUpperCase() || '';
  const provincia = searchParams.get('provincia')?.toUpperCase() || '';

  switch (type) {
    case 'comuni': {
      let filtered = comuni;

      if (provincia) {
        filtered = filtered.filter(c => c.provincia === provincia);
      }

      if (search) {
        filtered = filtered.filter(c =>
          c.nome.toUpperCase().includes(search) ||
          c.provincia.includes(search)
        );
      }

      // Limit results to 100 for performance
      return NextResponse.json({
        comuni: filtered.slice(0, 100),
        total: filtered.length,
      });
    }

    case 'stati': {
      let filtered = stati;

      if (search) {
        filtered = filtered.filter(s => s.nome.toUpperCase().includes(search));
      }

      return NextResponse.json({
        stati: filtered.slice(0, 100),
        total: filtered.length,
      });
    }

    case 'documenti':
      return NextResponse.json({ documenti });

    case 'tipi':
      return NextResponse.json({ tipiAlloggiato });

    case 'province': {
      // Get unique province
      const province = [...new Set(comuni.map(c => c.provincia))].sort();
      return NextResponse.json({ province });
    }

    case 'all':
    default:
      return NextResponse.json({
        documenti,
        tipiAlloggiato,
        statiCount: stati.length,
        comuniCount: comuni.length,
        // Italia code for convenience
        italiaCode: '100000100',
      });
  }
}
