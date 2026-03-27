'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
            Privacy Policy
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
            <h2>1. Titolare del Trattamento</h2>
            <p>
              Il Titolare del trattamento dei dati personali è:<br />
              <strong>Immobiliare Fiumana S.r.l.</strong><br />
              Via del Seminario, 79 - 59100 Prato (PO)<br />
              P.IVA/C.F.: 01340960481<br />
              Email: immobiliarefiumana@gmail.com<br />
              Telefono: +39 388 488 5053
            </p>

            <h2>2. Tipologie di Dati Raccolti</h2>
            <p>
              I dati personali raccolti da questo sito web, in modo autonomo o tramite terze parti, includono:
            </p>
            <ul>
              <li>Dati di contatto (nome, cognome, email, telefono)</li>
              <li>Dati relativi all'immobile (città, tipologia, caratteristiche)</li>
              <li>Cookie e dati di utilizzo</li>
              <li>Dati di navigazione (indirizzo IP, browser, dispositivo)</li>
            </ul>

            <h3>2.1 Dati degli Ospiti per Locazioni Turistiche</h3>
            <p>
              Per gli ospiti delle strutture ricettive gestite, in ottemperanza all'obbligo di legge
              previsto dall'art. 109 del TULPS (Testo Unico delle Leggi di Pubblica Sicurezza),
              raccogliamo i seguenti dati:
            </p>
            <ul>
              <li>Dati anagrafici (cognome, nome, sesso, data e luogo di nascita, cittadinanza)</li>
              <li>Documento di identità (tipo, numero, luogo di rilascio)</li>
              <li>Copia fotografica del documento di identità (fronte e retro)</li>
              <li>Date di soggiorno (check-in e check-out)</li>
            </ul>
            <p>
              <strong>Base giuridica:</strong> Obbligo di legge (art. 109 TULPS, D.M. 7 gennaio 2017).
              Il conferimento di questi dati è obbligatorio e il rifiuto comporta l'impossibilità
              di ospitare il cliente nella struttura.
            </p>

            <h2>3. Finalità del Trattamento</h2>
            <p>I dati raccolti vengono utilizzati per le seguenti finalità:</p>
            <ul>
              <li>Rispondere alle richieste di contatto e fornire consulenze</li>
              <li>Gestione dei servizi immobiliari richiesti</li>
              <li>Invio di comunicazioni commerciali (previo consenso)</li>
              <li>Adempimento di obblighi legali e fiscali</li>
              <li>Miglioramento del sito web e dei servizi offerti</li>
            </ul>

            <h2>4. Base Giuridica del Trattamento</h2>
            <p>
              Il trattamento dei dati personali si basa su:
            </p>
            <ul>
              <li>Consenso dell'interessato</li>
              <li>Esecuzione di un contratto o misure precontrattuali</li>
              <li>Adempimento di obblighi legali</li>
              <li>Legittimo interesse del Titolare</li>
            </ul>

            <h2>5. Modalità di Trattamento</h2>
            <p>
              Il trattamento dei dati personali viene effettuato mediante strumenti informatici e/o telematici,
              con modalità organizzative e logiche strettamente correlate alle finalità indicate.
              I dati sono protetti con misure di sicurezza adeguate per prevenire accessi non autorizzati,
              divulgazione, modifica o distruzione.
            </p>

            <h2>6. Conservazione dei Dati</h2>
            <p>
              I dati personali saranno conservati per il tempo strettamente necessario al conseguimento
              delle finalità per cui sono stati raccolti e comunque per un periodo non superiore a 10 anni
              dalla cessazione del rapporto, salvo obblighi di legge che ne impongano una conservazione più lunga.
            </p>

            <h3>6.1 Conservazione Dati Ospiti e Documenti</h3>
            <p>Per i dati raccolti ai sensi dell'art. 109 TULPS:</p>
            <ul>
              <li>
                <strong>Dati anagrafici degli ospiti:</strong> conservati per 5 anni dalla data del soggiorno,
                come richiesto dalla normativa fiscale e contabile.
              </li>
              <li>
                <strong>Copie dei documenti di identità:</strong> eliminate automaticamente entro 48 ore
                dalla trasmissione al Portale Alloggiati della Polizia di Stato. I file vengono cancellati
                in modo permanente dai nostri sistemi.
              </li>
            </ul>
            <p>
              La cancellazione automatica dei documenti garantisce il principio di minimizzazione dei dati
              previsto dall'art. 5 del GDPR: i documenti sono conservati solo per il tempo strettamente
              necessario alla verifica dei dati inseriti e alla trasmissione alle autorità competenti.
            </p>

            <h2>7. Comunicazione e Diffusione dei Dati</h2>
            <p>
              I dati personali potranno essere comunicati a:
            </p>
            <ul>
              <li>Collaboratori e dipendenti del Titolare</li>
              <li>Professionisti e consulenti esterni (commercialisti, avvocati)</li>
              <li>Autorità competenti quando richiesto dalla legge</li>
              <li>Partner tecnologici per la gestione del sito web</li>
            </ul>

            <h3>7.1 Trasmissione al Portale Alloggiati</h3>
            <p>
              I dati degli ospiti delle strutture ricettive (escluse le copie dei documenti) vengono
              trasmessi al <strong>Portale Alloggiati della Polizia di Stato</strong> entro 24 ore
              dall'arrivo, come previsto dall'art. 109 TULPS. Questa comunicazione è un obbligo di
              legge e non richiede il consenso dell'interessato.
            </p>
            <p>
              Le copie dei documenti di identità <strong>non vengono trasmesse</strong> al Portale
              Alloggiati e sono utilizzate esclusivamente per verificare l'esattezza dei dati inseriti
              nel modulo di registrazione.
            </p>
            <p>I dati non saranno diffusi né trasferiti a paesi terzi extra UE.</p>

            <h2>8. Diritti dell'Interessato</h2>
            <p>
              Ai sensi degli articoli 15-22 del GDPR (Regolamento UE 2016/679), l'interessato ha diritto di:
            </p>
            <ul>
              <li>Accedere ai propri dati personali</li>
              <li>Ottenere la rettifica o la cancellazione degli stessi</li>
              <li>Ottenere la limitazione del trattamento</li>
              <li>Opporsi al trattamento</li>
              <li>Richiedere la portabilità dei dati</li>
              <li>Revocare il consenso in qualsiasi momento</li>
              <li>Proporre reclamo all'Autorità Garante per la protezione dei dati personali</li>
            </ul>
            <p>
              Per esercitare i propri diritti, l'interessato può contattare il Titolare all'indirizzo
              email immobiliarefiumana@gmail.com.
            </p>

            <h2>9. Modifiche alla Privacy Policy</h2>
            <p>
              Il Titolare si riserva il diritto di apportare modifiche alla presente Privacy Policy
              in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina con indicazione
              della data di ultimo aggiornamento.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
