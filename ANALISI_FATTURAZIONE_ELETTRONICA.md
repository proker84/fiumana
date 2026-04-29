# Analisi Fattibilità — Fatturazione Elettronica in Immobiliare Fiumana

**Data analisi:** 28 aprile 2026
**Soggetto fiscale:** Immobiliare Fiumana S.r.l. (P.IVA 01340960481)
**Stack attuale:** Next.js 14 (App Router) · TypeScript · Turso (libsql/SQLite) · Vercel Blob · Resend · JWT

---

## 1. Stato attuale del progetto

Il backend è già strutturato come gestionale per affitti brevi e attualmente copre tre macro-aree:

1. **Portale Alloggiati** (Polizia di Stato) — invio SOAP + generazione TXT + ricevute PDF su Blob.
2. **Gestione prenotazioni** — import CSV Airbnb, anagrafica ospiti, link self-service per check-in.
3. **Modulo pulizie** — programmazione, foto pre/post, segnalazione issue.

### 1.1 Tabelle DB rilevanti già presenti (`src/lib/db.ts`)

| Tabella | Note rispetto alla fatturazione |
|---|---|
| `properties` | Già contiene immobili e codici struttura. Ottima base. |
| `bookings` | Contiene `total_amount`, `guest_name`, `guest_email`, `platform`, `check_in/out`. Manca: P.IVA cliente, codice destinatario SDI, PEC, indirizzo fiscale. |
| `guests` | Anagrafica per Alloggiati, NON per fatturazione (manca codice fiscale italiano valido, residenza fiscale, indirizzo completo strutturato). |
| `alloggiati_receipts` | Pattern già usato per ricevute PDF — replicabile per le fatture XML/PDF. |

### 1.2 Quello che NEL CODICE attuale manca completamente

- Non esiste alcuna tabella `invoices`, `invoice_items`, `customers`, `tax_rates`.
- Non esiste libreria/funzione per generare XML FatturaPA.
- Non esistono campi anagrafici fiscali del cliente (P.IVA, codice fiscale, codice destinatario, PEC, sede).
- Non esiste numerazione progressiva fatture (sezionali).
- Nessun riferimento a SDI, PEC trasmissione, conservazione sostitutiva.
- L'unico accenno è testuale in `servizi/page.tsx` ("...fatturazione e dichiarazioni fiscali...").

**Conclusione architetturale:** la base esiste (Next.js API routes + Turso + storage Blob) ed è perfettamente idonea. Va aggiunto un nuovo modulo "Fatturazione" senza toccare ciò che già funziona.

---

## 2. Come funziona davvero la fatturazione elettronica in Italia (chiarimento importante)

In Italia tutte le fatture transitano dal **SDI (Sistema di Interscambio)** dell'Agenzia delle Entrate. Le strade per recapitare un XML FatturaPA al SDI sono **solo cinque**:

| # | Canale | Costo reale | Praticabilità |
|---|---|---|---|
| 1 | **PEC** verso `sdi01@pec.fatturapa.it` | **0 €** (se la PEC esiste già — la SRL ne è obbligata) | Alta |
| 2 | **Upload manuale XML** sul portale "Fatture e Corrispettivi" / Cassetto Fiscale | **0 €** | Alta, ma manuale |
| 3 | **Web service SdICoop** (SOAP) come canale accreditato | Certificato a SDI + iter accreditamento (200–1000 €/anno) | Bassa per una SRL piccola |
| 4 | **SFTP** dedicato verso SDI | Idem canale 3 | Bassa |
| 5 | **API di un intermediario** (Fatture in Cloud, Aruba, ACube, FattureInCloud, Fattura24…) | da 0 € (free tier) a 30–150 €/anno | Alta |

### 2.1 Punto chiave da chiarire

> **L'Agenzia delle Entrate NON espone API pubbliche di "invio diretto al cassetto fiscale".**

Quando Krossbooking, FattureInCloud o un altro gestionale dicono "invio diretto al SDI/cassetto fiscale" intendono una di queste due cose:

- (a) sono loro stessi accreditati come **canale SDI** (caso di Aruba, Buffetti, Sogei…)
- (b) usano un **intermediario tecnico** dietro le quinte (es. ACube, FatturaPA.com, Aruba PEC) che è accreditato.

**Quindi l'idea di "saltare l'intermediario e parlare direttamente con AdE" è tecnicamente possibile solo se ci si accredita come canale SDI**, cosa che ha senso solo per chi vende il servizio a terzi, non per una singola SRL che fattura per sé.

---

## 3. Le tre opzioni realistiche per Immobiliare Fiumana

