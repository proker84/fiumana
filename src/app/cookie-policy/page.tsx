'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-16 hero-gradient">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
            Cookie Policy
          </h1>
          <p className="text-white/70 mt-4">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2>1. Cosa sono i Cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web visitati inviano al browser dell'utente,
              dove vengono memorizzati per essere ritrasmessi agli stessi siti alla visita successiva.
              I cookie permettono ai siti di funzionare in modo efficiente e di fornire servizi personalizzati.
            </p>

            <h2>2. Titolare del Trattamento</h2>
            <p>
              <strong>Immobiliare Fiumana S.r.l.</strong><br />
              Via del Seminario, 79 - 59100 Prato (PO)<br />
              P.IVA/C.F.: 01340960481<br />
              Email: immobiliarefiumana@gmail.com
            </p>

            <h2>3. Tipologie di Cookie Utilizzati</h2>

            <h3>3.1 Cookie Tecnici (Necessari)</h3>
            <p>
              Questi cookie sono essenziali per il corretto funzionamento del sito web.
              Permettono la navigazione e l'utilizzo delle funzionalità di base.
              Non richiedono il consenso dell'utente.
            </p>
            <table className="w-full border-collapse border border-gray-300 my-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Cookie</th>
                  <th className="border border-gray-300 p-2 text-left">Finalità</th>
                  <th className="border border-gray-300 p-2 text-left">Durata</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">session_id</td>
                  <td className="border border-gray-300 p-2">Gestione della sessione utente</td>
                  <td className="border border-gray-300 p-2">Sessione</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">cookie_consent</td>
                  <td className="border border-gray-300 p-2">Memorizza le preferenze cookie</td>
                  <td className="border border-gray-300 p-2">1 anno</td>
                </tr>
              </tbody>
            </table>

            <h3>3.2 Cookie Analitici</h3>
            <p>
              Questi cookie raccolgono informazioni aggregate sull'utilizzo del sito web
              per comprendere come gli utenti interagiscono con le pagine. I dati sono
              raccolti in forma anonima.
            </p>

            <h3>3.3 Cookie di Profilazione</h3>
            <p>
              Al momento questo sito non utilizza cookie di profilazione per finalità
              pubblicitarie. In caso di futura implementazione, verrà richiesto il
              consenso esplicito dell'utente.
            </p>

            <h2>4. Cookie di Terze Parti</h2>
            <p>
              Il sito potrebbe contenere collegamenti ad altri siti web che dispongono
              di una propria informativa sulla privacy. Immobiliare Fiumana S.r.l. non è
              responsabile del trattamento dei dati effettuato da tali siti terzi.
            </p>

            <h2>5. Gestione dei Cookie</h2>
            <p>
              L'utente può gestire le preferenze relative ai cookie direttamente
              all'interno del proprio browser, impedendone l'installazione o eliminandoli.
            </p>
            <p>Di seguito i link alle istruzioni per i browser più comuni:</p>
            <ul>
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Apple Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/it-it/help/17442/windows-internet-explorer-delete-manage-cookies" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>

            <h2>6. Conseguenze della Disattivazione dei Cookie</h2>
            <p>
              La disattivazione dei cookie tecnici potrebbe compromettere il corretto
              funzionamento del sito web. La disattivazione dei cookie analitici non
              pregiudica la navigazione ma impedisce al Titolare di migliorare i propri servizi.
            </p>

            <h2>7. Diritti dell'Utente</h2>
            <p>
              L'utente può esercitare i diritti previsti dal GDPR (accesso, rettifica,
              cancellazione, opposizione, portabilità) contattando il Titolare all'indirizzo
              email immobiliarefiumana@gmail.com.
            </p>

            <h2>8. Modifiche alla Cookie Policy</h2>
            <p>
              La presente Cookie Policy può essere soggetta a modifiche. Si consiglia
              di consultare periodicamente questa pagina per essere sempre informati
              sulle modalità di utilizzo dei cookie.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
