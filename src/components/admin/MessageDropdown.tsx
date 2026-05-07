'use client';

/**
 * Dropdown "Messaggi" per copiare al volo qualsiasi template messaggio
 * (registrazione, istruzioni check-in, mid-stay, check-out, ecc.) reso con
 * i dati della booking corrente.
 *
 * Caricamento template lazy: la prima volta che apri il menu fa fetch.
 * Cache `templates` condivisa via prop dal parent (evita N fetch per N booking).
 */

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, ChevronDown, Copy, Mail } from 'lucide-react';
import { renderTemplate, buildBookingVars, type BookingForTemplate } from '@/lib/messageTemplate';

interface Template {
  template_key: string;
  name: string;
  body: string;
}

interface MessageDropdownProps {
  booking: BookingForTemplate;
  templates: Template[];
  /** Variante "compatta" usa icona+ch+evron, mostra solo dropdown. */
  compact?: boolean;
}

export function MessageDropdown({ booking, templates, compact = false }: MessageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleCopy(t: Template) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const message = renderTemplate(t.body, buildBookingVars(booking, origin));
    await navigator.clipboard.writeText(message);
    setCopiedKey(t.template_key);
    setTimeout(() => {
      setCopiedKey(null);
      setOpen(false);
    }, 1500);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors flex items-center gap-1'
            : 'flex items-center gap-2 px-3 py-1.5 bg-white border border-primary-300 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors'
        }
        title="Copia messaggio per il cliente"
      >
        <Mail className="w-3.5 h-3.5" />
        {!compact && <span>Messaggi</span>}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && templates.length > 0 && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {templates.map((t) => {
            const isCopied = copiedKey === t.template_key;
            return (
              <button
                key={t.template_key}
                onClick={() => handleCopy(t)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
              >
                {isCopied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={isCopied ? 'text-green-700 font-medium' : 'text-gray-900'}>
                    {t.name}
                  </div>
                  {isCopied && (
                    <div className="text-xs text-green-600">Copiato negli appunti!</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {open && templates.length === 0 && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 text-sm text-gray-500">
          Nessun template configurato.{' '}
          <a href="/admin/impostazioni/messaggi" className="text-primary-600 underline">
            Crea il primo
          </a>
        </div>
      )}
    </div>
  );
}
