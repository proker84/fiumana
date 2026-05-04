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
  RotateCcw,
  X,
  AlertTriangle,
  Trash2,
  Upload,
  Receipt,
  FileDown,
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
  correction_note: string | null;
  total_amount?: number | null;
  city_tax_amount?: number | null;
  airbnb_commission?: number | null;
}

// Calcolo default tassa di soggiorno: 0,50 € × num_guests × clamp(notti, 1, 14)
function calcCityTaxDefault(checkIn: string, checkOut: string, numGuests: number): number {
  const RATE = 0.5; // €/notte/persona — Comacchio Lido di Pomposa
  const MIN_NIGHTS = 1;
  const MAX_NIGHTS = 14;
  if (!checkIn || !checkOut) return RATE * Math.max(numGuests, 1) * MIN_NIGHTS;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  const billable = Math.min(MAX_NIGHTS, Math.max(MIN_NIGHTS, nights));
  return RATE * Math.max(numGuests, 1) * billable;
}

interface AlloggiatiReceipt {
  id: number;
  receipt_id: string;
  send_date: string;
  schedine_count: number;
  permanenza_days: number;
  questura: string;
  pdf_url: string;
  created_at: string;
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

const COUNTRY_LABELS: Record<string, string> = {
  '100000100': 'Italia',
  '100000203': 'Germania',
  '100000209': 'Francia',
  '100000219': 'Spagna',
  '100000215': 'Regno Unito',
  '100000336': 'Stati Uniti',
  '100000220': 'Svizzera',
  '100000201': 'Austria',
  '100000213': 'Olanda',
  '100000202': 'Belgio',
  '100000214': 'Portogallo',
  '100000235': 'Romania',
  '100000233': 'Polonia',
  '100000602': 'Brasile',
  '100000404': 'Cina',
  '100000413': 'Giappone',
  '100000501': 'Australia',
};

const getCountryName = (code: string) => COUNTRY_LABELS[code] || code;

function formatDateIT(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Correction request state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [sendingCorrection, setSendingCorrection] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Alloggiati submit state
  const [showAlloggiatiModal, setShowAlloggiatiModal] = useState(false);
  const [alloggiatiConfirmed, setAlloggiatiConfirmed] = useState(false);
  const [sendingAlloggiati, setSendingAlloggiati] = useState(false);
  const [alloggiatiResult, setAlloggiatiResult] = useState<{ success: boolean; message: string; testMode?: boolean } | null>(null);

  // Delete booking state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Receipt state
  const [receipts, setReceipts] = useState<AlloggiatiReceipt[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Invoice state
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceMessage, setInvoiceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // City tax / Airbnb commission editing
  const [cityTaxInput, setCityTaxInput] = useState<string>('');
  const [airbnbCommissionInput, setAirbnbCommissionInput] = useState<string>('');
  const [savingTax, setSavingTax] = useState(false);
  const [taxMessage, setTaxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    receipt_id: '',
    send_date: '',
    schedine_count: '1',
    permanenza_days: '1',
    questura: 'FERRARA',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBookingDetails();
    fetchReceipts();
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

        // Pre-popola city tax: se booking.city_tax_amount è valorizzato lo usiamo,
        // altrimenti calcoliamo il default 2€ × num_guests × clamp(notti, 1, 14)
        const ct =
          data.booking.city_tax_amount != null && data.booking.city_tax_amount > 0
            ? Number(data.booking.city_tax_amount)
            : calcCityTaxDefault(data.booking.check_in, data.booking.check_out, data.booking.num_guests ?? 1);
        setCityTaxInput(ct.toFixed(2));
        setAirbnbCommissionInput(
          data.booking.airbnb_commission != null
            ? Number(data.booking.airbnb_commission).toFixed(2)
            : ''
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveBookingTax() {
    if (!booking) return;
    setSavingTax(true);
    setTaxMessage(null);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const body: any = {
        city_tax_amount: Number(cityTaxInput || 0),
      };
      if (airbnbCommissionInput.trim() !== '') {
        body.airbnb_commission = Number(airbnbCommissionInput);
      }
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(data.booking);
        setTaxMessage({ type: 'success', text: 'Salvato.' });
        setTimeout(() => setTaxMessage(null), 2500);
      } else {
        setTaxMessage({ type: 'error', text: data.error ?? 'Errore' });
      }
    } catch (err: any) {
      setTaxMessage({ type: 'error', text: err.message ?? 'Errore di connessione' });
    } finally {
      setSavingTax(false);
    }
  }

  async function fetchReceipts() {
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/bookings/${bookingId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function uploadReceipt() {
    if (!receiptFile || !receiptForm.receipt_id || !receiptForm.send_date) return;

    setUploadingReceipt(true);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const formData = new FormData();
      formData.append('file', receiptFile);
      formData.append('receipt_id', receiptForm.receipt_id);
      formData.append('send_date', receiptForm.send_date);
      formData.append('schedine_count', receiptForm.schedine_count);
      formData.append('permanenza_days', receiptForm.permanenza_days);
      formData.append('questura', receiptForm.questura);

      const res = await fetch(`/api/bookings/${bookingId}/receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setShowReceiptModal(false);
        setReceiptFile(null);
        setReceiptForm({
          receipt_id: '',
          send_date: '',
          schedine_count: '1',
          permanenza_days: '1',
          questura: 'FERRARA',
        });
        fetchReceipts();
        fetchBookingDetails();
      } else {
        const data = await res.json();
        alert(data.error || 'Errore nel caricamento');
      }
    } catch (err) {
      alert('Errore di connessione');
    } finally {
      setUploadingReceipt(false);
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

  async function deleteBooking() {
    setDeleting(true);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        router.push('/admin/prenotazioni');
      } else {
        const data = await res.json();
        alert(data.error || 'Errore durante l\'eliminazione');
      }
    } catch (err) {
      alert('Errore di connessione');
    } finally {
      setDeleting(false);
    }
  }

  async function submitToAlloggiati() {
    if (!alloggiatiConfirmed) return;

    setSendingAlloggiati(true);
    setAlloggiatiResult(null);

    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/alloggiati', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: booking?.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlloggiatiResult({
          success: true,
          message: data.message,
          testMode: data.testMode,
        });
        fetchBookingDetails();
        setTimeout(() => {
          setShowAlloggiatiModal(false);
          setAlloggiatiConfirmed(false);
          setAlloggiatiResult(null);
        }, 3000);
      } else {
        setAlloggiatiResult({
          success: false,
          message: data.error || 'Errore durante l\'invio',
        });
      }
    } catch (err) {
      setAlloggiatiResult({ success: false, message: 'Errore di connessione' });
    } finally {
      setSendingAlloggiati(false);
    }
  }

  async function createInvoiceFromBooking() {
    setCreatingInvoice(true);
    setInvoiceMessage(null);
    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/invoices/from-booking/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        // Redirect al dettaglio della fattura appena creata
        router.push(`/admin/fatturazione/${data.invoice.id}`);
      } else {
        setInvoiceMessage({ type: 'error', text: data.error ?? 'Errore creazione fattura' });
      }
    } catch (err: any) {
      setInvoiceMessage({ type: 'error', text: err.message ?? 'Errore di connessione' });
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function requestCorrection() {
    if (!correctionNote.trim()) return;

    setSendingCorrection(true);
    setCorrectionResult(null);

    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch(`/api/bookings/${bookingId}/request-correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: correctionNote }),
      });

      const data = await res.json();

      if (res.ok) {
        setCorrectionResult({ success: true, message: data.message });
        // Refresh booking data
        fetchBookingDetails();
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowCorrectionModal(false);
          setCorrectionNote('');
          setCorrectionResult(null);
        }, 2000);
      } else {
        setCorrectionResult({ success: false, message: data.error });
      }
    } catch (err) {
      setCorrectionResult({ success: false, message: 'Errore di connessione' });
    } finally {
      setSendingCorrection(false);
    }
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Prenotazione {booking.booking_id}</h1>
          <p className="text-gray-500 text-sm mt-1">Dettagli prenotazione e ospiti registrati</p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Elimina
        </button>
      </div>

      {/* Correction Status Banner */}
      {booking.status === 'needs_correction' && booking.correction_note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Correzione richiesta</h3>
            <p className="text-amber-700 text-sm mt-1">{booking.correction_note}</p>
          </div>
        </div>
      )}

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
                {formatDateIT(booking.check_in)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Check-out</span>
              <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDateIT(booking.check_out)}
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
            {booking.status === 'needs_correction' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" /> Correzione richiesta
              </span>
            ) : booking.alloggiati_sent ? (
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
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Ospiti Registrati ({guests.length})
          </h2>

          {guests.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Richiedi correzione
              </button>
              {!booking.alloggiati_sent && (
                <button
                  onClick={() => setShowAlloggiatiModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  Invia al Portale Alloggiati
                </button>
              )}
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {guests.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-gray-500">Esporta dati:</span>
            <a
              href={`/api/bookings/${booking.id}/export?format=alloggiati`}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
            >
              <FileDown className="w-3.5 h-3.5" />
              XML Alloggiati
            </a>
            <a
              href={`/api/bookings/${booking.id}/export?format=txt`}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
            >
              <FileDown className="w-3.5 h-3.5" />
              TXT Alloggiati
            </a>
            <a
              href={`/api/bookings/${booking.id}/export?format=ross1000`}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium"
            >
              <FileDown className="w-3.5 h-3.5" />
              XML ROSS1000 (ISTAT)
            </a>
          </div>
        )}
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
                      <p className="text-gray-700">{formatDateIT(guest.data_nascita)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Luogo di nascita</span>
                      <p className="text-gray-700">
                        {guest.comune_nascita || '-'} {guest.provincia_nascita ? `(${guest.provincia_nascita})` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Cittadinanza</span>
                      <p className="text-gray-700">{getCountryName(guest.cittadinanza)}</p>
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
                            href={guest.documento_fronte.startsWith('http') ? guest.documento_fronte : `/api/documents/${guest.documento_fronte}`}
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
                            href={guest.documento_retro.startsWith('http') ? guest.documento_retro : `/api/documents/${guest.documento_retro}`}
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

      {/* Invoice / Fatturazione card */}
      {guests.length > 0 && booking && (
        <div className="mt-8 mb-4 admin-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Fatturazione elettronica</h3>
              <p className="text-sm text-gray-500">
                Imposta tassa di soggiorno e commissione, poi crea la bozza fattura
              </p>
            </div>
          </div>

          {/* Calcoli e campi editabili */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
                Tassa di soggiorno (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cityTaxInput}
                onChange={(e) => setCityTaxInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Default 2,00 €/notte/persona (1–14 notti). Modificabile se la fattura Airbnb ha un valore diverso.
              </p>
              <button
                onClick={() =>
                  setCityTaxInput(
                    calcCityTaxDefault(
                      booking.check_in,
                      booking.check_out,
                      booking.num_guests ?? 1,
                    ).toFixed(2),
                  )
                }
                className="text-xs text-primary-600 hover:underline mt-1"
                type="button"
              >
                Ricalcola default
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
                Commissione Airbnb (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="es. 52.70"
                value={airbnbCommissionInput}
                onChange={(e) => setAirbnbCommissionInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Solo informativa — non sottratta dal totale fattura. Serve per riconciliare con la fattura passiva Airbnb.
              </p>
            </div>

            <div className="bg-primary-50 rounded-lg p-3 text-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Anteprima totale fattura
              </div>
              {(() => {
                const totale = Number(booking.total_amount ?? 0);
                const cityTax = Number(cityTaxInput || 0);
                const fattura = Math.max(0, totale - cityTax);
                const imponibile = fattura / 1.1;
                const iva = fattura - imponibile;
                return (
                  <>
                    <div className="flex justify-between text-gray-700">
                      <span>Totale ospite</span>
                      <span className="font-mono">{totale.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>− tasse soggiorno</span>
                      <span className="font-mono">{cityTax.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary-900 mt-1.5 pt-1.5 border-t border-primary-200">
                      <span>= Totale fattura</span>
                      <span className="font-mono">{fattura.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>(imponibile + IVA 10%)</span>
                      <span className="font-mono">
                        {imponibile.toFixed(2)} + {iva.toFixed(2)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {taxMessage && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 mb-3 ${
                taxMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {taxMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {taxMessage.text}
            </div>
          )}

          <div className="flex gap-2 justify-between items-center">
            <button
              onClick={saveBookingTax}
              disabled={savingTax}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {savingTax ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Salva valori
            </button>
            <button
              onClick={createInvoiceFromBooking}
              disabled={creatingInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {creatingInvoice ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              Crea bozza fattura
            </button>
          </div>
        </div>
      )}

      {invoiceMessage && (
        <div
          className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${
            invoiceMessage.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {invoiceMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          {invoiceMessage.text}
        </div>
      )}

      {/* Receipts Section */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-500" />
          Ricevute Alloggiati ({receipts.length})
        </h2>
        <button
          onClick={() => setShowReceiptModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Carica Ricevuta
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="admin-card text-center py-8">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Nessuna ricevuta caricata</p>
          <p className="text-xs text-gray-400 mt-1">
            Carica il PDF della ricevuta del Portale Alloggiati
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="admin-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">ID: {receipt.receipt_id}</p>
                  <p className="text-sm text-gray-500">
                    {formatDateIT(receipt.send_date)} • {receipt.schedine_count} schedine • {receipt.permanenza_days} giorni • Questura {receipt.questura}
                  </p>
                </div>
              </div>
              <a
                href={receipt.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Scarica PDF
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Receipt Upload Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-500" />
                Carica Ricevuta Alloggiati
              </h3>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setReceiptFile(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Ricevuta *
                </label>
                <input
                  type="text"
                  value={receiptForm.receipt_id}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receipt_id: e.target.value })}
                  placeholder="Es: 2025/54318 [FE]"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Invio *
                  </label>
                  <input
                    type="date"
                    value={receiptForm.send_date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, send_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questura
                  </label>
                  <input
                    type="text"
                    value={receiptForm.questura}
                    onChange={(e) => setReceiptForm({ ...receiptForm, questura: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedine Inviate
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={receiptForm.schedine_count}
                    onChange={(e) => setReceiptForm({ ...receiptForm, schedine_count: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giorni Permanenza
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={receiptForm.permanenza_days}
                    onChange={(e) => setReceiptForm({ ...receiptForm, permanenza_days: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File PDF *
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="receipt-file"
                  />
                  <label htmlFor="receipt-file" className="cursor-pointer">
                    {receiptFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">{receiptFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Clicca per selezionare il PDF</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setReceiptFile(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Annulla
              </button>
              <button
                onClick={uploadReceipt}
                disabled={!receiptFile || !receiptForm.receipt_id || !receiptForm.send_date || uploadingReceipt}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadingReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Carica Ricevuta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Elimina Prenotazione
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Attenzione</h4>
                    <p className="text-red-700 text-sm mt-1">
                      Stai per eliminare definitivamente la prenotazione <strong>{booking.booking_id}</strong> e tutti i dati degli ospiti associati.
                      Questa operazione non può essere annullata.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Annulla
              </button>
              <button
                onClick={deleteBooking}
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
                    Elimina definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alloggiati Confirmation Modal */}
      {showAlloggiatiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-500" />
                Invio al Portale Alloggiati
              </h3>
              <button
                onClick={() => {
                  setShowAlloggiatiModal(false);
                  setAlloggiatiConfirmed(false);
                  setAlloggiatiResult(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Attenzione: Invio REALE</h4>
                    <p className="text-red-700 text-sm mt-1">
                      Stai per inviare i dati di <strong>{guests.length} ospiti</strong> al Portale Alloggiati della Polizia di Stato.
                      Questa operazione <strong>non può essere annullata</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2"><strong>Prenotazione:</strong> {booking.booking_id}</p>
                <p className="text-sm text-gray-600 mb-2"><strong>Check-in:</strong> {formatDateIT(booking.check_in)}</p>
                <p className="text-sm text-gray-600"><strong>Ospiti:</strong> {guests.map(g => `${g.nome} ${g.cognome}`).join(', ')}</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={alloggiatiConfirmed}
                  onChange={(e) => setAlloggiatiConfirmed(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  Confermo di voler inviare questi dati al Portale Alloggiati della Polizia di Stato.
                  Ho verificato che tutti i dati siano corretti.
                </span>
              </label>

              {alloggiatiResult && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  alloggiatiResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {alloggiatiResult.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {alloggiatiResult.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowAlloggiatiModal(false);
                  setAlloggiatiConfirmed(false);
                  setAlloggiatiResult(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Annulla
              </button>
              <button
                onClick={submitToAlloggiati}
                disabled={!alloggiatiConfirmed || sendingAlloggiati}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingAlloggiati ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Conferma e Invia
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                Richiedi correzione
              </h3>
              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionNote('');
                  setCorrectionResult(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Descrivi cosa deve essere corretto. Il cliente riceverà una email con queste istruzioni
                e potrà accedere nuovamente al form per modificare i dati.
              </p>

              <textarea
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="Es: Il documento è illeggibile, per favore carica una foto più chiara..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm resize-none"
                rows={4}
              />

              {correctionResult && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  correctionResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {correctionResult.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {correctionResult.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionNote('');
                  setCorrectionResult(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Annulla
              </button>
              <button
                onClick={requestCorrection}
                disabled={!correctionNote.trim() || sendingCorrection}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingCorrection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Invio...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Invia richiesta
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
