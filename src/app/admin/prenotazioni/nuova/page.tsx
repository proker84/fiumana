'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Save,
  Info,
  Eraser,
} from 'lucide-react';
import { parseAirbnbReservation } from '@/lib/parseAirbnbReservation';

interface FormState {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  num_guests: string;
  total_amount: string;
  notes: string;
}

const EMPTY: FormState = {
  booking_id: '',
  guest_name: '',
  guest_email: '',
  check_in: '',
  check_out: '',
  num_guests: '1',
  total_amount: '',
  notes: '',
};

export default function NuovaPrenotazionePage() {
  const [raw, setRaw] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false); // true dopo la prima analisi
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: number; booking_id: string } | null>(null);

  const parsed = useMemo(() => (raw.trim() ? parseAirbnbReservation(raw) : null), [raw]);

  const nights = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(form.check_out)) return null;
    const a = new Date(form.check_in + 'T00:00:00Z').getTime();
    const b = new Date(form.check_out + 'T00:00:00Z').getTime();
    const n = Math.round((b - a) / 86400000);
    return n > 0 ? n : null;
  }, [form.check_in, form.check_out]);

  function applyParsed() {
    if (!parsed) return;
    setForm({
      booking_id: parsed.booking_id,
      guest_name: parsed.guest_name,
      guest_email: '',
      check_in: parsed.check_in,
      check_out: parsed.check_out,
      num_guests: String(parsed.num_guests || 1),
      total_amount: parsed.total_amount != null ? parsed.total_amount.toFixed(2) : '',
      notes: parsed.notes,
    });
    setTouched(true);
    setError(null);
    setSaved(null);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // Analizza subito quello che viene incollato, senza dover premere il pulsante
    const text = e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    setRaw(text);
    const p = parseAirbnbReservation(text);
    setForm({
      booking_id: p.booking_id,
      guest_name: p.guest_name,
      guest_email: '',
      check_in: p.check_in,
      check_out: p.check_out,
      num_guests: String(p.num_guests || 1),
      total_amount: p.total_amount != null ? p.total_amount.toFixed(2) : '',
      notes: p.notes,
    });
    setTouched(true);
    setError(null);
    setSaved(null);
  }

  function reset() {
    setRaw('');
    setForm(EMPTY);
    setTouched(false);
    setError(null);
    setSaved(null);
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSave =
    form.booking_id.trim() &&
    form.guest_name.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.check_in) &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.check_out) &&
    form.check_out > form.check_in &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const token = document.cookie.split('; ').find((c) => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_id: form.booking_id.trim().toUpperCase(),
          guest_name: form.guest_name.trim(),
          guest_email: form.guest_email.trim() || null,
          check_in: form.check_in,
          check_out: form.check_out,
          num_guests: parseInt(form.num_guests, 10) || 1,
          total_amount: form.total_amount.trim() ? Number(form.total_amount.replace(',', '.')) : null,
          notes: form.notes,
          platform: 'airbnb',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Errore durante il salvataggio');
        return;
      }
      setSaved({ id: data.id, booking_id: data.booking_id });
    } catch {
      setError('Errore di connessione al server');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Link
            href="/admin/prenotazioni"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Prenotazioni
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nuova prenotazione</h1>
          <p className="text-gray-500 text-sm mt-1">
            Incolla il testo della scheda prenotazione Airbnb: i campi vengono compilati da soli
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Eraser className="w-4 h-4" />
          Svuota
        </button>
      </div>

      {/* Info */}
      <div className="admin-card mb-6 border-l-4 border-l-blue-500 bg-blue-50/50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="font-medium text-gray-900 text-sm mb-1">Come fare</p>
            Su Airbnb apri <strong>Oggi → In programma</strong>, clicca la prenotazione, seleziona tutto il testo
            della scheda (⌘A) e copialo (⌘C). Incollalo qui sotto: vengono estratti codice di conferma, ospite, date,
            numero ospiti, importo, orari, codice d&apos;accesso e termini di cancellazione. Controlla i campi e salva.
          </div>
        </div>
      </div>

      {saved ? (
        <div className="admin-card mb-6 border-l-4 border-l-green-500 bg-green-50/50">
          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">
                Prenotazione {saved.booking_id} salvata
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Link
                  href={`/admin/prenotazioni/${saved.id}`}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
                >
                  Apri la prenotazione
                </Link>
                <button
                  onClick={reset}
                  className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
                >
                  Inseriscine un&apos;altra
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Testo incollato */}
        <div className="admin-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4 text-primary-500" />
              Testo copiato da Airbnb
            </h2>
            <button
              onClick={applyParsed}
              disabled={!parsed}
              className="px-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 disabled:opacity-40 transition-colors"
            >
              Rianalizza
            </button>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onPaste={handlePaste}
            placeholder={'Incolla qui il testo della scheda prenotazione…\n\nGruppo di Giacomo composto da 2 persone\n16–20 set · 4 notti\nCheck-in\nmer 16 set\n15:00\n…\nConfirmation code\nHMZ5W5R8WH'}
            className="w-full h-[420px] px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-y"
          />

          {parsed && parsed.warnings.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-medium mb-1">
                <AlertTriangle className="w-4 h-4" /> Da controllare
              </div>
              <ul className="text-xs text-amber-800 list-disc pl-5 space-y-0.5">
                {parsed.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed && parsed.warnings.length === 0 && touched && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="w-4 h-4" /> Tutti i campi principali sono stati riconosciuti
            </div>
          )}
        </div>

        {/* Campi estratti */}
        <div className="admin-card">
          <h2 className="font-semibold text-gray-900 mb-4">Dati prenotazione</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Codice di conferma *</label>
              <input value={form.booking_id} onChange={set('booking_id')} className={inputCls + ' font-mono uppercase'} placeholder="HMXXXXXXXX" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome ospite *</label>
              <input value={form.guest_name} onChange={set('guest_name')} className={inputCls} placeholder="Nome e cognome" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Email / contatto (facoltativo)</label>
              <input value={form.guest_email} onChange={set('guest_email')} className={inputCls} placeholder="Non presente nel testo Airbnb" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-in *</label>
              <input type="date" value={form.check_in} onChange={set('check_in')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-out *</label>
              <input type="date" value={form.check_out} onChange={set('check_out')} className={inputCls} />
              {nights != null && (
                <p className="text-[11px] text-gray-500 mt-1">{nights} nott{nights === 1 ? 'e' : 'i'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Numero ospiti</label>
              <input type="number" min={1} value={form.num_guests} onChange={set('num_guests')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Totale Airbnb (guadagno host) €</label>
              <input inputMode="decimal" value={form.total_amount} onChange={set('total_amount')} className={inputCls} placeholder="0,00" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <textarea value={form.notes} onChange={set('notes')} rows={7} className={inputCls + ' resize-y'} />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href="/admin/prenotazioni"
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annulla
            </Link>
            <button
              onClick={handleSave}
              disabled={!canSave || !!saved}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio…' : 'Salva prenotazione'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
