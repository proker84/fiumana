'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  FileText,
  Calendar,
  Users,
  Copy,
  CheckCircle2,
  Clock,
  Send,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Guest {
  id: number;
  cognome: string;
  nome: string;
  sesso: string;
  data_nascita: string;
  stato_nascita: string;
  cittadinanza: string;
  comune_nascita: string;
  provincia_nascita: string;
  tipo_documento: string;
  numero_documento: string;
  luogo_rilascio: string;
  documento_fronte: string | null;
  documento_retro: string | null;
  tipo_alloggiato: string;
}

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
}

const TIPO_ALLOGGIATO_LABELS: Record<string, string> = {
  '16': 'Ospite Singolo',
  '17': 'Capofamiglia',
  '18': 'Capogruppo',
  '19': 'Familiare',
  '20': 'Membro Gruppo',
};

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  'IDENT': "Carta d'Identità",
  'PASOR': 'Passaporto',
  'PATEN': 'Patente di Guida',
  'IDEST': "Carta d'Identità Estera",
  'PASEX': 'Passaporto Estero',
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  async function fetchBookingDetails() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
        setGuests(data.guests || []);
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

  async function copyLink() {
    if (!booking) return;
    const link = getGuestLink(booking.guest_token);
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-500">Prenotazione non trovata</p>
        <Link href="/admin/prenotazioni" className="text-primary-600 hover:underline mt-2 inline-block">
          Torna alle prenotazioni
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prenotazione {booking.booking_id}</h1>
          <p className="text-gray-500 text-sm mt-1">Dettagli prenotazione e ospiti registrati</p>
        </div>
      </div>

      {/* Booking Info Card */}
      <div className="admin-card mb-6">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Ospite principale</span>
              <p className="font-medium text-gray-900 mt-1">{booking.guest_name || '-'}</p>
              <p className="text-xs text-gray-500">{booking.guest_email || ''}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Check-in</span>
              <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                {booking.check_in}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Check-out</span>
              <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {booking.check_out}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">N. Ospiti</span>
              <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                {booking.num_guests}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {booking.alloggiati_sent ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Inviato ad Alloggiati
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" /> Da inviare
              </span>
            )}
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 transition-colors"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copia Link Ospiti
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Guests Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          Ospiti Registrati ({guests.length})
        </h2>
      </div>

      {guests.length === 0 ? (
        <div className="admin-card text-center py-12">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-2">Nessun ospite registrato</p>
          <p className="text-sm text-gray-400">
            Invia il link di registrazione agli ospiti per raccogliere i loro dati
          </p>
          <a
            href={getGuestLink(booking.guest_token)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Apri Form Ospiti
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {guests.map((guest, index) => (
            <div key={guest.id} className="admin-card">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {guest.nome} {guest.cognome}
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {TIPO_ALLOGGIATO_LABELS[guest.tipo_alloggiato] || guest.tipo_alloggiato}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-400">Sesso</span>
                      <p className="text-gray-700">{guest.sesso === 'M' ? 'Maschio' : 'Femmina'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Data di nascita</span>
                      <p className="text-gray-700">{guest.data_nascita}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Luogo di nascita</span>
                      <p className="text-gray-700">
                        {guest.comune_nascita || '-'} {guest.provincia_nascita ? `(${guest.provincia_nascita})` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Cittadinanza</span>
                      <p className="text-gray-700">{guest.cittadinanza}</p>
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Documento</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-gray-400">Tipo</span>
                        <p className="text-gray-700">
                          {TIPO_DOCUMENTO_LABELS[guest.tipo_documento] || guest.tipo_documento}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Numero</span>
                        <p className="text-gray-700 font-mono">{guest.numero_documento}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Rilasciato a</span>
                        <p className="text-gray-700">{guest.luogo_rilascio}</p>
                      </div>
                    </div>

                    {/* Document Images */}
                    {(guest.documento_fronte || guest.documento_retro) && (
                      <div className="mt-4 flex gap-3">
                        {guest.documento_fronte && (
                          <a
                            href={`/api/documents/${guest.documento_fronte}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Fronte documento
                          </a>
                        )}
                        {guest.documento_retro && (
                          <a
                            href={`/api/documents/${guest.documento_retro}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Retro documento
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
