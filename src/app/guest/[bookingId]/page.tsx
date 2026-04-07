'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Loader2,
  Globe,
  Upload,
  Camera,
  X,
} from 'lucide-react';
import { Language, languages, getTranslation } from '@/lib/translations';
import ComuneSelect from '@/components/ComuneSelect';

interface GuestForm {
  id: number;
  tipo_alloggiato: string;
  cognome: string;
  nome: string;
  sesso: string;
  data_nascita: string;
  comune_nascita: string;
  comune_nascita_codice: string;
  provincia_nascita: string;
  stato_nascita: string;
  cittadinanza: string;
  // Residenza
  stato_residenza: string;
  comune_residenza: string;
  comune_residenza_codice: string;
  provincia_residenza: string;
  indirizzo_residenza: string;
  // Documento
  tipo_documento: string;
  numero_documento: string;
  stato_rilascio: string;
  comune_rilascio: string;
  comune_rilascio_codice: string;
  luogo_rilascio: string;
  documento_fronte: string;
  documento_retro: string;
  isOpen: boolean;
}

interface BookingInfo {
  booking_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: string;
  correction_note: string | null;
}

const COMMON_COUNTRIES = [
  { code: '100000100', name: 'Italia' },
  { code: '100000203', name: 'Germania / Germany / Deutschland' },
  { code: '100000209', name: 'Francia / France / Frankreich' },
  { code: '100000219', name: 'Spagna / Spain / Spanien / España' },
  { code: '100000215', name: 'Regno Unito / United Kingdom' },
  { code: '100000336', name: 'Stati Uniti / USA' },
  { code: '100000220', name: 'Svizzera / Switzerland / Schweiz' },
  { code: '100000201', name: 'Austria / Österreich' },
  { code: '100000213', name: 'Olanda / Netherlands' },
  { code: '100000202', name: 'Belgio / Belgium / Belgique' },
  { code: '100000214', name: 'Portogallo / Portugal' },
  { code: '100000235', name: 'Romania' },
  { code: '100000233', name: 'Polonia / Poland / Polen' },
  { code: '100000602', name: 'Brasile / Brazil / Brasil' },
  { code: '100000404', name: 'Cina / China' },
  { code: '100000413', name: 'Giappone / Japan' },
  { code: '100000501', name: 'Australia' },
];

const emptyGuest = (): GuestForm => ({
  id: Date.now(),
  tipo_alloggiato: '16',
  cognome: '',
  nome: '',
  sesso: '',
  data_nascita: '',
  comune_nascita: '',
  comune_nascita_codice: '',
  provincia_nascita: '',
  stato_nascita: '100000100',
  cittadinanza: '100000100',
  // Residenza
  stato_residenza: '100000100',
  comune_residenza: '',
  comune_residenza_codice: '',
  provincia_residenza: '',
  indirizzo_residenza: '',
  // Documento
  tipo_documento: 'IDENT',
  numero_documento: '',
  stato_rilascio: '100000100',
  comune_rilascio: '',
  comune_rilascio_codice: '',
  luogo_rilascio: '',
  documento_fronte: '',
  documento_retro: '',
  isOpen: true,
});