### Opzione A — Generatore XML + Upload manuale (COSTO: 0 €)

**Cosa fa il sito:**
1. Da una prenotazione genera l'XML FatturaPA versione 1.2.2 (validato XSD ufficiale).
2. Numera progressivamente con sezionale separato.
3. Mostra anteprima leggibile (foglio di stile AdE) e pulsante "Scarica XML".
4. L'admin (o il commercialista) lo carica manualmente sul portale **Fatture e Corrispettivi**.

**Pro:** zero costi, zero dipendenze esterne, controllo totale.
**Contro:** un click manuale per fattura. Non c'è ricezione automatica delle notifiche SDI (NS/RC/MC/EC), bisogna controllarle a mano sul portale.
**Tempo dev stimato:** 4–6 giornate.

---

### Opzione B — Generatore XML + invio via PEC (COSTO: 0 € se la PEC c'è già)

**Cosa fa il sito:**
1. Genera l'XML come nell'opzione A.
2. Lo invia automaticamente come allegato via **PEC** all'indirizzo `sdi01@pec.fatturapa.it` (canale ufficiale e gratuito SDI).
3. Salva l'`identificativo SDI` nella tabella `invoices`.
4. Una cron job legge la PEC in IMAP e parsifica le notifiche (Ricevuta Consegna, Notifica Scarto…) aggiornando lo stato.

**Pro:** zero costi marginali, completamente automatizzato dentro Fiumana.
**Contro:** richiede di esporre credenziali PEC al backend (Aruba PEC supporta IMAP/SMTP). Il polling delle notifiche aggiunge complessità (gestione MIME, S/MIME, parsing XML allegato). La PEC ha un limite di 200 invii/24h ma è ampiamente sufficiente.
**Tempo dev stimato:** 8–12 giornate.

⚠️ **Vincolo legale:** la PEC dev'essere quella della SRL che fattura, non una PEC personale.

---

### Opzione C — Integrazione API di un intermediario gratuito/economico (COSTO: 0–50 €/anno)

I provider con API REST e free tier o costo minimo:

| Provider | API REST | Free tier | Costo a regime | Note |
|---|---|---|---|---|
| **ACube** (acube.io) | Sì, OpenAPI | Sandbox illimitata | ~20 €/anno + 0,10 €/fattura | Specializzato, eccellente DX |
| **Fatture in Cloud** | Sì, OAuth2 | Piano gratuito limitato | da ~5 €/mese piano TS Studio | Ricco di funzioni anche extra-fattura |
| **Aruba Fatturazione** | Sì, REST | Trial | ~25 €/anno + 0,80 €/fattura | Affidabile ma più burocratico |
| **FattureInCloud Free** | Sì | 50 doc/anno | 0 € | Limitato ma può bastare |

**Cosa fa il sito:** prepara il payload JSON, chiama l'API del provider, riceve subito stato SDI, scarica il PDF, salva tutto in DB.

**Pro:** invio reale e automatico, gestione delle notifiche fatta dal provider, conservazione sostitutiva inclusa nei piani a pagamento (obbligo legale di legge 10 anni).
**Contro:** dipendenza da un terzo, costo (anche se minimo).
**Tempo dev stimato:** 3–4 giornate.

---

## 4. Vincolo fiscale specifico (CONFERMATO dal commercialista — apr 2026)

**Immobiliare Fiumana S.r.l. deve emettere fattura elettronica a OGNI ospite entro 12 giorni dalla riscossione** (regola generale art. 21 DPR 633/72 per fattura immediata).

Conseguenze concrete sul progetto:

