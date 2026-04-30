'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Hash,
  Info,
  Key,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Tipi locali (specchio della GET API)
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsView {
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale: string;
  regimeFiscale: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
  iban: string | null;
  rea: string | null;
  capitaleSocialeCents: number | null;
  pecEmittente: string | null;
  senderProvider: 'acube' | 'openapi' | 'mock' | null;
  senderEndpoint: string | null;
  senderTestMode: boolean;
  senderApiKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  webhookSecretMasked: string | null;
  acubeBusinessRegistryUuid: string | null;
  acubeNumberingSequenceUuid: string | null;
  acubeNumberingSequenceName: string;
  acubeCreditNoteSequenceUuid: string | null;
  acubeCreditNoteSequenceName: string;
  conservazioneProvider: string | null;
  tassaSoggiornoDefaultCents: number;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAuthToken(): string {
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

function generateRandomBase64Url(bytes = 32): string {
  // Genera nel browser via crypto.getRandomValues
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagina
// ─────────────────────────────────────────────────────────────────────────────

export default function FatturazioneImpostazioniPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [message, setMessage] = useState<
    { type: 'success' | 'error' | 'info'; text: string } | null
  >(null);

  // Form state — solo i campi modificabili
  const [form, setForm] = useState<Partial<SettingsView> & { senderApiKey?: string }>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Webhook secret state separato: generato localmente, mostrato in chiaro,
  // poi salvato esplicitamente dall'admin con un bottone dedicato.
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [savingWebhookSecret, setSavingWebhookSecret] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const data = await apiFetch<{ settings: SettingsView }>('/api/invoices/settings');
      setSettings(data.settings);
      setForm({
        ragioneSociale: data.settings.ragioneSociale,
        partitaIva: data.settings.partitaIva,
        codiceFiscale: data.settings.codiceFiscale,
        regimeFiscale: data.settings.regimeFiscale,
        indirizzo: data.settings.indirizzo,
        cap: data.settings.cap,
        comune: data.settings.comune,
        provincia: data.settings.provincia,
        nazione: data.settings.nazione,
        iban: data.settings.iban,
        rea: data.settings.rea,
        pecEmittente: data.settings.pecEmittente,
        senderProvider: data.settings.senderProvider ?? 'openapi',
        senderEndpoint: data.settings.senderEndpoint,
        senderTestMode: data.settings.senderTestMode,
        acubeBusinessRegistryUuid: data.settings.acubeBusinessRegistryUuid,
        acubeNumberingSequenceUuid: data.settings.acubeNumberingSequenceUuid,
        acubeNumberingSequenceName: data.settings.acubeNumberingSequenceName,
        acubeCreditNoteSequenceUuid: data.settings.acubeCreditNoteSequenceUuid,
        acubeCreditNoteSequenceName: data.settings.acubeCreditNoteSequenceName,
        tassaSoggiornoDefaultCents: data.settings.tassaSoggiornoDefaultCents,
      });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Errore caricamento impostazioni' });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body: any = { ...form };
      // Rimuoviamo campi vuoti per non sovrascrivere con stringhe vuote dove non serve
      if (!body.senderApiKey) delete body.senderApiKey;

      const data = await apiFetch<{ settings: SettingsView }>('/api/invoices/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setSettings(data.settings);
      setForm((f) => ({ ...f, senderApiKey: '' })); // clear campo password dopo save
      setMessage({ type: 'success', text: 'Impostazioni salvate.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Errore salvataggio' });
    } finally {
      setSaving(false);
    }
  }

  function generateWebhookSecretLocal() {
    const secret = generateRandomBase64Url(32);
    setNewWebhookSecret(secret);
    setShowWebhookSecret(true);
    // copia agli appunti per comodità (non bloccante)
    navigator.clipboard?.writeText(secret).catch(() => undefined);
    setMessage({
      type: 'info',
      text:
        'Secret generato (copiato negli appunti). Verifica il valore qui sotto e poi clicca "Salva webhook secret".',
    });
  }

  async function saveWebhookSecret() {
    if (!newWebhookSecret) {
      setMessage({ type: 'error', text: 'Genera prima un secret.' });
      return;
    }
    setSavingWebhookSecret(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ settings: SettingsView }>('/api/invoices/settings', {
        method: 'PATCH',
        body: JSON.stringify({ webhookSecret: newWebhookSecret }),
      });
      setSettings(data.settings);
      setMessage({
        type: 'success',
        text:
          'Webhook secret salvato. Adesso usalo come "Authentication token" (con prefisso "Bearer ") nelle 5 ApiConfiguration ACube.',
      });
      // teniamo il valore in chiaro a video finché l'admin non chiude la pagina,
      // così può copiarlo se l'aveva perso dagli appunti
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Errore salvataggio' });
    } finally {
      setSavingWebhookSecret(false);
    }
  }

  const tassaSoggiornoEur = useMemo(() => {
    return ((form.tassaSoggiornoDefaultCents ?? 0) / 100).toFixed(2);
  }, [form.tassaSoggiornoDefaultCents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary-500" />
          Fatturazione — Impostazioni
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Anagrafica emittente, credenziali ACube, numerazione e webhook
        </p>
      </div>

      {/* Messaggio globale */}
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
          ) : message.type === 'info' ? (
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="break-all">{message.text}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Anagrafica emittente */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <Hash className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Anagrafica emittente</h2>
            <p className="text-sm text-gray-500">Dati che compariranno come Cedente nella fattura</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Ragione sociale"
            value={form.ragioneSociale ?? ''}
            onChange={(v) => setForm({ ...form, ragioneSociale: v })}
            required
          />
          <Field
            label="Regime fiscale"
            value={form.regimeFiscale ?? 'RF01'}
            onChange={(v) => setForm({ ...form, regimeFiscale: v })}
            placeholder="RF01"
            help="RF01 = ordinario; RF19 = forfetario"
          />
          <Field
            label="Partita IVA"
            value={form.partitaIva ?? ''}
            onChange={(v) => setForm({ ...form, partitaIva: v })}
            placeholder="01340960481"
            required
          />
          <Field
            label="Codice fiscale"
            value={form.codiceFiscale ?? ''}
            onChange={(v) => setForm({ ...form, codiceFiscale: v })}
            placeholder="01340960481"
            required
          />
          <Field
            label="Indirizzo"
            value={form.indirizzo ?? ''}
            onChange={(v) => setForm({ ...form, indirizzo: v })}
            className="md:col-span-2"
          />
          <Field label="CAP" value={form.cap ?? ''} onChange={(v) => setForm({ ...form, cap: v })} />
          <Field
            label="Comune"
            value={form.comune ?? ''}
            onChange={(v) => setForm({ ...form, comune: v })}
          />
          <Field
            label="Provincia (sigla)"
            value={form.provincia ?? ''}
            onChange={(v) => setForm({ ...form, provincia: v.toUpperCase().slice(0, 2) })}
            placeholder="PO"
          />
          <Field
            label="Nazione (ISO)"
            value={form.nazione ?? 'IT'}
            onChange={(v) => setForm({ ...form, nazione: v.toUpperCase().slice(0, 2) })}
          />
          <Field
            label="REA (es. PO-480791)"
            value={form.rea ?? ''}
            onChange={(v) => setForm({ ...form, rea: v })}
          />
          <Field
            label="PEC emittente"
            value={form.pecEmittente ?? ''}
            onChange={(v) => setForm({ ...form, pecEmittente: v })}
            type="email"
            placeholder="immobiliarefiumana@pec.it"
          />
          <Field
            label="IBAN (opzionale, mostrato in fattura)"
            value={form.iban ?? ''}
            onChange={(v) => setForm({ ...form, iban: v })}
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Provider SDI */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Provider SDI</h2>
            <p className="text-sm text-gray-500">
              Credenziali API e configurazione invio al Sistema di Interscambio
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>Openapi SDI</strong>: pay-per-use 0,06 €/fattura inclusa
              conservazione, ottimo per piccoli volumi.{' '}
              <strong>ACube</strong>: enterprise con piano custom, adatto a chi ha
              1000+ fatture/anno. <strong>Mock</strong>: solo per dev, non invia
              davvero.
            </p>
            <p>
              In <strong>test mode</strong> le fatture restano nel sandbox e non vengono
              inoltrate al vero SDI. Disabilita solo quando hai validato il flusso completo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider SDI
            </label>
            <select
              value={form.senderProvider ?? 'openapi'}
              onChange={(e) => {
                const next = e.target.value as 'acube' | 'openapi' | 'mock';
                // Se l'utente sta cambiando provider e l'endpoint corrisponde al
                // default del provider precedente, aggiorniamo l'endpoint al
                // default del nuovo provider. Altrimenti rispettiamo l'override.
                const acubeDefault = 'https://api-sandbox.acubeapi.com';
                const openapiDefault = 'https://test.sdi.openapi.it';
                const current = form.senderEndpoint ?? '';
                let nextEndpoint = current;
                if (
                  current === '' ||
                  current === acubeDefault ||
                  current === openapiDefault
                ) {
                  if (next === 'acube') nextEndpoint = acubeDefault;
                  else if (next === 'openapi') nextEndpoint = openapiDefault;
                }
                setForm({
                  ...form,
                  senderProvider: next,
                  senderEndpoint: nextEndpoint,
                });
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
            >
              <option value="acube">A-Cube API</option>
              <option value="openapi">Openapi SDI</option>
              <option value="mock">Mock (solo dev)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Seleziona quale gateway usare per inviare le fatture al SDI.
            </p>
          </div>

          <Field
            label="Endpoint API"
            value={form.senderEndpoint ?? ''}
            onChange={(v) => setForm({ ...form, senderEndpoint: v })}
            placeholder={
              form.senderProvider === 'acube'
                ? 'https://api-sandbox.acubeapi.com'
                : 'https://test.sdi.openapi.it'
            }
            className="md:col-span-2"
          />

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.senderTestMode}
                onChange={(e) => setForm({ ...form, senderTestMode: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                <strong>Test mode</strong> — usa endpoint sandbox, non invia al SDI reale
              </span>
            </label>
          </div>

          <Field
            label="Username/Email API"
            value={(form as any).senderUsername ?? ''}
            onChange={(v) => setForm({ ...form, ...({ senderUsername: v } as any) })}
            placeholder="immobiliarefiumana@gmail.com"
            type="email"
            help={
              form.senderProvider === 'acube'
                ? 'Memorizzata in env (.env.local) come ACUBE_USERNAME — non salvata nel DB'
                : 'Memorizzata in env (.env.local) come OPENAPI_USERNAME — non salvata nel DB'
            }
            disabled
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password/API key{' '}
              {settings?.senderApiKeyConfigured && (
                <span className="text-xs text-green-700 ml-2">✓ già configurata</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={form.senderApiKey ?? ''}
                onChange={(e) => setForm({ ...form, senderApiKey: e.target.value })}
                placeholder={
                  settings?.senderApiKeyConfigured
                    ? '••••••••• (lascia vuoto per non modificare)'
                    : 'Inserisci la password'
                }
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Cifrata AES-256-GCM nel DB. Mai esposta in risposta API.
            </p>
          </div>

          <Field
            label="UUID Business Registry Configuration"
            value={form.acubeBusinessRegistryUuid ?? ''}
            onChange={(v) => setForm({ ...form, acubeBusinessRegistryUuid: v })}
            placeholder="01940abc-1234-7def-..."
            help="Lo trovi nella pagina /business-registry-configurations della dashboard ACube"
            className="md:col-span-2"
            mono
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Sequenze numerazione */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Sequenze numerazione</h2>
            <p className="text-sm text-gray-500">
              ACube gestisce la numerazione progressiva delle fatture
            </p>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-700 space-y-2">
            <p>
              Format consigliato:{' '}
              <code className="bg-white px-1.5 py-0.5 rounded">%Y/AIR/%04s</code> →{' '}
              produrrà <code>2026/AIR/0001</code>, <code>2026/AIR/0002</code>...
            </p>
            <p>
              Il counter incrementa solo a invio andato a buon fine, niente buchi. Reset
              automatico al 1° gennaio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Nome sequenza fatture"
            value={form.acubeNumberingSequenceName ?? ''}
            onChange={(v) => setForm({ ...form, acubeNumberingSequenceName: v })}
            placeholder="FiumanaAIR"
          />
          <Field
            label="UUID sequenza fatture"
            value={form.acubeNumberingSequenceUuid ?? ''}
            onChange={(v) => setForm({ ...form, acubeNumberingSequenceUuid: v })}
            placeholder="(verrà popolato al primo invio)"
            mono
          />
          <Field
            label="Nome sequenza note di credito"
            value={form.acubeCreditNoteSequenceName ?? ''}
            onChange={(v) => setForm({ ...form, acubeCreditNoteSequenceName: v })}
            placeholder="FiumanaAIRNC"
          />
          <Field
            label="UUID sequenza note di credito"
            value={form.acubeCreditNoteSequenceUuid ?? ''}
            onChange={(v) => setForm({ ...form, acubeCreditNoteSequenceUuid: v })}
            placeholder="(verrà popolato alla prima nota di credito)"
            mono
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Webhook secret */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Webhook secret</h2>
            <p className="text-sm text-gray-500">
              Token bearer che ACube invierà nei webhook in ingresso
            </p>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            Genera un token nuovo qui, poi vai su{' '}
            <a
              href="https://dashboard-sandbox.acubeapi.com/api-configurations"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline inline-flex items-center gap-1"
            >
              ApiConfiguration <ExternalLink className="w-3 h-3" />
            </a>{' '}
            e crea 5 webhook (uno per evento) con
            <code className="bg-white px-1.5 mx-1 rounded">authentication_type = header</code>,{' '}
            <code className="bg-white px-1.5 mx-1 rounded">authentication_key = Authorization</code>
            {' '}e{' '}
            <code className="bg-white px-1.5 mx-1 rounded">authentication_token = Bearer &lt;questo token&gt;</code>.
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stato attuale
            </label>
            <div className="flex items-center gap-3">
              {settings?.webhookSecretConfigured ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-mono">
                    Configurato — {settings.webhookSecretMasked}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Nessun webhook secret configurato
                </div>
              )}
            </div>
          </div>

          {/* Campo input con secret in chiaro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuovo webhook secret
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={newWebhookSecret}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
                placeholder="Click 'Genera' per crearne uno nuovo, oppure incolla un valore esistente"
                className="w-full px-4 py-2.5 pr-24 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {newWebhookSecret && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard?.writeText(newWebhookSecret).catch(() => undefined)
                      }
                      className="p-1.5 text-gray-400 hover:text-gray-700"
                      title="Copia"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret((v) => !v)}
                      className="p-1.5 text-gray-400 hover:text-gray-700"
                    >
                      {showWebhookSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Salvato cifrato nel DB. Il valore in chiaro è visibile solo finché non
              esci da questa pagina — copialo subito.
            </p>
          </div>

          {/* Bottoni Genera + Salva */}
          <div className="flex gap-2">
            <button
              onClick={generateWebhookSecretLocal}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-amber-300 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              {settings?.webhookSecretConfigured
                ? 'Rigenera (non salva)'
                : 'Genera (non salva)'}
            </button>
            <button
              onClick={saveWebhookSecret}
              type="button"
              disabled={!newWebhookSecret || savingWebhookSecret}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingWebhookSecret ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salva webhook secret
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Default città/tassa soggiorno */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Tassa di soggiorno default</h2>
            <p className="text-sm text-gray-500">
              Tariffa per notte/persona usata quando non specificata sul booking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tariffa (€/notte/persona)
            </label>
            <input
              type="number"
              step="0.10"
              min="0"
              value={tassaSoggiornoEur}
              onChange={(e) =>
                setForm({
                  ...form,
                  tassaSoggiornoDefaultCents: Math.round(
                    Number(e.target.value || 0) * 100,
                  ),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Es. 2,00 €/notte/persona, max 5 notti tassabili (default Comune Ferrara)
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Save bar (sticky bottom) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
        {settings?.updatedAt && (
          <p className="text-xs text-gray-400">
            Ultimo salvataggio: {new Date(settings.updatedAt).toLocaleString('it-IT')}
          </p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium ml-auto"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salva impostazioni
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componenti riusabili
// ─────────────────────────────────────────────────────────────────────────────

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  help?: string;
  required?: boolean;
  className?: string;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={props.className ?? ''}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {props.label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={props.type ?? 'text'}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          disabled={props.disabled}
          className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none ${
            props.mono ? 'font-mono text-sm' : ''
          } ${props.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
        />
        {props.value && !props.disabled && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(props.value).catch(() => undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-600"
            title="Copia"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
      </div>
      {props.help && <p className="text-xs text-gray-400 mt-1">{props.help}</p>}
    </div>
  );
}