export default function GuestPage() {
  const params = useParams();
  const bookingToken = params.bookingId as string;

  const [lang, setLang] = useState<Language>('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [guests, setGuests] = useState<GuestForm[]>([emptyGuest()]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});

  const t = (key: string) => getTranslation(lang, key);

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0] as Language;
    if (['it', 'en', 'de', 'fr', 'es'].includes(browserLang)) {
      setLang(browserLang);
    }
  }, []);

  useEffect(() => {
    fetchBooking();
  }, [bookingToken]);

  const TIPO_ALLOGGIATO_OPTIONS = [
    { value: '16', label: t('singleGuest') },
    { value: '17', label: t('headOfFamily') },
    { value: '18', label: t('groupLeader') },
    { value: '19', label: t('familyMember') },
    { value: '20', label: t('groupMember') },
  ];

  const TIPO_DOCUMENTO_OPTIONS = [
    { value: 'IDENT', label: t('idCard') },
    { value: 'PASOR', label: t('passport') },
    { value: 'PATEN', label: t('drivingLicense') },
    { value: 'IDEST', label: t('foreignIdCard') },
    { value: 'PASEX', label: t('foreignPassport') },
  ];

  async function fetchBooking() {
    try {
      const res = await fetch(`/api/guests?token=${bookingToken}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
        if (data.guests && data.guests.length > 0) {
          setGuests(
            data.guests.map((g: any, i: number) => ({
              ...g,
              id: g.id || Date.now() + i,
              isOpen: i === 0,
            }))
          );
        }
      } else if (res.status === 404) {
        setError(t('bookingNotFound'));
      }
    } catch {
      setError(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }

  function addGuest() {
    setGuests((prev) => [
      ...prev.map((g) => ({ ...g, isOpen: false })),
      emptyGuest(),
    ]);
  }

  function removeGuest(id: number) {
    if (guests.length <= 1) return;
    setGuests((prev) => prev.filter((g) => g.id !== id));
  }

  function toggleGuest(id: number) {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isOpen: !g.isOpen } : g))
    );
  }

  function updateGuest(id: number, field: string, value: string) {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  }

  function validateGuests(): boolean {
    const errors: Record<number, string[]> = {};
    let valid = true;
    let firstErrorGuestId: number | null = null;

    guests.forEach((g) => {
      const guestErrors: string[] = [];
      if (!g.cognome.trim()) guestErrors.push(t('lastNameRequired'));
      if (!g.nome.trim()) guestErrors.push(t('firstNameRequired'));
      if (!g.sesso) guestErrors.push(t('sexRequired'));
      if (!g.data_nascita) guestErrors.push(t('dateOfBirthRequired'));
      if (!g.stato_nascita) guestErrors.push(t('countryOfBirthRequired'));
      if (!g.cittadinanza) guestErrors.push(t('citizenshipRequired'));
      if (!g.tipo_documento) guestErrors.push(t('documentTypeRequired'));
      if (!g.numero_documento.trim()) guestErrors.push(t('documentNumberRequired'));
      // Residenza
      if (!g.stato_residenza) guestErrors.push(t('countryOfResidenceRequired') || 'Stato residenza richiesto');
      if (g.stato_residenza === '100000100' && !g.comune_residenza.trim()) {
        guestErrors.push(t('cityOfResidenceRequired') || 'Comune residenza richiesto');
      }
      if (!g.indirizzo_residenza.trim()) guestErrors.push(t('addressRequired') || 'Indirizzo richiesto');

      // Documento
      if (!g.stato_rilascio) guestErrors.push(t('countryOfIssueRequired') || 'Stato rilascio richiesto');
      if (g.stato_rilascio === '100000100' && !g.comune_rilascio.trim()) {
        guestErrors.push(t('placeOfIssueRequired') || 'Comune rilascio richiesto');
      } else if (g.stato_rilascio !== '100000100' && !g.luogo_rilascio.trim()) {
        guestErrors.push(t('placeOfIssueRequired'));
      }

      if (g.stato_nascita === '100000100') {
        if (!g.comune_nascita.trim()) guestErrors.push(t('cityOfBirthRequiredItaly'));
      }

      // Document photos required
      if (!g.documento_fronte) guestErrors.push(t('documentFrontRequired'));
      if (!g.documento_retro) guestErrors.push(t('documentBackRequired'));

      if (guestErrors.length > 0) {
        errors[g.id] = guestErrors;
        valid = false;
        if (firstErrorGuestId === null) {
          firstErrorGuestId = g.id;
        }
      }
    });

    setValidationErrors(errors);

    // If there are errors, open the guest cards with errors and scroll to first error
    if (!valid && firstErrorGuestId !== null) {
      setGuests((prev) =>
        prev.map((g) => ({
          ...g,
          isOpen: errors[g.id] ? true : g.isOpen,
        }))
      );

      // Set error message
      const totalErrors = Object.values(errors).flat().length;
      setError(t('fixErrorsBeforeSubmit') || `Completa tutti i campi obbligatori (${totalErrors} campi mancanti)`);

      // Scroll to top after a short delay to let the cards open
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }

    return valid;
  }

  async function handleDocumentUpload(guestId: number, side: 'front' | 'back', file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('guestId', guestId.toString());
    formData.append('side', side);

    try {
      const res = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const field = side === 'front' ? 'documento_fronte' : 'documento_retro';
        updateGuest(guestId, field, data.url);
      } else {
        const data = await res.json();
        setError(data.error || 'Errore upload');
      }
    } catch {
      setError(t('connectionError'));
    }
  }

  function removeDocument(guestId: number, side: 'front' | 'back') {
    const field = side === 'front' ? 'documento_fronte' : 'documento_retro';
    updateGuest(guestId, field, '');
  }

  async function handleSubmit() {
    if (!validateGuests()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: bookingToken,
          guests: guests.map(({ isOpen, id, ...g }) => g),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Error');
      }
    } catch {
      setError(t('connectionError'));
    } finally {
      setSubmitting(false);
    }
  }

  // Language Selector Component
  const LanguageSelector = () => (
    <div className="relative">
      <button
        onClick={() => setLangMenuOpen(!langMenuOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-2xl">{languages.find(l => l.code === lang)?.flag}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {langMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
          <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[160px]">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setLangMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  lang === l.code ? 'bg-primary-50' : ''
                }`}
              >
                <span className="text-2xl">{l.flag}</span>
                <span className={`text-sm ${lang === l.code ? 'font-semibold text-primary-600' : 'text-gray-700'}`}>
                  {l.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('error')}</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
            {t('registrationComplete')}
          </h2>
          <p className="text-gray-500 mb-2">{t('thankYou')}</p>
          <p className="text-gray-400 text-sm">{t('dataSaved')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      {/* Language Selector - Fixed top right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-14">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/images/logo.png"
              alt="Immobiliare Fiumana"
              width={48}
              height={48}
              className="rounded-full"
            />
            <span className="text-xl font-display font-bold text-primary-900">
              Immobiliare <span className="text-gold-500">Fiumana</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('guestRegistration')}
          </h1>
          <p className="text-gray-500 text-sm">{t('fillGuestData')}</p>
        </div>

        {/* Correction Notice */}
        {booking && booking.status === 'needs_correction' && booking.correction_note && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 text-lg">{t('correctionRequired') || 'Correzione richiesta'}</h3>
                <p className="text-amber-700 mt-2">{booking.correction_note}</p>
                <p className="text-amber-600 text-sm mt-3">{t('pleaseCorrect') || 'Per favore, correggi i dati indicati e reinvia il modulo.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Info */}
        {booking && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-l-4 border-l-primary-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider">{t('booking')}</span>
                <p className="font-medium text-gray-900 mt-1">{booking.booking_id}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider">{t('guest')}</span>
                <p className="font-medium text-gray-900 mt-1">{booking.guest_name}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider">{t('checkIn')}</span>
                <p className="font-medium text-gray-900 mt-1">{booking.check_in}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider">{t('checkOut')}</span>
                <p className="font-medium text-gray-900 mt-1">{booking.check_out}</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 flex gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 text-xs leading-relaxed">{t('privacyNotice')}</p>
        </div>

        {/* Guest Forms */}
        <div className="space-y-4">
          {guests.map((guest, index) => (
            <div key={guest.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleGuest(guest.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">
                      {t('guestNumber')} {index + 1}
                      {guest.nome && guest.cognome && (
                        <span className="text-gray-400 font-normal ml-2">
                          — {guest.nome} {guest.cognome}
                        </span>
                      )}
                    </h3>
                    {validationErrors[guest.id] && (
                      <span className="text-xs text-red-500">
                        {validationErrors[guest.id].length} {t('fieldsToComplete')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {guests.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGuest(guest.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {guest.isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Form Fields */}
              {guest.isOpen && (
                <div className="px-5 pb-6 border-t border-gray-100 pt-5 space-y-5">
                  {/* Tipo Alloggiato */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      {t('guestType')} *
                    </label>
                    <select
                      value={guest.tipo_alloggiato}
                      onChange={(e) => updateGuest(guest.id, 'tipo_alloggiato', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                    >
                      {TIPO_ALLOGGIATO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nome / Cognome */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('lastName')} *
                      </label>
                      <input
                        type="text" value={guest.cognome}
                        onChange={(e) => updateGuest(guest.id, 'cognome', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
                        placeholder="Rossi"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('firstName')} *
                      </label>
                      <input
                        type="text" value={guest.nome}
                        onChange={(e) => updateGuest(guest.id, 'nome', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
                        placeholder="Mario"
                      />
                    </div>
                  </div>

                  {/* Sesso / Data Nascita */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('sex')} *
                      </label>
                      <select
                        value={guest.sesso}
                        onChange={(e) => updateGuest(guest.id, 'sesso', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                      >
                        <option value="">{t('select')}</option>
                        <option value="M">{t('male')}</option>
                        <option value="F">{t('female')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('dateOfBirth')} *
                      </label>
                      <input
                        type="date" value={guest.data_nascita}
                        onChange={(e) => updateGuest(guest.id, 'data_nascita', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Birth Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('countryOfBirth')} *
                      </label>
                      <select
                        value={guest.stato_nascita}
                        onChange={(e) => updateGuest(guest.id, 'stato_nascita', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                      >
                        {COMMON_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('citizenship')} *
                      </label>
                      <select
                        value={guest.cittadinanza}
                        onChange={(e) => updateGuest(guest.id, 'cittadinanza', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                      >
                        {COMMON_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Italian-specific fields */}
                  {guest.stato_nascita === '100000100' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('cityOfBirth')} *
                      </label>
                      <ComuneSelect
                        value={guest.comune_nascita}
                        valueCodice={guest.comune_nascita_codice}
                        onChange={(nome, codice, prov) => {
                          updateGuest(guest.id, 'comune_nascita', nome);
                          updateGuest(guest.id, 'comune_nascita_codice', codice);
                          updateGuest(guest.id, 'provincia_nascita', prov);
                        }}
                        placeholder={t('searchCity') || 'Cerca comune...'}
                      />
                    </div>
                  )}

                  {/* Residenza */}
                  <div className="pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">
                      {t('residence') || 'Residenza'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          {t('countryOfResidence') || 'Stato Residenza'} *
                        </label>
                        <select
                          value={guest.stato_residenza}
                          onChange={(e) => updateGuest(guest.id, 'stato_residenza', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                        >
                          {COMMON_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      {guest.stato_residenza === '100000100' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            {t('cityOfResidence') || 'Comune Residenza'} *
                          </label>
                          <ComuneSelect
                            value={guest.comune_residenza}
                            valueCodice={guest.comune_residenza_codice}
                            onChange={(nome, codice, prov) => {
                              updateGuest(guest.id, 'comune_residenza', nome);
                              updateGuest(guest.id, 'comune_residenza_codice', codice);
                              updateGuest(guest.id, 'provincia_residenza', prov);
                            }}
                            placeholder={t('searchCity') || 'Cerca comune...'}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        {t('addressOfResidence') || 'Indirizzo'} *
                      </label>
                      <input
                        type="text"
                        value={guest.indirizzo_residenza}
                        onChange={(e) => updateGuest(guest.id, 'indirizzo_residenza', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
                        placeholder="Via Roma 1"
                      />
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {t('identityDocument')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          {t('documentType')} *
                        </label>
                        <select
                          value={guest.tipo_documento}
                          onChange={(e) => updateGuest(guest.id, 'tipo_documento', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                        >
                          {TIPO_DOCUMENTO_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          {t('documentNumber')} *
                        </label>
                        <input
                          type="text" value={guest.numero_documento}
                          onChange={(e) => updateGuest(guest.id, 'numero_documento', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
                          placeholder="CA12345AB"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          {t('countryOfIssue') || 'Stato Rilascio'} *
                        </label>
                        <select
                          value={guest.stato_rilascio}
                          onChange={(e) => updateGuest(guest.id, 'stato_rilascio', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white"
                        >
                          {COMMON_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      {guest.stato_rilascio === '100000100' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            {t('placeOfIssue') || 'Comune Rilascio'} *
                          </label>
                          <ComuneSelect
                            value={guest.comune_rilascio}
                            valueCodice={guest.comune_rilascio_codice}
                            onChange={(nome, codice, prov) => {
                              updateGuest(guest.id, 'comune_rilascio', nome);
                              updateGuest(guest.id, 'comune_rilascio_codice', codice);
                              updateGuest(guest.id, 'luogo_rilascio', prov);
                            }}
                            placeholder={t('searchCity') || 'Cerca comune...'}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            {t('placeOfIssue')} *
                          </label>
                          <input
                            type="text"
                            value={guest.luogo_rilascio}
                            onChange={(e) => updateGuest(guest.id, 'luogo_rilascio', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
                            placeholder="City / Place"
                          />
                        </div>
                      )}
                    </div>

                    {/* Document Upload Section */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        {t('documentUpload')} *
                      </h4>
                      <p className="text-xs text-gray-400 mb-4">{t('uploadHint')}</p>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Front */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            {t('uploadFront')} *
                          </label>
                          {guest.documento_fronte ? (
                            <div className="relative bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-xs text-green-700 truncate flex-1">{t('frontUploaded')}</span>
                              <button
                                type="button"
                                onClick={() => removeDocument(guest.id, 'front')}
                                className="p-1 rounded-full hover:bg-green-100 text-green-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                              <Upload className="w-6 h-6 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500">Click / Tap</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocumentUpload(guest.id, 'front', file);
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Back */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            {t('uploadBack')} *
                          </label>
                          {guest.documento_retro ? (
                            <div className="relative bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-xs text-green-700 truncate flex-1">{t('backUploaded')}</span>
                              <button
                                type="button"
                                onClick={() => removeDocument(guest.id, 'back')}
                                className="p-1 rounded-full hover:bg-green-100 text-green-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                              <Upload className="w-6 h-6 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500">Click / Tap</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocumentUpload(guest.id, 'back', file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Deletion notice */}
                      <div className="mt-4 bg-amber-50 rounded-lg p-3 flex gap-2">
                        <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-relaxed">
                          {t('documentDeletionNotice')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {validationErrors[guest.id] && (
                    <div className="bg-red-50 rounded-xl p-3 mt-4">
                      <ul className="text-xs text-red-600 space-y-1">
                        {validationErrors[guest.id].map((err, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Guest / Submit */}
        <div className="mt-6 space-y-4">
          <button
            onClick={addGuest}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('addGuest')}
          </button>

          {error && (
            <div className="bg-red-50 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {t('confirmRegistration')} ({guests.length} {t('guests')})
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">{t('privacyFooter')}</p>
        </div>
      </div>
    </div>
  );
}
