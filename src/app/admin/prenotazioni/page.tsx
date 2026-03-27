'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Send,
  RefreshCw,
  Users,
  Eye,
  FlaskConical,
} from 'lucide-react';

interface Booking {
  id: number;
  booking_id: string;
  guest_token: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: string;
  alloggiati_sent: number;
  platform: string;
  created_at: string;
  guests_count?: number;
}

export default function PrenotazioniPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getGuestLink(token: string) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/guest/${token}`;
    }
    return `/guest/${token}`;
  }

  async function copyLink(token: string) {
    const link = getGuestLink(token);
    await navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function sendAlloggiati(bookingId: number, testMode: boolean = false) {
    const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
    try {
      const res = await fetch('/api/alloggiati', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId, testMode }),
      });
      const data = await res.json();
      if (res.ok) {
        let message = data.message || 'Invio completato!';
        if (data.testMode) {
          message += '\n\n📋 Record generati:\n' + (data.records?.join('\n') || '');
        }
        if (data.textFile) {
          message += '\n\n📄 Per upload manuale, copia questo contenuto:\n' + data.textFile;
        }
        alert(message);
        fetchBookings();
      } else {
        alert('Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch {
      alert('Errore di connessione');
    }
  }

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_id.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && !b.alloggiati_sent) ||
      (filter === 'sent' && b.alloggiati_sent);

    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prenotazioni</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestisci prenotazioni, link ospiti e invii Alloggiati
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome ospite o ID prenotazione..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tutti' },
              { key: 'pending', label: 'Da Inviare' },
              { key: 'sent', label: 'Inviati' },
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
              </button>
            ))}
          </div>
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
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">N. Ospiti</th>
                  <th className="pb-3 pr-4">Link Compilazione</th>
                  <th className="pb-3 pr-4">Alloggiati</th>
                  <th className="pb-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => (
                  <tr key={b.id} className="text-sm hover:bg-gray-50 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="font-mono text-xs text-gray-600">{b.booking_id}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{b.platform}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">{b.guest_name || '-'}</div>
                      <div className="text-xs text-gray-400">{b.guest_email || ''}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-gray-700">{b.check_in}</div>
                      <div className="text-xs text-gray-400">→ {b.check_out}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{b.num_guests}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <button
                        onClick={() => copyLink(b.guest_token)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        {copiedId === b.guest_token ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copia Link
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 pr-4">
                      {b.alloggiati_sent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Inviato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/prenotazioni/${b.id}`}
                          className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Vedi dettagli e ospiti"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={getGuestLink(b.guest_token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Apri form ospiti"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {!b.alloggiati_sent && (
                          <>
                            <button
                              onClick={() => sendAlloggiati(b.id, true)}
                              className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Test invio (simulazione)"
                            >
                              <FlaskConical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => sendAlloggiati(b.id, false)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Invia a Portale Alloggiati"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna prenotazione trovata</p>
          </div>
        )}
      </div>
    </div>
  );
}
