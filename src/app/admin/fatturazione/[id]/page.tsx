'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
  Receipt,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

import {
  canCreateCreditNote,
  canReissue,
  isDeletable,
  isSendable,
  STATO_COLORS,
  STATO_LABELS,
} from '@/lib/fatturapa/state-machine';
import type { InvoiceStato } from '@/lib/fatturapa/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceDetail {
  id: number;
  tipoDocumento: string;
  sezionale: string;
  numero: number | null;
  numeroCompleto: string | null;
  dataDocumento: string;
  dataPagamento: string | null;
  modalitaPagamento: string;
  bookingId: number | null;
  customerId: number;
  parentInvoiceId: number | null;
  imponibileCents: number;
  ivaCents: number;
  totaleCents: number;
  aliquotaIva: number;
  bookingTotalCents: number | null;
  cityTaxCents: number | null;
  airbnbCommissionCents: number | null;
  stato: InvoiceStato;
  markingAcube: string | null;
  externalId: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  ricevutaConsegnaUrl: string | null;
  inviataAt: string | null;
  consegnataAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    rigaNumero: number;
    descrizione: string;
    quantita: number;
    prezzoUnitarioCents: number;
    aliquotaIva: number;
    imponibileCents: number;
    ivaCents: number;
    totaleCents: number;
  }>;
  customer?: {
    id: number;
    tipo: string;
    cognome: string | null;
    nome: string | null;
    ragioneSociale: string | null;
    codiceFiscale: string | null;
    partitaIva: string | null;
    nazione: string;
    indirizzo: string | null;
    cap: string | null;
    comune: string | null;
    provincia: string | null;
    email: string | null;
    pec: string | null;
    codiceDestinatario: string;
    isEstero: boolean;
  };
}

interface SdiLog {
  id: number;
  eventType: string;
  eventAt: string;
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawXmlUrl: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthToken() {
  if (typeof document === 'undefined') return '';
  return (
    document.cookie.split('; ').find((c) => c.startsWith('auth_token='))?.split('=')[1] ?? ''
  );
}

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAuthToken()}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...init, headers });
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

function fmtDate(iso: string | null) {
  if (!iso) return '-';
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('it-IT');
}

const MODALITA_PAG_LABELS: Record<string, string> = {
  MP01: 'Contanti',
  MP02: 'Assegno',
  MP03: 'Assegno circolare',
  MP05: 'Bonifico',
  MP08: 'Carta',
  MP19: 'SEPA Direct Debit',
};

