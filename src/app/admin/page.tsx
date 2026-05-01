'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Users,
  Home,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CalendarClock,
  Copy,
  ExternalLink,
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
}

interface DashboardData {
  totalBookings: number;
  pendingGuests: number;
  todayCheckins: number;
  alloggiatiPending: number;
  recentBookings: Booking[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  async function copyLink(token: string, booking: Booking) {
    const message = getGuestMessage(booking);
    await navigator.clipboard.writeText(message);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Trova la prossima prenotazione imminente, poi ordina le altre con
  // criterio "futuro prima del passato": future per check_in crescente
  // (la più imminente in cima), passate per check_in decrescente (le più
  // recenti in cima).
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const all = data?.recentBookings ?? [];
  const future = all.filter((b) => new Date(b.check_in) >= today);
  const past = all.filter((b) => new Date(b.check_in) < today);
  future.sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());
  past.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());

  const nextBooking = future[0];
  const otherBookings = nextBooking
    ? [...future.slice(1), ...past]
    : [...future, ...past];

  async function fetchDashboard() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/bookings?dashboard=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      label: 'Prenotazioni Totali',
      value: data?.totalBookings || 0,
      icon: CalendarDays,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Check-in Oggi',
      value: data?.todayCheckins || 0,
      icon: Home,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Ospiti da Compilare',
      value: data?.pendingGuests || 0,
      icon: Users,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Alloggiati da Inviare',
      value: data?.alloggiatiPending || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
    },
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Panoramica delle prenotazioni e degli adempimenti
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prossima Prenotazione Imminente */}
      {nextBooking && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Prossima Prenotazione</h2>
          </div>
          <div className={`border-2 rounded-2xl p-5 shadow-sm ${nextBooking.status === 'guests_registered' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-400' : 'bg-gradient-to-r from-primary-50 to-primary-100 border-primary-300'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className={`text-xs font-medium uppercase ${nextBooking.status === 'guests_registered' ? 'text-green-600' : 'text-primary-600'}`}>Ospite</span>
                  <p className="font-semibold text-gray-900 mt-1 flex items-center gap-2">
                    {nextBooking.status === 'guests_registered' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {nextBooking.guest_name || '-'}
                  </p>
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
                  onClick={() => copyLink(nextBooking.guest_token, nextBooking)}
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
                  className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  Gestisci
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Altre Prenotazioni */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {nextBooking ? 'Altre Prenotazioni' : 'Prenotazioni'}
          </h2>
          <a
            href="/admin/prenotazioni"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            Vedi tutte <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {otherBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Ospite</th>
                  <th className="pb-3 pr-4">Check-in</th>
                  <th className="pb-3 pr-4">Check-out</th>
                  <th className="pb-3 pr-4">Alloggiati</th>
                  <th className="pb-3">Link Ospiti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherBookings.map((b) => (
                  <tr key={b.id} className={`text-sm transition-colors ${b.status === 'guests_registered' ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {b.status === 'guests_registered' && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        <div>
                          <Link href={`/admin/prenotazioni/${b.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                            {b.guest_name || '-'}
                          </Link>
                          <p className="text-xs text-gray-400">{b.booking_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{b.check_in}</td>
                    <td className="py-3 pr-4 text-gray-600">{b.check_out}</td>
                    <td className="py-3 pr-4">
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
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyLink(b.guest_token, b)}
                          className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                          title="Copia messaggio registrazione"
                        >
                          {copiedId === b.guest_token ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copyInstructions(b)}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Copia istruzioni check-in"
                        >
                          {copiedId === 'instructions-' + b.guest_token ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={getGuestLink(b.guest_token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Apri form ospiti"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna prenotazione trovata</p>
            <p className="text-sm mt-1">Importa un file CSV da Airbnb per iniziare</p>
          </div>
        )}
      </div>
    </div>
  );
}
