'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TerminiCondizioniPage() {
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
            Termini e Condizioni
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
            <h2>1. Informazioni Generali</h2>
            <p>
              Il presente sito web è di proprietà e gestito da:<br />
              <strong>Immobiliare Fiumana S.r.l.</strong><br />
              Via del Seminario, 79 - 59100 Prato (PO)<br />
              P.IVA/C.F.: 01340960481<br />
              REA: PO-480791<br />
              Email: immobiliarefiumana@gmail.com<br />
              Telefono: +39 388 488 5053
            </p>
            <p>
              L'utilizzo del sito web implica l'accettazione integrale dei presenti
              Termini e Condizioni. Se non si accettano tali termini, si prega di
              non utilizzare il sito.
            </p>

            <h2>2. Servizi Offerti</h2>
            <p>
              Immobiliare Fiumana S.r.l. offre servizi di gestione immobiliare per
              affitti brevi, tra cui:
            </p>
            <ul>
              <li>Gestione completa degli immobili per affitti turistici</li>
              <li>Servizi di home staging e fotografia professionale</li>
              <li>Gestione delle prenotazioni e comunicazione con gli ospiti</li>
              <li>Check-in e check-out</li>
              <li>Pulizie e manutenzione</li>
              <li>Adempimenti burocratici (Alloggiati Web, tassa di soggiorno)</li>
              <li>Formula affitto garantito</li>
            </ul>
            <p>
              I dettagli specifici dei servizi, le tariffe e le condizioni contrattuali
              vengono definiti in accordi separati tra le parti.
            </p>

            <h2>3. Utilizzo del Sito</h2>
            <p>L'utente si impegna a:</p>
            <ul>
              <li>Utilizzare il sito in conformità alle leggi vigenti</li>
              <li>Non utilizzare il sito per scopi illeciti o fraudolenti</li>
              <li>Non tentare di danneggiare, disabilitare o compromettere il sito</li>
              <li>Non raccogliere informazioni personali di altri utenti</li>
              <li>Fornire informazioni veritiere nei moduli di contatto</li>
            </ul>

            <h2>4. Proprietà Intellettuale</h2>
            <p>
              Tutti i contenuti presenti sul sito web, inclusi testi, immagini, loghi,
              grafica, icone e software, sono di proprietà di Immobiliare Fiumana S.r.l.
              o dei rispettivi titolari e sono protetti dalle leggi sul diritto d'autore
              e sulla proprietà intellettuale.
            </p>
            <p>
              È vietata la riproduzione, distribuzione, modifica o utilizzo dei contenuti
              senza previa autorizzazione scritta del Titolare.
            </p>

            <h2>5. Richieste di Contatto</h2>
            <p>
              Le informazioni inviate tramite i moduli di contatto presenti sul sito
              verranno utilizzate esclusivamente per rispondere alle richieste dell'utente
              e per fornire informazioni sui servizi offerti.
            </p>
            <p>
              L'invio di una richiesta di contatto non costituisce un impegno contrattuale
              da parte di Immobiliare Fiumana S.r.l. né da parte dell'utente.
            </p>

            <h2>6. Limitazione di Responsabilità</h2>
            <p>
              Immobiliare Fiumana S.r.l. si impegna a mantenere il sito web aggiornato
              e funzionante, tuttavia non garantisce:
            </p>
            <ul>
              <li>L'assenza di errori o interruzioni del servizio</li>
              <li>L'accuratezza, completezza o attualità delle informazioni pubblicate</li>
              <li>L'idoneità del sito per scopi specifici dell'utente</li>
            </ul>
            <p>
              Il Titolare non sarà responsabile per danni diretti o indiretti derivanti
              dall'utilizzo o dall'impossibilità di utilizzo del sito web.
            </p>

            <h2>7. Link a Siti Esterni</h2>
            <p>
              Il sito può contenere link a siti web di terze parti. Immobiliare Fiumana S.r.l.
              non ha alcun controllo su tali siti e non è responsabile dei loro contenuti,
              delle loro politiche sulla privacy o delle loro pratiche.
            </p>

            <h2>8. Modifiche ai Termini</h2>
            <p>
              Immobiliare Fiumana S.r.l. si riserva il diritto di modificare i presenti
              Termini e Condizioni in qualsiasi momento. Le modifiche saranno efficaci
              dalla data di pubblicazione sul sito web.
            </p>
            <p>
              L'uso continuato del sito dopo la pubblicazione delle modifiche costituisce
              accettazione dei nuovi termini.
            </p>

            <h2>9. Legge Applicabile e Foro Competente</h2>
            <p>
              I presenti Termini e Condizioni sono regolati dalla legge italiana.
              Per qualsiasi controversia derivante dall'interpretazione o dall'esecuzione
              dei presenti termini sarà competente in via esclusiva il Foro di Prato.
            </p>

            <h2>10. Contatti</h2>
            <p>
              Per qualsiasi domanda relativa ai presenti Termini e Condizioni,
              è possibile contattare Immobiliare Fiumana S.r.l. ai seguenti recapiti:
            </p>
            <ul>
              <li>Email: immobiliarefiumana@gmail.com</li>
              <li>Telefono: +39 388 488 5053</li>
              <li>Indirizzo: Via del Seminario, 79 - 59100 Prato (PO)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
