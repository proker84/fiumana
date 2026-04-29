'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Download,
  Info,
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  cancelled?: number;
  errors: string[];
  bookings?: any[];
}

export default function ImportCSVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, imported: 0, errors: ['Errore di connessione al server'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Importa Prenotazioni CSV</h1>
        <p className="text-gray-500 text-sm mt-1">
          Carica il file CSV esportato da Airbnb per importare le prenotazioni
        </p>
      </div>

      {/* Info Box */}
      <div className="admin-card mb-6 border-l-4 border-l-blue-500 bg-blue-50/50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 text-sm mb-1">Formato CSV Airbnb</h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              Il file CSV deve contenere le seguenti colonne: <strong>Confirmation Code</strong>,{' '}
              <strong>Guest Name</strong>, <strong>Contact</strong> (email),{' '}
              <strong>Start Date</strong>, <strong>End Date</strong>,{' '}
              <strong>Number of Guests</strong>, <strong>Total Payout</strong>.
              Le date devono essere in formato YYYY-MM-DD o MM/DD/YYYY.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="admin-card mb-6">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-medium text-gray-900 mb-1">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResult(null);
                }}
                className="mt-3 text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Rimuovi
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-700 mb-1">
                Trascina il file CSV qui
              </p>
              <p className="text-sm text-gray-400">
                oppure clicca per selezionare il file
              </p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importazione...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Importa Prenotazioni
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="admin-card">
          {result.success ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Importazione Completata</h3>
                  <p className="text-sm text-gray-500">
                    {result.imported} prenotazioni importate con successo
                    {result.cancelled && result.cancelled > 0 && (
                      <span className="text-red-500 ml-2">
                        ({result.cancelled} cancellate perche non piu presenti)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {result.cancelled && result.cancelled > 0 && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800">Prenotazioni Cancellate</h4>
                      <p className="text-red-700 text-sm mt-1">
                        {result.cancelled} prenotazioni sono state marcate come cancellate perche non presenti nel file CSV.
                        Queste prenotazioni sono ancora visibili nel filtro Cancellate ma non appariranno nelle pulizie.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.bookings && result.bookings.length > 0 && (
                <div className="mt-4 bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Prenotazioni Importate:
                  </h4>
                  <div className="space-y-2">
                    {result.bookings.map((b: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white p-3 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-medium">{b.guest_name}</span>
                          <span className="text-gray-400 ml-2">#{b.booking_id}</span>
                        </div>
                        <div className="text-gray-500">
                          {b.check_in} → {b.check_out}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="mt-4 bg-amber-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Avvisi:</h4>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-600 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Errore nell&apos;importazione</h3>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600 mt-1">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Template */}
      <div className="admin-card mt-6">
        <h3 className="font-bold text-gray-900 mb-3">Esempio formato CSV</h3>
        <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <code className="text-green-400 text-xs whitespace-pre">
{`Confirmation Code,Guest Name,Contact,Start Date,End Date,Number of Guests,Total Payout
HM123ABC,Mario Rossi,mario@email.com,2026-04-01,2026-04-05,2,450.00
HM456DEF,John Smith,john@email.com,2026-04-10,2026-04-14,3,600.00`}
          </code>
        </div>
      </div>
    </div>
  );
}