1. **Volume alto:** una fattura per ogni booking → potenzialmente centinaia all'anno → l'**Opzione A (upload manuale) diventa impraticabile**, va scartata.
2. **Tempistica stringente:** 12 giorni dalla riscossione → l'emissione va automatizzata al momento del pagamento o del check-out.
3. **Tipologia clienti reale:**
   - **Privati italiani senza P.IVA** → codice destinatario `0000000`, SDI deposita la fattura nel loro cassetto fiscale, è ok.
   - **Privati stranieri (la maggioranza)** → codice destinatario `XXXXXXX` (sette X), si invia comunque al SDI **e in più** copia PDF via email al cliente (l'XML resta solo per AdE). Da gestire esplicitamente.
   - **Aziende italiane** (rare ma capitano) → codice destinatario a 7 caratteri o PEC.
4. **Aliquota IVA tipica strutture ricettive:** 10% (art. 10, n. 8-bis DPR 633/72). **Da confermare** con il commercialista, in particolare per soggetti esteri (regole art. 7-quater).
5. **Numerazione:** sezionale dedicato (es. "FE/2026/1, 2, 3...") con incremento atomico — pattern da curare in serverless (transazione `UPDATE ... RETURNING` su Turso).

---

## 5. Architettura proposta (modulo da aggiungere)

### 5.1 Nuove tabelle DB

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ragione_sociale TEXT NOT NULL,
  nome TEXT, cognome TEXT,
  partita_iva TEXT,           -- es. IT01340960481
  codice_fiscale TEXT,
  codice_destinatario TEXT,   -- 7 char SDI, default '0000000'
  pec TEXT,
  indirizzo TEXT, cap TEXT, comune TEXT, provincia TEXT, nazione TEXT DEFAULT 'IT',
  tipo_soggetto TEXT,         -- 'privato' | 'azienda' | 'pa'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL,        -- es. 1/2026
  sezionale TEXT DEFAULT 'FE',
  data_emissione DATE NOT NULL,
  customer_id INTEGER NOT NULL,
  booking_id INTEGER,          -- FK opzionale verso bookings
  imponibile REAL NOT NULL,
  iva_aliquota REAL DEFAULT 22.0,
  iva_importo REAL NOT NULL,
  totale REAL NOT NULL,
  natura_iva TEXT,             -- es. N4 per esente
  stato_sdi TEXT DEFAULT 'bozza',  -- bozza|inviata|consegnata|scartata|accettata|rifiutata
  identificativo_sdi TEXT,
  xml_url TEXT,                -- file XML su Blob
  pdf_url TEXT,                -- PDF leggibile su Blob
  notifiche_json TEXT,         -- log notifiche SDI in JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  descrizione TEXT NOT NULL,
  quantita REAL DEFAULT 1,
  prezzo_unitario REAL NOT NULL,
  aliquota_iva REAL DEFAULT 22.0,
  natura_iva TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE invoice_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ragione_sociale_emittente TEXT NOT NULL,
  partita_iva_emittente TEXT NOT NULL,
  codice_fiscale_emittente TEXT,
  regime_fiscale TEXT DEFAULT 'RF01',
  indirizzo TEXT, cap TEXT, comune TEXT, provincia TEXT, nazione TEXT DEFAULT 'IT',
  rea TEXT, capitale_sociale REAL,
  pec_mittente TEXT,
  pec_password_encrypted TEXT,   -- per Opzione B
  provider_api_key_encrypted TEXT, -- per Opzione C
  prossimo_numero INTEGER DEFAULT 1,
  anno_corrente INTEGER
);
```

### 5.2 Nuove API routes

```
src/app/api/invoices/
├── route.ts                    GET (lista) + POST (crea bozza)
├── [id]/route.ts               GET dettaglio, PATCH, DELETE bozza
├── [id]/xml/route.ts           GET genera/scarica XML FatturaPA 1.2.2
├── [id]/pdf/route.ts           GET genera PDF (foglio di stile AdE)
├── [id]/send/route.ts          POST → invio (PEC o provider, secondo opzione)
└── [id]/notifications/route.ts GET notifiche SDI

src/app/api/customers/
├── route.ts                    GET, POST
└── [id]/route.ts               GET, PATCH, DELETE

src/app/api/invoice-settings/route.ts   configurazione emittente

src/app/api/cron/sdi-poll/route.ts      cron Vercel: legge PEC e aggiorna stati
```

### 5.3 Nuove pagine admin

```
src/app/admin/
├── fatturazione/
│   ├── page.tsx                lista fatture + filtri
│   ├── nuova/page.tsx          crea fattura (anche da prenotazione)
│   ├── [id]/page.tsx           dettaglio + anteprima XML/PDF + invio
│   └── clienti/page.tsx        anagrafica clienti
└── impostazioni/page.tsx       (estendere) tab "Fatturazione"
```

### 5.4 Libreria core da scrivere

```
src/lib/fatturapa/
├── xml-builder.ts        builder XML FatturaPA v1.2.2 (usare xml2js già in deps)
├── validator.ts          validazione contro XSD
├── numbering.ts          generazione numero progressivo con lock atomico Turso
├── pdf-render.ts         render PDF da XML (usare puppeteer o pdf-lib)
└── senders/
    ├── pec.ts            invio via SMTP PEC (nodemailer)
    ├── acube.ts          client API ACube
    └── fatture-in-cloud.ts client API FIC
