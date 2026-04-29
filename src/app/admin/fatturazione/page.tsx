'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  PackageX,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  XCircle,
} from 'lucide-react';

import {
  isFinal,
  STATO_COLORS,
  STATO_LABELS,
} from '@/lib/fatturapa/state-machine';
import type { InvoiceStato } from '@/lib/fatturapa/types';

// ─────────────────────────────────────────────────────────────────────────────
// Tipi locali
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceListItem {
  id: number;
  tipoDocumento: string;
  sezionale: string;
  numero: number | null;
  numeroCompleto: string | null;
  dataDocumento: string;
  imponibileCents: number;
  ivaCents: number;
  totaleCents: number;
  stato: InvoiceStato;
  markingAcube: string | null;
  bookingId: number | null;
  customer?: {
    id: number;
    cognome: string | null;
    nome: string | null;
    ragioneSociale: string | null;
    nazione: string;
    isEstero: boolean;
    email: string | null;
    codiceDestinatario: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthToken() {
  if (typeof document === 'undefined') return '';
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('auth_token='))
      ?.split('=')[1] ?? ''
  );
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? `HTTP ${res.status}`);
  return data as T;
}

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

function customerLabel(c?: InvoiceListItem['customer']) {
  if (!c) return '-';
  if (c.ragioneSociale) return c.ragioneSociale;
  return [c.cognome, c.nome].filter(Boolean).join(' ').trim() || '-';
}

function StatoBadge({ stato }: { stato: InvoiceStato }) {
  const color = STATO_COLORS[stato];
  const label = STATO_LABELS[stato];
  const cls =
    color === 'green'
      ? 'bg-green-50 text-green-700 ring-green-200'
      : color === 'red'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : color === 'amber'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : color === 'blue'
            ? 'bg-blue-50 text-blue-700 ring-blue-200'
            : 'bg-gray-100 text-gray-600 ring-gray-200';
  const Icon =
    color === 'green'
      ? CheckCircle2
      : color === 'red'
        ? XCircle
        : color === 'amber'
          ? AlertCircle
          : color === 'blue'
            ? Clock
            : FileText;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagina
// ─────────────────────────────────────────────────────────────────────────────

const STATI_FILTRABILI: InvoiceStato[] = [
  'bozza',
  'in_invio',
  'accettata_acube',
  'quarantena',
  'inviata_sdi',
  'consegnata',
  'mancata_consegna',
  'scartata',
  'errore_invio',
];

export default function FatturazioneListaPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filtri
  const [search, setSearch] = useState('');
  const [stato, setStato] = useState<InvoiceStato | ''>('');
  const [dataDa, setDataDa] = useState('');
  const [dataA, setDataA] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'TD01' | 'TD04' | ''>('');

  // Paginazione
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stato, dataDa, dataA, tipoDocumento, offset]);

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stato) params.set('stato', stato);
      if (dataDa) params.set('dataDa', dataDa);
      if (dataA) params.set('dataA', dataA);
      if (tipoDocumento) params.set('tipoDocumento', tipoDocumento);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const data = await apiFetch<{
        invoices: InvoiceListItem[];
        total: number;
      }>(`/api/invoices?${params.toString()}`);
      setInvoices(data.invoices);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message ?? 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setOffset(0);
    void fetchList();
  }

  function resetFilters() {
    setSearch('');
    setStato('');
    setDataDa('');
    setDataA('');
    setTipoDocumento('');
    setOffset(0);
  }

  // Aggregati
  const aggregati = useMemo(() => {
    let totFatture = 0;
    let totNoteCredito = 0;
    let totConsegnate = 0;
    for (const i of invoices) {
      if (i.tipoDocumento === 'TD04') totNoteCredito += i.totaleCents;
      else totFatture += i.totaleCents;
      if (i.stato === 'consegnata' || i.stato === 'mancata_consegna')
        totConsegnate += i.totaleCents;
    }
    return { totFatture, totNoteCredito, totConsegnate };
  }, [invoices]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="w-7 h-7 text-primary-500" />
            Fatturazione
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Fatture attive emesse via ACube → SDI
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/fatturazione/clienti"
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Clienti
          </Link>
          <Link
            href="/admin/fatturazione/impostazioni"
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Impostazioni
          </Link>
        </div>
      </div>

      {/* Aggregati */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card label="Totale fatture (pagina)" value={fmtMoney(aggregati.totFatture)} color="primary" />
        <Card
          label="Note di credito (pagina)"
          value={fmtMoney(aggregati.totNoteCredito)}
          color="amber"
        />
        <Card label="Consegnate / MC" value={fmtMoney(aggregati.totConsegnate)} color="green" />
      </div>

      {/* Filtri */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-700 text-sm">Filtri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per numero, cliente, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <select
            value={stato}
            onChange={(e) => setStato(e.target.value as InvoiceStato | '')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">Tutti gli stati</option>
            {STATI_FILTRABILI.map((s) => (
              <option key={s} value={s}>
                {STATO_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">Tutti i tipi</option>
            <option value="TD01">Fattura</option>
            <option value="TD04">Nota di credito</option>
          </select>
          <input
            type="date"
            value={dataDa}
            onChange={(e) => setDataDa(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            placeholder="Da"
          />
          <input
            type="date"
            value={dataA}
            onChange={(e) => setDataA(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            placeholder="A"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            Applica
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Reset
          </button>
          <button
            onClick={fetchList}
            className="ml-auto px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Ricarica
          </button>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabella */}
      <div className="admin-card overflow-hidden p-0">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <PackageX className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nessuna fattura trovata</p>
            <p className="text-xs text-gray-400 mt-1">
              Crea una fattura partendo da una prenotazione
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Totale</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {fmtDate(inv.dataDocumento)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {inv.numeroCompleto ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {inv.tipoDocumento === 'TD04' ? (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">NC</span>
                    ) : (
                      <span className="text-gray-600">{inv.tipoDocumento}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-gray-900">{customerLabel(inv.customer)}</div>
                    {inv.customer?.email && (
                      <div className="text-xs text-gray-400">{inv.customer.email}</div>
                    )}
                    {inv.customer?.isEstero && (
                      <div className="text-xs text-blue-600 font-medium">
                        Estero ({inv.customer.nazione})
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                    {fmtMoney(inv.totaleCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatoBadge stato={inv.stato} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/fatturazione/${inv.id}`}
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginazione */}
        {!loading && invoices.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              {offset + 1}–{Math.min(offset + limit, total)} di {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'primary' | 'green' | 'amber';
}) {
  const cls =
    color === 'green'
      ? 'from-green-50 to-green-100 text-green-700'
      : color === 'amber'
        ? 'from-amber-50 to-amber-100 text-amber-700'
        : 'from-primary-50 to-primary-100 text-primary-700';
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${cls} p-5`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
