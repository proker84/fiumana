'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  ExternalLink,
  Info,
  Trash2,
} from 'lucide-react';

interface AlloggiatiConfig {
  id?: number;
  property_id: number;
  username: string;
  wskey: string;
  last_sync: string | null;
}

export default function ImpostazioniPage() {
  const [config, setConfig] = useState<AlloggiatiConfig>({
    property_id: 1,
    username: '',
    wskey: '',
    last_sync: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showWskey, setShowWskey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
    fetchCleanupStatus();
  }, []);

  async function fetchConfig() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/alloggiati-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCleanupStatus() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/cleanup-documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCleanupStatus(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/alloggiati-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurazione salvata con successo!' });
        fetchConfig();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/alloggiati-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Connessione riuscita! Le credenziali sono valide.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Test connessione fallito' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setTesting(false);
    }
  }

  async function runCleanup() {
    if (!confirm('Vuoi eliminare i documenti delle prenotazioni inviate da più di 48 ore?')) return;

    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/cleanup-documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Pulizia completata: ${data.cleaned} documenti eliminati`);
        fetchCleanupStatus();
      } else {
        alert('Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch {
      alert('Errore di connessione');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary-500" />
          Impostazioni
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Configura le credenziali del Portale Alloggiati e altre impostazioni
        </p>
      </div>

      {/* Alloggiati Configuration */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Portale Alloggiati</h2>
            <p className="text-sm text-gray-500">Credenziali per l'invio automatico delle schedine</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="mb-2">
              Per ottenere le credenziali, accedi al{' '}
              <a
                href="https://alloggiatiweb.poliziadistato.it"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline inline-flex items-center gap-1"
              >
                Portale Alloggiati <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p>
              La <strong>WSKEY</strong> si genera dal menu Profilo → Genera WSKEY.
              Ogni volta che cambi password, devi rigenerare la WSKEY.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              placeholder="Il tuo username del Portale Alloggiati"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WSKEY (Web Service Key)
            </label>
            <div className="relative">
              <input
                type={showWskey ? 'text' : 'password'}
                value={config.wskey}
                onChange={(e) => setConfig({ ...config, wskey: e.target.value })}
                placeholder="La WSKEY generata dal Portale Alloggiati"
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowWskey(!showWskey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showWskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {config.last_sync && (
            <p className="text-xs text-gray-400">
              Ultima sincronizzazione: {new Date(config.last_sync).toLocaleString('it-IT')}
            </p>
          )}

          {message && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={saving || !config.username || !config.wskey}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salva Configurazione
            </button>
            <button
              onClick={testConnection}
              disabled={testing || !config.username || !config.wskey}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              Test Connessione
            </button>
          </div>
        </div>
      </div>

      {/* Document Cleanup */}
      <div className="admin-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Pulizia Documenti</h2>
            <p className="text-sm text-gray-500">Gestione automatica dei documenti degli ospiti</p>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-700">
            I documenti degli ospiti vengono eliminati automaticamente 48 ore dopo l'invio al Portale Alloggiati,
            come previsto dalla normativa GDPR sulla minimizzazione dei dati.
          </p>
        </div>

        {cleanupStatus && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{cleanupStatus.readyForCleanup || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Pronti per eliminazione</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{cleanupStatus.pendingCleanup || 0}</p>
              <p className="text-xs text-gray-500 mt-1">In attesa (&lt;48h)</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{cleanupStatus.notSent || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Non ancora inviati</p>
            </div>
          </div>
        )}

        <button
          onClick={runCleanup}
          className="flex items-center gap-2 px-5 py-2.5 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Esegui Pulizia Manuale
        </button>
      </div>
    </div>
  );
}
