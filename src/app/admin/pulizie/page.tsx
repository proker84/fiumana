'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brush,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Image,
  ExternalLink,
  RefreshCw,
  Eye,
  Calendar,
  Loader2,
  Link2,
  Users,
} from 'lucide-react';

interface CleaningData {
  id: number;
  booking_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  cleaning_id: number | null;
  cleaning_status: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  photos_count: number;
  open_issues: number;
}

export default function AdminPuliziePage() {
  const [cleanings, setCleanings] = useState<CleaningData[]>([]);
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/admin/pulizie', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCleanings(data.cleanings || []);
        setAccessToken(data.accessToken || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function generateNewToken() {
    const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
    const res = await fetch('/api/admin/pulizie/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.token);
    }
  }

  function getCleaningLink() {
    if (typeof window !== 'undefined' && accessToken) {
      return `${window.location.origin}/pulizie/${accessToken}`;
    }
    return '';
  }

  async function copyLink() {
    const link = getCleaningLink();
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700';
      case 'in_progress': return 'bg-blue-50 text-blue-700';
      default: return 'bg-amber-50 text-amber-700';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'in_progress': return 'In corso';
      default: return 'Da fare';
    }
  };

  const filtered = cleanings.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !c.cleaning_status || c.cleaning_status === 'pending';
    if (filter === 'in_progress') return c.cleaning_status === 'in_progress';
    if (filter === 'completed') return c.cleaning_status === 'completed';
    if (filter === 'issues') return c.open_issues > 0;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brush className="w-6 h-6 text-primary-500" />
            Gestione Pulizie
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitora lo stato delle pulizie e le segnalazioni
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Link Condivisibile */}
      <div className="admin-card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Link Staff Pulizie</h2>
        </div>
        {accessToken ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2 font-mono text-sm text-gray-600 truncate">
              {getCleaningLink()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Copiato!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copia Link
                  </>
                )}
              </button>
              <a
                href={getCleaningLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Apri
              </a>
            </div>
          </div>
        ) : (
          <button
            onClick={generateNewToken}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Genera Link
          </button>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Condividi questo link con lo staff delle pulizie. Potranno vedere il calendario e aggiornare lo stato.
        </p>
      </div>

      {/* Filters */}
      <div className="admin-card mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Tutti' },
            { key: 'pending', label: 'Da fare' },
            { key: 'in_progress', label: 'In corso' },
            { key: 'completed', label: 'Completate' },
            { key: 'issues', label: 'Con segnalazioni' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.key === 'issues' && cleanings.filter(c => c.open_issues > 0).length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {cleanings.filter(c => c.open_issues > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Prenotazione</th>
                  <th className="pb-3 pr-4">Ospite</th>
                  <th className="pb-3 pr-4">Check-out</th>
                  <th className="pb-3 pr-4">Stato Pulizia</th>
                  <th className="pb-3 pr-4">Foto</th>
                  <th className="pb-3 pr-4">Segnalazioni</th>
                  <th className="pb-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="text-sm hover:bg-gray-50 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="font-mono text-xs text-gray-600">{c.booking_id}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">{c.guest_name || '-'}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {c.num_guests} ospiti
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {c.check_out}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(c.cleaning_status)}`}>
                        {c.cleaning_status === 'completed' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : c.cleaning_status === 'in_progress' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {getStatusLabel(c.cleaning_status)}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      {c.photos_count > 0 ? (
                        <span className="flex items-center gap-1 text-gray-600 text-sm">
                          <Image className="w-4 h-4" />
                          {c.photos_count}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      {c.open_issues > 0 ? (
                        <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          {c.open_issues}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/admin/prenotazioni/${c.id}`}
                        className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors inline-block"
                        title="Vedi prenotazione"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Brush className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna pulizia trovata</p>
          </div>
        )}
      </div>
    </div>
  );
}
