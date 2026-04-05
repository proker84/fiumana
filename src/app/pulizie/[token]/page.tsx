'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
  Home,
  MessageSquare,
  Image,
  X,
  Loader2,
  ArrowLeft,
  Plus,
} from 'lucide-react';

interface Booking {
  id: number;
  booking_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  cleaning_id: number | null;
  cleaning_status: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  cleaning_notes: string | null;
  photos_count: number;
  open_issues: number;
}

interface CleaningDetail {
  booking: any;
  cleaning: any;
  photos: any[];
  issues: any[];
}

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export default function PuliziePage() {
  const params = useParams();
  const token = params.token as string;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cleaningDetail, setCleaningDetail] = useState<CleaningDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [token]);

  async function fetchBookings() {
    try {
      const res = await fetch(`/api/pulizie/${token}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setStaffName(data.staffName || 'Staff');
      } else {
        setError('Link non valido o scaduto');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCleaningDetail(booking: Booking) {
    setSelectedBooking(booking);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/pulizie/${token}/booking/${booking.id}`);
      if (res.ok) {
        const data = await res.json();
        setCleaningDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAction(action: string, extraData?: any) {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/pulizie/${token}/booking/${selectedBooking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      });
      if (res.ok) {
        await fetchCleaningDetail(selectedBooking);
        await fetchBookings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedBooking) return;

    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const typeSelect = form.querySelector('select[name="type"]') as HTMLSelectElement;

    if (!fileInput.files || fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('type', typeSelect.value);

    // Add all selected files
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('files', fileInput.files[i]);
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/pulizie/${token}/booking/${selectedBooking.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setShowPhotoUpload(false);
        form.reset();
        await fetchCleaningDetail(selectedBooking);
        await fetchBookings();
        alert(`${data.count} foto caricate con successo!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleIssueSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedBooking) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    setActionLoading(true);
    try {
      const res = await fetch(`/api/pulizie/${token}/booking/${selectedBooking.id}/issue`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setShowIssueForm(false);
        form.reset();
        await fetchCleaningDetail(selectedBooking);
        await fetchBookings();
        alert('Segnalazione inviata! Riceveranno una notifica email.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Calendar helpers

  // Format date as YYYY-MM-DD in local timezone (not UTC)
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display (DD/MM)
  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add padding days from previous month
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = startPadding; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    return days;
  };

  // Returns bookings that span this date (check_in <= date <= check_out)
  const getBookingsForDate = (date: Date) => {
    const dateStr = formatDateLocal(date);
    return bookings.filter(b => b.check_in <= dateStr && b.check_out >= dateStr);
  };

  // Check if a date is a check-in day for a booking
  const isCheckInDay = (date: Date, booking: Booking) => {
    const dateStr = formatDateLocal(date);
    return booking.check_in === dateStr;
  };

  // Check if a date is a check-out day for a booking
  const isCheckOutDay = (date: Date, booking: Booking) => {
    const dateStr = formatDateLocal(date);
    return booking.check_out === dateStr;
  };

  // Check if there is both a check-out AND check-in on the same day (critical cleaning day)
  const isCriticalDay = (date: Date) => {
    const dateStr = formatDateLocal(date);
    const hasCheckOut = bookings.some(b => b.check_out === dateStr);
    const hasCheckIn = bookings.some(b => b.check_in === dateStr);
    return hasCheckOut && hasCheckIn;
  };

  // Get check-outs for this date (these need cleaning)
  const getCheckOutsForDate = (date: Date) => {
    const dateStr = formatDateLocal(date);
    return bookings.filter(b => b.check_out === dateStr);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-amber-500';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'in_progress': return 'In corso';
      default: return 'Da fare';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Accesso non autorizzato</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedBooking && cleaningDetail) {
    const handleBackToCalendar = () => {
      setSelectedBooking(null);
      setCleaningDetail(null);
    };

    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-primary-900 text-white px-4 py-4">
          <button
            onClick={handleBackToCalendar}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al calendario
          </button>
          <h1 className="text-xl font-bold">{cleaningDetail.booking.guest_name}</h1>
          <p className="text-white/70 text-sm">
            Check-out: {cleaningDetail.booking.check_out}
          </p>
        </header>

        <div className="p-4 space-y-4">
          {/* Status Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(cleaningDetail.cleaning?.status)}`}>
                {getStatusLabel(cleaningDetail.cleaning?.status)}
              </span>
              {cleaningDetail.cleaning?.started_at && (
                <span className="text-xs text-gray-500">
                  Iniziata: {new Date(cleaningDetail.cleaning.started_at).toLocaleString('it-IT')}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {(!cleaningDetail.cleaning?.status || cleaningDetail.cleaning.status === 'pending') && (
                <button
                  onClick={() => handleAction('start')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Inizia Pulizia
                </button>
              )}
              {cleaningDetail.cleaning?.status === 'in_progress' && (
                <button
                  onClick={() => handleAction('complete')}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Completa
                </button>
              )}
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
              >
                <Camera className="w-4 h-4" />
                Foto
              </button>
              <button
                onClick={() => setShowIssueForm(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                <AlertTriangle className="w-4 h-4" />
                Segnala
              </button>
              <button
                onClick={() => setShowNoteForm(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700"
              >
                <MessageSquare className="w-4 h-4" />
                Nota
              </button>
            </div>
          </div>

          {/* Notes */}
          {cleaningDetail.cleaning?.notes && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Note
              </h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{cleaningDetail.cleaning.notes}</p>
            </div>
          )}

          {/* Photos */}
          {cleaningDetail.photos?.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Foto ({cleaningDetail.photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {cleaningDetail.photos.map((photo: any) => (
                  <a
                    key={photo.id}
                    href={photo.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {cleaningDetail.issues?.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Segnalazioni ({cleaningDetail.issues.length})
              </h3>
              <div className="space-y-3">
                {cleaningDetail.issues.map((issue: any) => (
                  <div key={issue.id} className={`p-3 rounded-lg border-l-4 ${
                    issue.urgency === 'alta' ? 'border-red-500 bg-red-50' :
                    issue.urgency === 'media' ? 'border-amber-500 bg-amber-50' :
                    'border-green-500 bg-green-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 capitalize">{issue.issue_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        issue.urgency === 'alta' ? 'bg-red-200 text-red-800' :
                        issue.urgency === 'media' ? 'bg-amber-200 text-amber-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {issue.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{issue.description}</p>
                    {issue.photo_url && (
                      <a href={issue.photo_url} target="_blank" rel="noopener noreferrer">
                        <img src={issue.photo_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Photo Upload Modal */}
        {showPhotoUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Carica Foto</h3>
                <button onClick={() => setShowPhotoUpload(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handlePhotoUpload} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo foto</label>
                  <select name="type" className="w-full px-3 py-2 border rounded-lg">
                    <option value="pre">Pre-pulizia</option>
                    <option value="post">Post-pulizia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foto (puoi selezionarne più di una)
                  </label>
                  <input
                    type="file"
                    name="files"
                    accept="image/*"
                    multiple
                    required
                    className="w-full px-3 py-2 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Seleziona tutte le foto che vuoi caricare
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Caricamento in corso...' : 'Carica Foto'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Issue Form Modal */}
        {showIssueForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
                <h3 className="font-semibold">Segnala Problema</h3>
                <button onClick={() => setShowIssueForm(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleIssueSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo problema *</label>
                  <select name="issue_type" required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleziona...</option>
                    <option value="danno">Danno</option>
                    <option value="mancanza">Mancanza</option>
                    <option value="guasto">Guasto</option>
                    <option value="sporco">Sporco eccessivo</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgenza</label>
                  <select name="urgency" className="w-full px-3 py-2 border rounded-lg">
                    <option value="bassa">Bassa</option>
                    <option value="media" selected>Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                  <textarea name="description" required rows={3}
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    placeholder="Descrivi il problema..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto (opzionale)</label>
                  <input type="file" name="file" accept="image/*" capture="environment"
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Invio...' : 'Invia Segnalazione'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Note Form Modal */}
        {showNoteForm && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Aggiungi Nota</h3>
                <button onClick={() => setShowNoteForm(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAction('add_note', { notes: formData.get('notes') });
                setShowNoteForm(false);
              }} className="p-4 space-y-4">
                <textarea
                  name="notes"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  placeholder="Scrivi una nota..."
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  Salva Nota
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Calendar view
  const days = getDaysInMonth(currentMonth);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-primary-900 text-white px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Home className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Gestione Pulizie</h1>
            <p className="text-white/70 text-sm">{staffName}</p>
          </div>
        </div>
      </header>

      {/* Calendar Navigation */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b sticky top-0 z-10">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-gray-900">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary-300"></div>
            <span className="text-gray-600">Periodo soggiorno</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-gray-600">Da pulire</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">In corso</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Completata</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded ring-2 ring-red-500 bg-red-50"></div>
            <span className="text-gray-600 font-medium">Cambio ospiti!</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 pt-2">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayBookings = getBookingsForDate(day.date);
            const checkOuts = getCheckOutsForDate(day.date);
            const isToday = day.date.toDateString() === new Date().toDateString();
            const critical = isCriticalDay(day.date);

            return (
              <div
                key={i}
                className={`min-h-[80px] p-1 rounded-lg ${
                  day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-primary-500' : ''} ${
                  critical ? 'ring-2 ring-red-500 bg-red-50' : ''
                }`}
              >
                <div className={`text-xs font-medium mb-1 flex items-center justify-between ${
                  day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  <span>{day.date.getDate()}</span>
                  {critical && (
                    <span className="text-[10px] bg-red-500 text-white px-1 rounded" title="Cambio ospiti">!</span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayBookings.map((booking) => {
                    const isStart = isCheckInDay(day.date, booking);
                    const isEnd = isCheckOutDay(day.date, booking);
                    const isMiddle = !isStart && !isEnd;

                    return (
                      <button
                        key={booking.id}
                        onClick={() => fetchCleaningDetail(booking)}
                        className={`w-full text-left px-1.5 py-1 text-xs text-white truncate ${
                          isEnd
                            ? getStatusColor(booking.cleaning_status)
                            : 'bg-primary-300'
                        } ${
                          isStart ? 'rounded-l' : ''
                        } ${
                          isEnd ? 'rounded-r' : ''
                        } ${
                          isMiddle ? 'rounded-none opacity-60' : ''
                        }`}
                        title={`${booking.guest_name} | ${booking.check_in} → ${booking.check_out}${isEnd ? ' (pulizia)' : ''}`}
                      >
                        {isStart && '→ '}
                        {isEnd ? (booking.guest_name?.split(' ')[0] || 'Ospite') : (isStart ? (booking.guest_name?.split(' ')[0] || '') : '')}
                        {isEnd && ' ←'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming List */}
      <div className="px-4 pb-8">
        <h3 className="font-semibold text-gray-900 mb-3">Tutte le pulizie ({bookings.filter(b => new Date(b.check_out) >= new Date(new Date().toDateString())).length})</h3>
        <div className="space-y-2">
          {bookings
            .filter(b => new Date(b.check_out) >= new Date(new Date().toDateString()))
            .map((booking) => (
              <button
                key={booking.id}
                onClick={() => fetchCleaningDetail(booking)}
                className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 text-left"
              >
                <div className={`w-3 h-3 rounded-full ${getStatusColor(booking.cleaning_status)}`} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{booking.guest_name}</div>
                  <div className="text-sm text-gray-500">
                    Check-in: {formatDateDisplay(booking.check_in)} → Check-out: {formatDateDisplay(booking.check_out)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{booking.num_guests}</span>
                  </div>
                  {(booking.photos_count > 0 || booking.open_issues > 0) && (
                    <div className="flex items-center gap-2 mt-1">
                      {booking.photos_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Image className="w-3 h-3" />
                          {booking.photos_count}
                        </span>
                      )}
                      {booking.open_issues > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle className="w-3 h-3" />
                          {booking.open_issues}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
