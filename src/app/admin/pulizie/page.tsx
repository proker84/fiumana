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
  X,
  Timer,
  Camera,
  ChevronLeft,
  ChevronRight,
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

interface CleaningDetail {
  booking: {
    id: number;
    booking_id: string;
    guest_name: string;
    check_in: string;
    check_out: string;
    num_guests: number;
  };
  cleaning: {
    id: number;
    status: string;
    scheduled_date: string;
    started_at: string | null;
    completed_at: string | null;
    duration_minutes: number | null;
    duration_calculated: number | null;
    notes: string | null;
  } | null;
  photos: Array<{
    id: number;
    photo_url: string;
    photo_type: string;
    room: string | null;
    caption: string | null;
    created_at: string;
  }>;
  issues: Array<{
    id: number;
    description: string;
    photo_url: string | null;
    severity: string;
    resolved: number;
    created_at: string;
  }>;
}

export default function AdminPuliziePage() {
  const [cleanings, setCleanings] = useState<CleaningData[]>([]);
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [filter, setFilter] = useState('all');

  // Modal state
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CleaningDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBookingId) {
      fetchDetail(selectedBookingId);
    }
  }, [selectedBookingId]);

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

  async function fetchDetail(bookingId: number) {
    setLoadingDetail(true);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/admin/pulizie/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
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

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const filtered = cleanings.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !c.cleaning_status || c.cleaning_status === 'pending';
    if (filter === 'in_progress') return c.cleaning_status === 'in_progress';
    if (filter === 'completed') return c.cleaning_status === 'completed';
    if (filter === 'issues') return c.open_issues > 0;
    return true;
  });

  const openLightbox = (photoUrl: string, index: number) => {
    setLightboxPhoto(photoUrl);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!detail) return;
    const photos = detail.photos;
    let newIndex = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (newIndex < 0) newIndex = photos.length - 1;
    if (newIndex >= photos.length) newIndex = 0;
    setLightboxIndex(newIndex);
    setLightboxPhoto(photos[newIndex].photo_url);
  };

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
                  <tr
                    key={c.id}
                    className="text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBookingId(c.id)}
                  >
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookingId(c.id);
                        }}
                        className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors inline-block"
                        title="Vedi dettagli pulizia"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

      {/* Detail Modal */}
      {selectedBookingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Brush className="w-5 h-5 text-primary-500" />
                Dettagli Pulizia
              </h3>
              <button
                onClick={() => {
                  setSelectedBookingId(null);
                  setDetail(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : detail ? (
                <div className="p-5 space-y-6">
                  {/* Booking Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Prenotazione</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">ID</span>
                        <p className="font-mono">{detail.booking.booking_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Ospite</span>
                        <p className="font-medium">{detail.booking.guest_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Check-in</span>
                        <p>{detail.booking.check_in}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Check-out</span>
                        <p>{detail.booking.check_out}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cleaning Info */}
                  {detail.cleaning && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-blue-500" />
                        Informazioni Pulizia
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Stato</span>
                          <p>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(detail.cleaning.status)}`}>
                              {getStatusLabel(detail.cleaning.status)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Inizio</span>
                          <p>{formatDateTime(detail.cleaning.started_at)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Fine</span>
                          <p>{formatDateTime(detail.cleaning.completed_at)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Durata</span>
                          <p className="font-medium text-blue-600">
                            {formatDuration(detail.cleaning.duration_minutes || detail.cleaning.duration_calculated)}
                          </p>
                        </div>
                      </div>
                      {detail.cleaning.notes && (
                        <div className="mt-3 pt-3 border-t border-blue-100">
                          <span className="text-gray-500 text-sm">Note:</span>
                          <p className="text-sm mt-1">{detail.cleaning.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photos */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-green-500" />
                      Foto ({detail.photos.length})
                    </h4>
                    {detail.photos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {detail.photos.map((photo, index) => (
                          <div
                            key={photo.id}
                            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                            onClick={() => openLightbox(photo.photo_url, index)}
                          >
                            <img
                              src={photo.photo_url}
                              alt={photo.caption || `Foto ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute top-2 left-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                photo.photo_type === 'before'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {photo.photo_type === 'before' ? 'Prima' : 'Dopo'}
                              </span>
                            </div>
                            {photo.room && (
                              <div className="absolute bottom-2 left-2 right-2">
                                <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded">
                                  {photo.room}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-400 text-sm">Nessuna foto caricata</p>
                      </div>
                    )}
                  </div>

                  {/* Issues */}
                  {detail.issues.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        Segnalazioni ({detail.issues.length})
                      </h4>
                      <div className="space-y-3">
                        {detail.issues.map((issue) => (
                          <div
                            key={issue.id}
                            className={`p-3 rounded-xl border ${
                              issue.resolved
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {issue.photo_url && (
                                <img
                                  src={issue.photo_url}
                                  alt="Segnalazione"
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1">
                                <p className={issue.resolved ? 'text-gray-600' : 'text-red-800'}>
                                  {issue.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    issue.severity === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : issue.severity === 'medium'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {issue.severity === 'high' ? 'Alta' : issue.severity === 'medium' ? 'Media' : 'Bassa'}
                                  </span>
                                  {issue.resolved ? (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Risolta
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p>Errore nel caricamento dei dettagli</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && detail && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox('prev');
            }}
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img
            src={lightboxPhoto}
            alt="Foto"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox('next');
            }}
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {detail.photos.length}
            {detail.photos[lightboxIndex]?.room && (
              <span className="ml-2">- {detail.photos[lightboxIndex].room}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
