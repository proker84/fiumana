'use client';

/**
 * Editor messaggi customer (registrazione, istruzioni check-in, ...).
 * Salva i template nel DB → la dashboard e la lista prenotazioni li leggono
 * a runtime quando copi un messaggio.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Code2,
  Loader2,
} from 'lucide-react';
import { AVAILABLE_VARS, renderTemplate } from '@/lib/messageTemplate';

interface Template {
  id: number;
  template_key: string;
  name: string;
  description: string | null;
  body: string;
  updated_at: string;
}

export default function MessaggiPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const token = document.cookie
        .split('; ')
        .find((c) => c.startsWith('auth_token='))
        ?.split('=')[1];
      const res = await fetch('/api/admin/message-templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
        const initial: Record<string, string> = {};
        for (const t of data.templates ?? []) initial[t.template_key] = t.body;
        setEdits(initial);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplate(key: string) {
    setSaving(key);
    setMessage(null);
    try {
      const token = document.cookie
        .split('; ')
        .find((c) => c.startsWith('auth_token='))
        ?.split('=')[1];
      const res = await fetch('/api/admin/message-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ template_key: key, body: edits[key] ?? '' }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Template "${key}" salvato.` });
        await load();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error ?? 'Errore di salvataggio' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(null);
    }
  }

  // Variabili di esempio per anteprima
  const sampleVars = useMemo(
    () => ({
      firstName: 'Riccardo',
      guestName: 'Riccardo Lolatto',
      guestEmail: 'riccardo@example.com',
      guestLink: 'https://immobiliarefiumana.com/guest/abc-123-token',
      checkIn: '2026-05-21',
      checkOut: '2026-05-25',
      checkInDate: '21 Maggio',
      checkOutDate: '25 Maggio',
      numGuests: 2,
    }),
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-primary-500" />
          Messaggi clienti
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Modifica i testi inviati agli ospiti: link registrazione, istruzioni di
          check-in, comunicazioni varie. Le modifiche sono immediate.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Help variabili */}
      <div className="admin-card mb-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          Variabili disponibili nei template
        </h3>
        <p className="text-xs text-blue-700 mb-3">
          Inserisci le variabili nel testo come <code className="bg-white px-1 rounded">{'{{firstName}}'}</code> —
          al momento della copia messaggio verranno sostituite con i dati reali della prenotazione.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {AVAILABLE_VARS.map((v) => (
            <div key={v.key} className="flex gap-2 items-baseline">
              <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-mono whitespace-nowrap">
                {`{{${v.key}}}`}
              </code>
              <span className="text-gray-600">{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-6">
        {templates.map((t) => {
          const isPreview = previewMode[t.template_key] ?? false;
          const currentBody = edits[t.template_key] ?? t.body;
          const dirty = currentBody !== t.body;
          return (
            <div key={t.id} className="admin-card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{t.name}</h2>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Chiave: <code className="bg-gray-100 px-1 rounded">{t.template_key}</code>
                    {' · '}
                    Aggiornato: {new Date(t.updated_at).toLocaleString('it-IT')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPreviewMode((p) => ({ ...p, [t.template_key]: !isPreview }))
                    }
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1"
                  >
                    {isPreview ? (
                      <>
                        <Code2 className="w-3.5 h-3.5" /> Modifica
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Anteprima
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => saveTemplate(t.template_key)}
                    disabled={!dirty || saving === t.template_key}
                    className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving === t.template_key ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Salvataggio
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Salva
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isPreview ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm whitespace-pre-wrap font-mono text-gray-800">
                  {renderTemplate(currentBody, sampleVars)}
                </div>
              ) : (
                <textarea
                  value={currentBody}
                  onChange={(e) =>
                    setEdits((v) => ({ ...v, [t.template_key]: e.target.value }))
                  }
                  rows={Math.max(8, currentBody.split('\n').length + 1)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm whitespace-pre"
                />
              )}

              {dirty && !isPreview && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Hai modifiche non salvate. Click "Salva" per applicarle.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