```

---

## 6. Risposta diretta alle domande

**Q: È fattibile implementare la fatturazione elettronica nel sito?**
**R:** Sì, l'architettura attuale (Next.js + Turso + Blob) è perfettamente adatta. Va aggiunto un modulo isolato senza toccare il resto.

**Q: È possibile l'invio "diretto al cassetto fiscale" come Krossbooking?**
**R:** Tecnicamente sì ma con due precisazioni: (1) "diretto" è marketing — dietro c'è sempre un canale accreditato SDI; (2) la strada davvero "diretta e gratuita" per una SRL singola è la **PEC verso `sdi01@pec.fatturapa.it`** (Opzione B) — è un canale ufficiale SDI gratuito.

**Q: Si può fare a costo zero?**
**R:** Sì, in due modi:
- **Opzione A** (XML + upload manuale): 0 € sempre, qualche secondo di lavoro manuale per fattura.
- **Opzione B** (XML + invio PEC automatico): 0 € se la PEC della SRL è già attiva (e per una SRL lo è per legge), ma più complesso da sviluppare.

**Q: Quale consigli concretamente?**
**R:** Visto l'obbligo di fattura per ogni ospite entro 12 giorni, l'upload manuale (Opzione A) **non basta**. Le due strade praticabili sono:

- **Strada consigliata: Opzione C con ACube** (~20 €/anno + ~0,10 € a fattura). 3–4 giorni di sviluppo, invio automatico, gestione notifiche SDI inclusa, conservazione sostitutiva opzionale a norma. È la via più rapida e affidabile.
- **Strada zero-costi: Opzione B con PEC**. 8–12 giorni di sviluppo, ma una volta a regime è completamente gratuita. Adatta se si vuole evitare ogni dipendenza esterna.

In entrambi i casi, l'**Opzione A va comunque costruita per prima** (generatore XML + anagrafica clienti + numerazione + UI): rappresenta il 70% del lavoro ed è il fondamento di B e C. La differenza è solo il "trasportatore" finale.

**Q: API da utilizzare?**
**R:**
- Per Opzione A: **nessuna API esterna**. Solo XSD ufficiale FatturaPA (`fatturapa.gov.it`) + foglio di stile AdE.
- Per Opzione B: **SMTP/IMAP della PEC** (Aruba, Legalmail, Poste). Non sono "API" ma protocolli standard.
- Per Opzione C: **ACube** (https://acubeapi.com), **Fatture in Cloud** (https://developers.fattureincloud.it), **Aruba** (https://www.fatturazioneelettronica.aruba.it/api).

---

## 7. Rischi e cose da non sottovalutare

1. **Numerazione progressiva atomica:** in serverless (Vercel) bisogna lockare correttamente l'incremento del numero su Turso (transazione `UPDATE ... RETURNING`). Pattern noto, ma da curare.
2. **Conservazione sostitutiva a norma (10 anni):** non basta salvare l'XML su Blob. Serve un servizio di conservazione AgID-accreditato (es. Aruba Conservazione ~30 €/anno, Cassetto Fiscale ne fa una "conservazione semplice" gratuita ma non sostitutiva). Va deciso a livello fiscale.
3. **Codice destinatario / PEC del cliente:** se il cliente non li fornisce, la fattura va con `0000000` e SDI la mette nel cassetto fiscale del cliente. È legittimo ma dovremmo gestirlo nel form.
4. **Affitti brevi e regime fiscale:** prima di sviluppare, allineare con il commercialista quali fatture vanno realmente emesse e con che natura IVA.
5. **Sicurezza:** P.IVA, dati clienti e (se Opzione B) password PEC vanno cifrati a riposo. La SRL è titolare GDPR.

---

## 8. Sintesi finale (TL;DR)

| Domanda | Risposta breve |
|---|---|
| Fattibile? | **Sì** |
| A costo zero? | **Sì**, con upload manuale (Opzione A) o PEC (Opzione B) |
| "Direttamente al cassetto fiscale" come Krossbooking? | **Sì via PEC**, che è canale ufficiale SDI gratuito |
| API AdE pubbliche? | **No**, non esistono per i singoli contribuenti |
| Quanti giorni di sviluppo? | **4–6** (A) · **8–12** (B) · **3–4** (C) |
| Costo a regime? | **0 €** (A/B) · **20–50 €/anno** (C) |
| Cosa fare prima di partire? | Confermare aliquota IVA e gestione clienti esteri col commercialista |

**Raccomandazione aggiornata (post-conferma commercialista):** sviluppare **prima** la base comune (XML + clienti + numerazione + UI) — Opzione A — e **subito dopo** integrare **ACube** (Opzione C, ~20 €/anno) per l'invio automatico. Il delta in giornate è basso (3–4 gg in più rispetto alla sola A), il rischio operativo cala drasticamente, e se in futuro si vuole tornare gratis basta sostituire il sender con quello PEC senza riscrivere il resto.
