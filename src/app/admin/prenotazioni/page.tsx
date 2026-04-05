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
  Trash2,
  CalendarClock,
  X,
  AlertTriangle,
  Loader2,
  MapPin,
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
  const [deleteModal, setDeleteModal] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function getGuestMessage(booking: Booking) {
    const link = getGuestLink(booking.guest_token);
    return `Ciao ${booking.guest_name?.split(' ')[0] || ''}!

Grazie per aver prenotato con noi. Per completare il check-in, ti chiediamo di compilare i dati di tutti gli ospiti al seguente link:

${link}

È un obbligo di legge italiano (art. 109 TULPS) comunicare i dati degli ospiti al Portale Alloggiati.

Ti chiediamo di compilare il modulo entro il giorno del check-in. Le istruzioni per il check-in ti saranno inviate il giorno prima del tuo arrivo.

Grazie e buon soggiorno!
Immobiliare Fiumana`;
  }

  function formatDateItalian(dateStr: string) {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
  }

  function getCheckInInstructions(booking: Booking) {
    const checkInDate = formatDateItalian(booking.check_in);
    const firstName = booking.guest_name?.split(' ')[0] || '';
    return `Buongiorno ${firstName}, ecco le istruzioni per il check-in di domani ${checkInDate}:
L'appartamento è in via Tofane 4 - Lido di Pomposa, condominio Adriana.
https://maps.app.goo.gl/nr9mXs4WKy15V4eZ7
Dovrete inizialmente parcheggiare all'esterno del condominio. I cancelletti pedonali ai lati della struttura sono sempre aperti. L'appartamento è nel settore B - Secondo piano, appartamento 7.
Quando arrivate davanti alla casa, suonate il videocitofono con in mano i documenti utilizzati nel processo di registrazione e vi comunicheremo direttamente il codice per accedere alla keybox sulla destra del videocitofono.
Al suo interno troverete le chiavi della suite e del cancello automatico per poter accedere all'interno con la macchina.
Non c'è un posto assegnato quindi potete parcheggiare dove trovate posto.
Per quanto riguarda il Wi-Fi, la rete è Suite sul mare Guest e la password: suitesulmare2025
La signora delle pulizie ha lasciato l'appartamento pronto all'uso con frigorifero attaccato e quadro elettrico acceso.
Il Comune di Comacchio ha predisposto i cassonetti della spazzatura che si aprono con una tessera che troverete accanto al piano cottura. Vi consigliamo di usare sacchetti piccoli, altrimenti non entrano nell'indifferenziato.

I nostri numeri per qualsiasi esigenza sono:
+393939011011 Fabio
+393884885053 David
Restiamo a disposizione per qualsiasi informazione o chiarimento.
Un caro saluto e a presto!
Fabio & David`;
  }

  async function copyInstructions(booking: Booking) {
    const message = getCheckInInstructions(booking);
    await navigator.clipboard.writeText(message);
    setCopiedId('instructions-' + booking.guest_token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function copyLink(booking: Booking) {
    const message = getGuestMessage(booking);
    await navigator.clipboard.writeText(message);
    setCopiedId(booking.guest_token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function deleteBooking(id: number) {
    setDeleting(true);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteModal(null);
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || 'Errore durante l\'eliminazione');
      }
    } catch {
      alert('Errore di connessione');
    } finally {
      setDeleting(false);
    }
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

  // Ordina per check-in e trova la prossima prenotazione imminente
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedBookings = [...filtered].sort((a, b) => {
    const dateA = new Date(a.check_in);
    const dateB = new Date(b.check_in);
    return dateA.getTime() - dateB.getTime();
  });

  // Trova la prossima prenotazione (check-in >= oggi)
  const nextBooking = sortedBookings.find(b => {
    const checkIn = new Date(b.check_in);
    checkIn.setHours(0, 0, 0, 0);
    return checkIn >= today;
  });

  // Le altre prenotazioni (esclusa quella imminente)
  const otherBookings = nextBooking
    ? sortedBookings.filter(b => b.id !== nextBooking.id)
    : sortedBookings;

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

      {/* Prossima Prenotazione Imminente */}
      {nextBooking && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Prossima Prenotazione</h2>
          </div>
          <div className={`rounded-2xl p-5 shadow-sm border-2 ${
            nextBooking.status === 'guests_registered'
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
              : 'bg-gradient-to-r from-primary-50 to-primary-100 border-primary-300'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-primary-600 font-medium uppercase">Ospite</span>
                  <p className="font-semibold text-gray-900 mt-1">{nextBooking.guest_name || '-'}</p>
                  <p className="text-xs text-gray-500">{nextBooking.guest_email}</p>
                </div>
                <div>
                  <span className="text-xs text-primary-600 font-medium uppercase">Check-in</span>
                  <p className="font-semibold text-gray-900 mt-1">{nextBooking.check_in}</p>
                </div>
                <div>
                  <span className="text-xs text-primary-600 font-medium uppercase">Check-out</span>
                  <p className="font-semibold text-gray-900 mt-1">{nextBooking.check_out}</p>
                </div>
                <div>
                  <span className="text-xs text-primary-600 font-medium uppercase">Ospiti</span>
                  <p className="font-semibold text-gray-900 mt-1 flex items-center gap-1">
                    <Users className="w-4 h-4" /> {nextBooking.num_guests}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {nextBooking.alloggiati_sent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Inviato
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" /> Da inviare
                  </span>
                )}
                <button
                  onClick={() => copyLink(nextBooking)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-primary-300 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors"
                >
                  {copiedId === nextBooking.guest_token ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Copiato!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copia Messaggio
                    </>
                  )}
                </button>
                <button
                  onClick={() => copyInstructions(nextBooking)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors"
                >
                  {copiedId === 'instructions-' + nextBooking.guest_token ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Copiato!
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      Copia Istruzioni
                    </>
                  )}
                </button>
                <Link
                  href={`/admin/prenotazioni/${nextBooking.id}`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Gestisci
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Altre Prenotazioni */}
      <div className="admin-card overflow-hidden">
        <h3 className="text-sm font-medium text-gray-500 mb-4">
          {nextBooking ? 'Altre prenotazioni' : 'Tutte le prenotazioni'} ({otherBookings.length})
        </h3>
        {otherBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Prenotazione</th>
                  <th className="pb-3 pr-4">Ospite</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">N. Ospiti</th>
                  <th className="pb-3 pr-4">Alloggiati</th>
                  <th className="pb-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {otherBookings.map((b) => (
                  <tr key={b.id} className={`text-sm transition-colors ${
                    b.status === 'guests_registered'
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'hover:bg-gray-50'
                  }`}>
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyLink(b)}
                          className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Copia messaggio registrazione"
                        >
                          {copiedId === b.guest_token ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyInstructions(b)}
                          className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                          title="Copia istruzioni check-in"
                        >
                          {copiedId === 'instructions-' + b.guest_token ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          href={`/admin/prenotazioni/${b.id}`}
                          className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Vedi dettagli"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteModal(b)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nessuna altra prenotazione</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Elimina Prenotazione
              </h3>
              <button
                onClick={() => setDeleteModal(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Attenzione</h4>
                    <p className="text-red-700 text-sm mt-1">
                      Stai per eliminare la prenotazione <strong>{deleteModal.booking_id}</strong> di <strong>{deleteModal.guest_name || 'N/D'}</strong>.
                      Questa operazione non può essere annullata.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteBooking(deleteModal.id)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Elimina
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