function StatoPill({ stato }: { stato: InvoiceStato }) {
  const c = STATO_COLORS[stato];
  const cls =
    c === 'green'
      ? 'bg-green-50 text-green-700 ring-green-200'
      : c === 'red'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : c === 'amber'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : c === 'blue'
            ? 'bg-blue-50 text-blue-700 ring-blue-200'
            : 'bg-gray-100 text-gray-600 ring-gray-200';
  const Icon =
    c === 'green'
      ? CheckCircle2
      : c === 'red'
        ? XCircle
        : c === 'amber'
          ? AlertCircle
          : c === 'blue'
            ? Clock
            : FileText;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ring-1 ${cls}`}
    >
      <Icon className="w-4 h-4" />
      {STATO_LABELS[stato]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagina
// ─────────────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [logs, setLogs] = useState<SdiLog[]>([]);
  const [message, setMessage] = useState<
    { type: 'success' | 'error' | 'info'; text: string } | null
  >(null);
  const [activeTab, setActiveTab] = useState<'documento' | 'log'>('documento');

  // Modal
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ invoice: InvoiceDetail; logs: SdiLog[] }>(
        `/api/invoices/${id}`,
      );
      setInvoice(data.invoice);
      setLogs(data.logs);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function sendInvoice() {
    setSending(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ invoice: InvoiceDetail; provider: string; externalId: string }>(
        `/api/invoices/${id}/send`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      setShowSendConfirm(false);
      setMessage({
        type: 'success',
        text: `Inviata via ${data.provider}. UUID SDI: ${data.externalId}`,
      });
      void load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSending(false);
    }
  }

  async function syncFromAcube() {
    setPolling(true);
    setMessage(null);
    try {
      const data = await apiFetch<{
        invoice: InvoiceDetail;
        acubeMarking: string;
        sdiOutcome: string | null;
        message: string;
      }>(`/api/invoices/${id}/poll`, { method: 'POST', body: JSON.stringify({}) });
      setMessage({ type: 'success', text: data.message });
      void load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setPolling(false);
    }
  }

  async function deleteInvoice() {
    try {
      await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' });
      router.push('/admin/fatturazione');
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-500">Fattura non trovata</p>
        <Link href="/admin/fatturazione" className="text-primary-600 hover:underline mt-2 inline-block">
          Torna alle fatture
        </Link>
      </div>
    );
  }

  const c = invoice.customer;
  const customerName =
    c?.ragioneSociale ?? [c?.cognome, c?.nome].filter(Boolean).join(' ').trim() ?? '-';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {invoice.tipoDocumento === 'TD04' ? 'Nota di credito' : 'Fattura'}{' '}
              {invoice.numeroCompleto ?? `(bozza #${invoice.id})`}
            </h1>
            <StatoPill stato={invoice.stato} />
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Emessa il {fmtDate(invoice.dataDocumento)} · cliente {customerName}
          </p>
        </div>

        {/* Azioni a destra */}
        <div className="flex gap-2">
          {isSendable(invoice.stato) && (
            <button
              onClick={() => setShowSendConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Invia al SDI
            </button>
          )}
          {invoice.externalId && (
            <>
              <button
                onClick={syncFromAcube}
                disabled={polling}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 text-sm font-medium disabled:opacity-50"
                title="Pulla lo stato direttamente dal provider SDI (fallback se i webhook non arrivano)"
              >
                {polling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sincronizza stato SDI
              </button>
              <button
                onClick={load}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Aggiorna
              </button>
            </>
          )}
          {isDeletable(invoice.stato) && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          )}
        </div>
      </div>

      {/* Messaggio */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 mb-6 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : message.type === 'info'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="break-all">{message.text}</span>
        </div>
      )}

      {/* External info */}
      {invoice.externalId && (
        <div className="admin-card mb-6 flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">UUID SDI</span>
            <p className="font-mono text-gray-700 mt-0.5 flex items-center gap-2">
              {invoice.externalId.slice(0, 8)}…{invoice.externalId.slice(-8)}
              <button
                onClick={() => navigator.clipboard?.writeText(invoice.externalId!)}
                className="text-gray-300 hover:text-gray-600"
                title="Copia UUID intero"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Marking SDI</span>
            <p className="text-gray-700 mt-0.5">{invoice.markingAcube ?? '-'}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Inviata</span>
            <p className="text-gray-700 mt-0.5">{fmtDateTime(invoice.inviataAt)}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Consegnata</span>
            <p className="text-gray-700 mt-0.5">{fmtDateTime(invoice.consegnataAt)}</p>
          </div>
          {invoice.ricevutaConsegnaUrl && (
            <a
              href={invoice.ricevutaConsegnaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-primary-600 hover:underline text-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Ricevuta XML
            </a>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100">
        {(['documento', 'log'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === t
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'documento' ? 'Documento' : `Log SDI (${logs.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'documento' && (
        <>
          {/* Cliente + dettagli */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Cliente */}
            <div className="admin-card">
              <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
              <dl className="text-sm space-y-2">
                <Row label="Nome" value={customerName} />
                {c?.codiceFiscale && <Row label="Cod. Fiscale" value={c.codiceFiscale} mono />}
                {c?.partitaIva && <Row label="P.IVA" value={c.partitaIva} mono />}
                <Row label="Codice destinatario" value={c?.codiceDestinatario ?? '-'} mono />
                {c?.email && <Row label="Email" value={c.email} />}
                {c?.pec && <Row label="PEC" value={c.pec} />}
                <Row
                  label="Indirizzo"
                  value={[
                    c?.indirizzo,
                    c?.cap,
                    c?.comune,
                    c?.provincia,
                    c?.nazione,
                  ]
                    .filter(Boolean)
                    .join(', ') || '-'}
                />
              </dl>
            </div>

            {/* Dettagli documento */}
            <div className="admin-card">
              <h3 className="font-semibold text-gray-900 mb-4">Dettagli documento</h3>
              <dl className="text-sm space-y-2">
                <Row label="Tipo" value={invoice.tipoDocumento} />
                <Row label="Sezionale" value={invoice.sezionale} />
                <Row label="Data documento" value={fmtDate(invoice.dataDocumento)} />
                <Row label="Data pagamento" value={fmtDate(invoice.dataPagamento)} />
                <Row
                  label="Modalità pagamento"
                  value={`${invoice.modalitaPagamento} — ${
                    MODALITA_PAG_LABELS[invoice.modalitaPagamento] ?? '?'
                  }`}
                />
                {invoice.bookingId && (
                  <Row
                    label="Prenotazione"
                    value={
                      <Link
                        href={`/admin/prenotazioni/${invoice.bookingId}`}
                        className="text-primary-600 hover:underline inline-flex items-center gap-1"
                      >
                        #{invoice.bookingId}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    }
                  />
                )}
              </dl>
            </div>
          </div>

          {/* Righe */}
          <div className="admin-card mb-6 p-0 overflow-hidden">
            <h3 className="font-semibold text-gray-900 px-5 pt-5">Righe</h3>
            <table className="w-full mt-4">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                  <th className="px-5 py-2 w-10">#</th>
                  <th className="px-5 py-2">Descrizione</th>
                  <th className="px-5 py-2 text-right">Q.tà</th>
                  <th className="px-5 py-2 text-right">Prezzo unit.</th>
                  <th className="px-5 py-2 text-right">IVA %</th>
                  <th className="px-5 py-2 text-right">Imponibile</th>
                  <th className="px-5 py-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-5 py-3 text-sm text-gray-500">{it.rigaNumero}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{it.descrizione}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700">
                      {it.quantita.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700">
                      {fmtMoney(it.prezzoUnitarioCents)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700">
                      {it.aliquotaIva.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700">
                      {fmtMoney(it.imponibileCents)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-medium text-gray-900">
                      {fmtMoney(it.totaleCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totali */}
          <div className="admin-card max-w-md ml-auto mb-6">
            <dl className="text-sm space-y-2">
              <Row label="Imponibile" value={fmtMoney(invoice.imponibileCents)} />
              <Row
                label={`IVA ${invoice.aliquotaIva.toFixed(0)}%`}
                value={fmtMoney(invoice.ivaCents)}
              />
              <div className="border-t border-gray-100 pt-2 mt-2">
                <Row
                  label={<strong className="text-gray-900">Totale documento</strong>}
                  value={
                    <strong className="text-lg text-gray-900">
                      {fmtMoney(invoice.totaleCents)}
                    </strong>
                  }
                />
              </div>
              {invoice.bookingTotalCents != null && (
                <div className="border-t border-gray-100 pt-2 mt-2 text-xs text-gray-500 space-y-1">
                  <Row
                    label="Totale ospite (booking)"
                    value={fmtMoney(invoice.bookingTotalCents)}
                  />
                  {invoice.cityTaxCents != null && invoice.cityTaxCents > 0 && (
                    <Row
                      label="Tasse soggiorno (escluse)"
                      value={`-${fmtMoney(invoice.cityTaxCents)}`}
                    />
                  )}
                  {invoice.airbnbCommissionCents != null &&
                    invoice.airbnbCommissionCents > 0 && (
                      <Row
                        label="Commissione Airbnb (info)"
                        value={fmtMoney(invoice.airbnbCommissionCents)}
                      />
                    )}
                </div>
              )}
            </dl>
          </div>
        </>
      )}

      {activeTab === 'log' && (
        <div className="admin-card p-0 overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Nessun evento registrato
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                  <th className="px-4 py-2.5">Quando</th>
                  <th className="px-4 py-2.5">Evento</th>
                  <th className="px-4 py-2.5">HTTP</th>
                  <th className="px-4 py-2.5">Errore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                      {fmtDateTime(l.eventAt)}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <code className="text-xs px-2 py-0.5 bg-gray-100 rounded">{l.eventType}</code>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{l.httpStatus ?? '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-red-600">
                      {l.errorMessage ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Send confirm modal ─────────────────────────────────────────────── */}
      {showSendConfirm && (
        <Modal title="Invia al SDI" onClose={() => !sending && setShowSendConfirm(false)}>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              Stai per trasmettere la fattura al SDI tramite il provider configurato. Il numero
              progressivo verrà assegnato automaticamente prima dell'invio. L'operazione non è
              annullabile.
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1">
            <div>
              <strong>Cliente:</strong> {customerName}
            </div>
            <div>
              <strong>Totale:</strong> {fmtMoney(invoice.totaleCents)}
            </div>
            <div>
              <strong>Codice destinatario:</strong>{' '}
              <code>{c?.codiceDestinatario ?? '-'}</code>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSendConfirm(false)}
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Annulla
            </button>
            <button
              onClick={sendInvoice}
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Conferma e invia
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm modal ───────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <Modal title="Elimina bozza" onClose={() => setShowDeleteConfirm(false)}>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              Stai per eliminare definitivamente la bozza. L'operazione non è annullabile.
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Annulla
            </button>
            <button
              onClick={deleteInvoice}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
            >
              Elimina definitivamente
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  mono,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
