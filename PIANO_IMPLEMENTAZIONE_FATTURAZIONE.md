# Piano di Implementazione — Fatturazione Elettronica
**Immobiliare Fiumana S.r.l. · P.IVA IT01340960481**
*Data piano: 28 aprile 2026*

---

## 0. Sommario esecutivo

Si implementa un modulo di fatturazione elettronica integrato dentro il backend `immobiliare-fiumana` (Next.js 14 + Turso + Vercel Blob). Modalità di trasmissione: **Opzione C — intermediario API**, tecnicamente identica a quella usata da Krossbooking.

**Provider scelto: ACube.** Verifica fatta direttamente sulla doc ufficiale (apr 2026):
- **Aliquota IVA: 10% confermata** dal commercialista (strutture ricettive).
- Webhook con eventi granulari: `customer-invoice`, `customer-notification`, `invoice-status-quarantena`, `invoice-status-invoice-error`, `legal-storage-receipt`.
- Sicurezza webhook a due livelli: secret token + HTTP signature verification.
- Retry policy: 15 tentativi × 300s con backoff 1,25 (copre ~10h di outage del nostro endpoint).
- Retrigger manuale dei webhook persi: `POST /invoices/{id}/notify`.
- OpenAPI 3.0 spec scaricabile → TypeScript SDK auto-generabile.
- Conservazione legale come prodotto distinto e documentato (https://docs.acubeapi.com/documentation/preservation/).

**Stima sviluppo:** 13 giornate sviluppatore (~101 ore di lavoro).
**Costo runtime annuo previsto:** 20–80 €/anno tutto compreso (preventivo finale dopo contatto commerciale ACube).

L'architettura è **sender-agnostic**: il provider è solo un'implementazione di un'interfaccia astratta, sostituibile in futuro senza rifare il modulo.

### 0.1 Mitigazione anti lock-in (portabilità)

Standard di mercato per gli intermediari italiani: dopo la disdetta restano **90 giorni** di accesso per scaricare gli archivi, poi cancellazione. ACube non pubblica termini diversi nella doc tecnica (le clausole stanno nel contratto firmato).

**Mitigazione tecnica già nel piano:** ad ogni webhook archiviamo **una copia indipendente di TUTTO** su Vercel Blob privato:

```
invoices/{anno}/{invoice_id}/
  ├── IT01340960481_xxxxx.xml    (fattura emessa)
  ├── ricevuta_RC.xml             (ricevuta consegna SDI)
  ├── ricevuta_NS.xml             (eventuale notifica scarto)
  ├── ricevuta_MC.xml             (eventuale mancata consegna)
  ├── ricevuta_legal_storage.xml  (ricevuta conservazione)
  └── pdf_cortesia.pdf            (copia per il cliente)
```

Se domani ACube fallisce o cambiamo provider, esportiamo la cartella Blob. Non dipendiamo da loro per la portabilità tecnica dei dati.

### 0.2 Domande da chiudere con ACube prima della firma

Da inserire nell'email di apertura account/preventivo:

1. **Export e portabilità:** "In caso di disdetta, qual è il periodo di accessibilità per scaricare archivi e fatture? Esiste un endpoint API per export massivo (ZIP completo di XML + ricevute) o serve solo download manuale dalla dashboard?"
2. **Conservazione a norma:** "La conservazione sostitutiva inclusa nel piano è 'a norma DPCM 3/12/2013 / Linee Guida AgID' oppure è semplice archiviazione tecnica?"
3. **Pricing per il caso Fiumana:** "Confermate il prezzo annuo per circa 300 fatture/anno con conservazione 10 anni inclusa, regime ordinario RF01, P.IVA IT01340960481? E il costo dell'ambiente sandbox per sviluppo?"

---

## 1. Logica fiscale chiarita (con caso reale)

### 1.1 Esempio reale — prenotazione HMTAFDJS9M

| Voce | Importo |
|---|---|
| Costo camera (4 notti × 70 €) | 280,00 € |
| Pulizie | 60,00 € |
| Tasse di soggiorno | 4,00 € |
| **Totale pagato dall'ospite ad Airbnb** | **344,00 €** |
| Commissione Airbnb (15,5%) | -52,70 € |
| **Compenso netto host** | **287,30 €** |

### 1.2 Cosa fattura Fiumana al cliente finale

| Calcolo | Valore |
|---|---|
| Imponibile lordo IVA = totale ospite − tasse soggiorno | 344 − 4 = **340,00 €** |
| Imponibile netto = 340 / 1,10 | **309,09 €** |
| IVA 10% = 340 − 309,09 | **30,91 €** |
| Totale fattura cliente | **340,00 €** |

### 1.3 Cosa NON va in fattura e cosa sì (importante — chiarimento)

- **Tasse di soggiorno (4 €)**: NON in fattura. Incassate "in nome e per conto" del Comune. Versate separatamente. Non sono imponibile, niente IVA.
- **Commissioni Airbnb (52,70 €) — IN FATTURA, ma implicitamente:** la fattura attiva di Fiumana al cliente è di **340 €** (importo lordo commissioni, netto tasse soggiorno). Le commissioni Airbnb sono **rifatturate al cliente dentro questo totale di 340 €**, non come riga separata: il cliente vede solo "Affitto suite ... 340 €". Per Fiumana questo significa:
  - **Ricavo:** 340 € (riga fattura attiva al cliente)
  - **Costo deducibile:** 52,70 € (fattura passiva Airbnb Ireland in reverse charge UE — vedi PDF `AIUC-61286312-IT-4026323`)
  - **Margine lordo:** 287,30 € (= 340 − 52,70)
  - L'IVA italiana 22% sui 52,70 € va auto-liquidata in reverse charge dal commercialista (non riguarda direttamente il modulo di fatturazione attiva).

**Implicazione architetturale:** il modulo emette fatture attive con totale 340 € (= booking.total_amount − city_tax). La commissione resta tracciata in `bookings.airbnb_commission` per scopi di riconciliazione e reportistica (matching con fattura passiva ricevuta), ma **non è uno sconto** né una riga della fattura attiva.

### 1.4 Dati fiscali della fattura

- **Tipo documento SDI:** `TD01` (fattura immediata)
- **Aliquota IVA:** 10% (strutture ricettive, art. 10 n. 8-bis DPR 633/72)
- **Regime fiscale emittente:** `RF01` (ordinario)
- **Modalità pagamento:** `MP08` (carta) — l'ospite ha pagato con carta su Airbnb
- **Data pagamento:** check-in (Airbnb fa il payout ~24h dopo check-in)
- **Data fattura:** entro 12 giorni dalla data pagamento
- **Natura IVA:** vuota (non si applica `<Natura>` quando l'IVA italiana è dovuta)

### 1.5 Caso cliente estero (es. Yana Kachura, Ucraina)

Verificato dagli screenshot Krossbooking:

| Campo | Valore |
|---|---|
| Tipologia | Privato |
| Codice Fiscale | `XXX` (placeholder, no CF italiano) |
| Nazione | `UA` (Ucraina) |
| Codice Univoco / Destinatario | `XXXXXXX` (sette X) |
| PEC | (vuota) |
| Indirizzo | indirizzo dichiarato dal guest |

**Comportamento atteso SDI:** la fattura viene comunque accettata, lo stato sarà tipicamente `NotificaMancataConsegna` (il cliente non ha cassetto fiscale italiano). È fiscalmente valida lo stesso. **Va inviata copia PDF di cortesia per email** al cliente (Resend è già nelle dipendenze).

### 1.6 Caso cliente italiano privato senza P.IVA

| Campo | Valore |
|---|---|
| Codice Fiscale | CF a 16 caratteri |
| Codice Univoco / Destinatario | `0000000` (sette zeri) |

SDI deposita la fattura nel cassetto fiscale del cliente e Fiumana invia copia PDF via email come cortesia.

---

## 2. Provider scelto e alternative

### 2.1 Tabella comparativa aggiornata (apr 2026)

| Provider | Pricing | Sandbox | Webhook SDI | Conservazione 10 anni | DX |
|---|---|---|---|---|---|
| **ACube** | Pay-per-use, custom su volumi | ✅ gratuita | ✅ nativi | ✅ inclusa nei piani standard | ⭐⭐⭐⭐⭐ |
| **Openapi SDI** | 0,025 €/fattura abbonamento · 0,07 €/fattura singola · 0,035 € conservazione | ✅ gratuita | ✅ | ✅ add-on a 0,035 €/fattura | ⭐⭐⭐⭐ |
| **Fatture in Cloud** | Da SaaS Premium (~5–15 €/mese) — API inclusa nei piani alti | ✅ demo | ✅ | ✅ in alcuni tier | ⭐⭐⭐⭐ |
| **Aruba Fatturazione** | Canone annuo ~25 € + bundle | ✅ test | ⚠️ limitati | ⚠️ add-on | ⭐⭐⭐ |

### 2.2 Raccomandazione

**ACube** come prima scelta per: webhook SDI nativi (no polling = meno cron, meno bug), sandbox completa, multi-tenant pronto se in futuro aprite altre SRL/strutture, conservazione inclusa nel piano. Il pricing custom richiede di contattarli ma per ~300 fatture/anno è generalmente molto competitivo.

**Openapi SDI** come fallback con pricing pubblico immediato: per 300 fatture/anno con conservazione ≈ 0,06 € × 300 = **18 €/anno totali**. Eccellente se si vuole partire senza chiamate commerciali.

**Fatture in Cloud** solo se serve dare accesso anche al commercialista a una UI pronta — si paga di più ma si elimina la dashboard custom.

> ⚠️ **Verifiche obbligatorie prima della firma:** (a) la conservazione sostitutiva è "a norma DPCM 3/12/2013 / Linee Guida AgID" e non semplice archiviazione; (b) clausola di **portabilità**: export ZIP completo (XML + ricevute) gratis alla disdetta, per evitare lock-in; (c) limiti su volumi sandbox.

### 2.3 Pattern reale ACube (verificato sulla doc ufficiale 28 apr 2026)

**Endpoint unico:** `POST /invoices`. Risposta: `HTTP 202` + `{ "uuid": "<invoice UUID>" }` immediata. Tutto il resto arriva via webhook.

#### Step 0 — Setup una tantum: NumberingSequence

ACube **gestisce internamente la numerazione progressiva**, eliminando la necessità di transazioni atomiche su Turso. Si crea **una sola volta**:

```bash
curl -X POST https://api-sandbox.acubeapi.com/numbering-sequences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FiumanaAIR",
    "format": "%Y/AIR/%04s",
    "number": 0
  }'
# → { "uuid": "...", "name": "FiumanaAIR", ... }
```

Il `uuid` torna salvato in `invoice_settings.numbering_sequence_uuid`. Garanzie:
- Counter incrementa **solo se invio OK** → niente buchi.
- Reset automatico al 1° gennaio.
- Nuova sequenza creata da sola per il nuovo anno.

#### Step 1 — Invio fattura (FatturaPA JSON, snake_case)

ACube accetta sia FatturaPA XML PascalCase sia FatturaPA JSON snake_case. **Per Fiumana usiamo JSON** (più semplice da serializzare in TypeScript). I nomi dei campi sono il tracciato AdE convertito in snake_case.

```bash
curl -X POST https://api-sandbox.acubeapi.com/invoices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fattura_elettronica_header": {
      "dati_trasmissione": {
        "codice_destinatario": "XXXXXXX"
      },
      "cedente_prestatore": {
        "dati_anagrafici": {
          "id_fiscale_iva": { "id_paese": "IT", "id_codice": "01340960481" },
          "codice_fiscale": "01340960481",
          "anagrafica": { "denominazione": "Immobiliare Fiumana S.r.l." },
          "regime_fiscale": "RF01"
        },
        "sede": {
          "indirizzo": "Via del Seminario, 79",
          "cap": "59100", "comune": "Prato", "provincia": "PO", "nazione": "IT"
        }
      },
      "cessionario_committente": {
        "dati_anagrafici": {
          "codice_fiscale": "0000000",
          "anagrafica": { "cognome": "Kachura", "nome": "Yana" }
        },
        "sede": {
          "indirizzo": "Kiev",
          "cap": "00000", "comune": "Kiev", "provincia": "EE", "nazione": "UA"
        }
      }
    },
    "fattura_elettronica_body": [{
      "dati_generali": {
        "dati_generali_documento": {
          "tipo_documento": "TD01",
          "divisa": "EUR",
          "data": "2026-04-21",
          "numero": "getNumero(FiumanaAIR)",
          "importo_totale_documento": "340.00"
        }
      },
      "dati_beni_servizi": {
        "dettaglio_linee": [{
          "numero_linea": 1,
          "descrizione": "Affitto Incantevole Suite sul Mare 18-22 Aprile 2026",
          "quantita": "1.00",
          "prezzo_unitario": "309.09",
          "prezzo_totale": "309.09",
          "aliquota_iva": "10.00"
        }],
        "dati_riepilogo": [{
          "aliquota_iva": "10.00",
          "imponibile_importo": "309.09",
          "imposta": "30.91",
          "esigibilita_iva": "I"
        }]
      },
      "dati_pagamento": [{
        "condizioni_pagamento": "TP02",
        "dettaglio_pagamento": [{
          "modalita_pagamento": "MP08",
          "data_scadenza_pagamento": "2026-04-18",
          "importo_pagamento": "340.00"
        }]
      }]
    }]
  }'

# → HTTP 202
# { "uuid": "f3a1c0de-1234-..." }
```

Note importanti:
- `codice_destinatario` = `XXXXXXX` per esteri, `0000000` per privati italiani.
- ACube auto-compila `id_trasmittente`, `progressivo_invio`, `formato_trasmissione` dentro `dati_trasmissione` — non li mandiamo.
- `numero` usa il placeholder `getNumero(FiumanaAIR)` → ACube lo sostituisce.
- Il filename XML viene generato da ACube come `IT10442360961ACB26_<5char>.xml` (la VAT di ACube come trasmittente, non la nostra: questo è normale).

#### Step 2 — Webhook in arrivo

Stato marking ACube transita: `waiting → sent` (caso normale) oppure `waiting → quarantena → sent | invoice-error`.

Body ricevuto:
```json
{
  "uuid": "f3a1c0de-1234-...",
  "marking": "sent",
  "previous_marking": "waiting",
  "notice": null,
  "transioned_at": "2026-04-21T18:45:49Z"
}
```

⚠️ Il campo è `transioned_at` (refuso lato ACube, manca la "t"). Da rispettare alla lettera nel parser.

Eventi webhook configurabili:
- `customer-invoice` — fattura inviata con successo al SDI
- `customer-notification` — notifica SDI (RC/MC/NS/NE/DT)
- `invoice-status-quarantena` — primo fallimento di invio
- `invoice-status-invoice-error` — fallimento definitivo dopo retry
- `legal-storage-receipt` — ricevuta della conservazione a norma

---

## 3. Schema database (Turso/SQLite)

Da aggiungere in `src/lib/db.ts` dentro `initializeDb`. Importi memorizzati in **centesimi (INTEGER)** per evitare problemi di floating point.

```sql
-- 3.1 Configurazione emittente (singleton, id=1)
CREATE TABLE IF NOT EXISTS invoice_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ragione_sociale TEXT NOT NULL,
  partita_iva TEXT NOT NULL,
  codice_fiscale TEXT NOT NULL,
  regime_fiscale TEXT NOT NULL DEFAULT 'RF01',
  indirizzo TEXT NOT NULL,
  cap TEXT NOT NULL,
  comune TEXT NOT NULL,
  provincia TEXT NOT NULL,
  nazione TEXT NOT NULL DEFAULT 'IT',
  iban TEXT,
  rea TEXT,
  capitale_sociale_cents INTEGER,
  -- credenziali sender (cifrate AES-256-GCM)
  sender_provider TEXT,                 -- 'acube' | 'openapi' | 'mock'
  sender_api_key_encrypted TEXT,        -- bearer token (refresh via OAuth2 password grant)
  sender_endpoint TEXT,                 -- 'https://api-sandbox.acubeapi.com' o prod
  sender_test_mode INTEGER DEFAULT 1,
  webhook_secret TEXT,                  -- per verifica HTTP signature webhook ACube
  -- ACube specific
  acube_business_registry_uuid TEXT,    -- UUID della BusinessRegistryConfiguration creata in ACube
  acube_numbering_sequence_uuid TEXT,   -- UUID della NumberingSequence (es. "FiumanaAIR")
  acube_numbering_sequence_name TEXT DEFAULT 'FiumanaAIR',
  acube_credit_note_sequence_name TEXT DEFAULT 'FiumanaAIRNC',
  -- conservazione
  conservazione_provider TEXT,
  -- tasse soggiorno (default per pre-fill)
  tassa_soggiorno_default_cents INTEGER DEFAULT 200, -- 2,00 €/notte/persona
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 Anagrafica clienti (separata da guests perché serve indirizzo fiscale completo)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL DEFAULT 'PF',        -- PF privato | PG azienda
  ragione_sociale TEXT,
  cognome TEXT,
  nome TEXT,
  codice_fiscale TEXT,
  partita_iva TEXT,
  nazione TEXT NOT NULL DEFAULT 'IT',     -- ISO-3166 alpha-2
  indirizzo TEXT,
  cap TEXT,
  comune TEXT,
  provincia TEXT,                          -- 'EE' per estero
  email TEXT,
  pec TEXT,
  codice_destinatario TEXT DEFAULT '0000000',
  is_estero INTEGER DEFAULT 0,
  source_guest_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_guest_id) REFERENCES guests(id)
);
CREATE INDEX IF NOT EXISTS idx_customers_cf ON customers(codice_fiscale);
CREATE INDEX IF NOT EXISTS idx_customers_piva ON customers(partita_iva);
CREATE INDEX IF NOT EXISTS idx_customers_nazione ON customers(nazione);

-- 3.3 Fatture
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_documento TEXT NOT NULL DEFAULT 'TD01',  -- TD01 | TD04 nota credito
  sezionale TEXT NOT NULL,
  numero INTEGER,                                -- NULL fino al send
  anno INTEGER,
  numero_completo TEXT,                          -- es. '2026/AIR/0004'
  data_documento DATE NOT NULL,
  -- riferimenti
  booking_id INTEGER,
  customer_id INTEGER NOT NULL,
  parent_invoice_id INTEGER,                     -- per nota credito
  idempotency_key TEXT UNIQUE,
  -- importi (centesimi)
  imponibile_cents INTEGER NOT NULL,
  iva_cents INTEGER NOT NULL,
  totale_cents INTEGER NOT NULL,
  aliquota_iva REAL NOT NULL DEFAULT 10.0,
  natura_iva TEXT,
  -- snapshot booking
  booking_total_cents INTEGER,
  city_tax_cents INTEGER,
  airbnb_commission_cents INTEGER,
  -- pagamento
  modalita_pagamento TEXT DEFAULT 'MP08',
  data_pagamento DATE,
  -- workflow
  stato TEXT NOT NULL DEFAULT 'bozza',
  -- bozza | in_invio | inviata_sdi | consegnata | mancata_consegna | scartata | annullata
  stato_sdi TEXT,
  external_id TEXT,
  sdi_identificativo TEXT,
  -- file
  xml_url TEXT,
  xml_filename TEXT,
  pdf_url TEXT,
  ricevuta_consegna_url TEXT,
  -- tracking
  inviata_at DATETIME,
  consegnata_at DATETIME,
  last_polled_at DATETIME,
  poll_attempts INTEGER DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id),
  UNIQUE (sezionale, numero, anno, tipo_documento)
);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stato ON invoices(stato);
CREATE INDEX IF NOT EXISTS idx_invoices_data ON invoices(data_documento);
CREATE INDEX IF NOT EXISTS idx_invoices_external ON invoices(external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_idemp ON invoices(idempotency_key);

-- 3.4 Righe fattura
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  riga_numero INTEGER NOT NULL,
  descrizione TEXT NOT NULL,
  quantita REAL DEFAULT 1,
  prezzo_unitario_cents INTEGER NOT NULL,        -- al netto IVA
  aliquota_iva REAL NOT NULL DEFAULT 10.0,
  natura_iva TEXT,
  imponibile_cents INTEGER NOT NULL,
  iva_cents INTEGER NOT NULL,
  totale_cents INTEGER NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);

-- 3.5 Storico notifiche SDI (audit trail)
CREATE TABLE IF NOT EXISTS invoice_sdi_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  -- send_request | send_response | RC | NS | MC | NE | EC | DT | poll | webhook | error
  event_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  http_status INTEGER,
  payload_in TEXT,
  payload_out TEXT,
  error_code TEXT,
  error_message TEXT,
  raw_xml_url TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sdi_logs_invoice ON invoice_sdi_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sdi_logs_event ON invoice_sdi_logs(event_type);

-- 3.6 ALTER bookings (due nuovi campi necessari)
-- ATTENZIONE: SQLite non ha "ADD COLUMN IF NOT EXISTS" — usare PRAGMA table_info check
ALTER TABLE bookings ADD COLUMN city_tax_amount REAL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN airbnb_commission REAL DEFAULT 0;
```

---

## 4. Numerazione progressiva — delegata ad ACube

**SCOPERTA CHIAVE dalla doc ACube:** la numerazione progressiva è gestita server-side da ACube tramite l'API `NumberingSequence`. **Eliminiamo completamente** la complessità delle transazioni atomiche su Turso.

### 4.1 Setup (una sola volta, in fase di onboarding)

In `impostazioni/page.tsx`, al primo salvataggio delle credenziali ACube, chiamiamo:

```ts
// src/lib/fatturapa/sender/acube.ts
async function createNumberingSequence(name: string, format: string) {
  const res = await fetch(`${endpoint}/numbering-sequences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, format, number: 0 }),
  });
  const data = await res.json();
  return data.uuid;
}

// Per Fiumana:
const seqInvoices    = await createNumberingSequence('FiumanaAIR',   '%Y/AIR/%04s');
const seqCreditNotes = await createNumberingSequence('FiumanaAIRNC', '%Y/AIR-NC/%04s');
// salviamo i UUID in invoice_settings
```

### 4.2 Uso nelle fatture

Nel payload JSON inviato ad ACube basta usare il placeholder:

```json
{
  "fattura_elettronica_body": [{
    "dati_generali": {
      "dati_generali_documento": {
        "numero": "getNumero(FiumanaAIR)",
        ...
      }
    }
  }]
}
```

ACube sostituisce con `2026/AIR/0001`, `2026/AIR/0002`, ecc. Garanzie:
- **Counter incrementa solo se l'invio ha successo** → buchi impossibili by design.
- **Reset automatico** il 1° gennaio.
- **Nuova sequenza** creata in automatico al cambio anno.

### 4.3 Cosa salviamo lato Fiumana

Quando ACube risponde 202 con l'UUID dell'invoice, **non sappiamo ancora il numero finale**. Lo riceviamo via webhook `customer-invoice` (success) leggendo dal payload `fattura_elettronica_body[0].dati_generali.dati_generali_documento.numero`. A quel punto popoliamo i campi `invoices.numero_completo`, `invoices.numero`, `invoices.anno` nel DB locale.

### 4.4 Cosa NON facciamo più

- Funzione `reserveInvoiceNumber()` con transazione `BEGIN IMMEDIATE` — eliminata.
- Colonne `next_invoice_number`, `next_credit_note_number`, `next_xml_progressivo`, `current_year` in `invoice_settings` — eliminate.
- File `src/lib/fatturapa/numbering.ts` — non serve più.
- Pattern reserve-after-200 — non serve.

Risparmio: ~6 ore di sviluppo + zero classi di bug legati a race condition di numerazione.

---

## 5. Struttura cartelle

```
src/lib/fatturapa/
  index.ts
  types.ts                     # Invoice, InvoiceItem, Customer, SDIMarking, SendResult
  calculator.ts                # calc imponibile da booking, scomputo city tax
  customer-mapper.ts           # Guest → Customer (gestione esteri)
  booking-mapper.ts            # Booking → bozza Invoice (pre-fill)
  state-machine.ts             # transizioni stato + guards (mappa marking ACube → stato locale)
  crypto.ts                    # AES-256-GCM per credenziali sender
  storage.ts                   # upload/download Vercel Blob (XML privato, mirror)
  pdf.ts                       # PDF cortesia (pdfkit / @react-pdf)
  events.ts                    # helper log invoice_sdi_logs
  payload-builder.ts           # costruisce il JSON FatturaPA snake_case da Invoice locale
  sender/
    interface.ts               # InvoiceSender astratto
    factory.ts                 # getSender() in base a settings
    acube.ts                   # impl ACube (POST /invoices, NumberingSequence, webhook parser)
    acube-auth.ts              # OAuth2 password grant + refresh token
    mock.ts                    # impl test/dev (simula tutti i marking)

src/app/api/invoices/
  route.ts                                  # GET lista, POST crea bozza
  [id]/route.ts                             # GET, PATCH, DELETE bozza
  [id]/send/route.ts                        # POST invia a SDI
  [id]/poll/route.ts                        # POST forza polling stato
  [id]/xml/route.ts                         # GET scarica XML (signed)
  [id]/pdf/route.ts                         # GET PDF cortesia
  [id]/credit-note/route.ts                 # POST crea TD04
  [id]/zip/route.ts                         # GET zip (XML+ricevuta+PDF)
  [id]/email/route.ts                       # POST invia copia cortesia al cliente
  from-booking/[bookingId]/route.ts         # POST crea bozza da prenotazione
  customers/route.ts
  customers/[id]/route.ts
  settings/route.ts
  webhook/[provider]/route.ts               # POST webhook da intermediario
  cron/poll-sdi/route.ts                    # GET cron Vercel (fallback polling)

src/app/admin/fatturazione/
  page.tsx                                  # lista (replica UX Krossbooking)
  nuova/page.tsx                            # form creazione manuale
  [id]/page.tsx                             # dettaglio + log SDI + azioni
  [id]/modifica/page.tsx                    # editor bozza
  clienti/page.tsx
  clienti/[id]/page.tsx
  impostazioni/page.tsx                     # estendere quella esistente con tab "Fatturazione"
  components/
    InvoiceList.tsx
    InvoiceFilters.tsx                      # periodo, stato, sezionale, cliente
    InvoiceForm.tsx                         # replica form Krossbooking
    InvoiceLineItem.tsx
    SDIStatusBadge.tsx                      # RC/NS/MC verde/rosso/giallo
    PollSDIButton.tsx
    InvoicePreview.tsx
    PrefillFromBookingButton.tsx
```

---

## 6. Interfaccia astratta del sender

```ts
// src/lib/fatturapa/sender/interface.ts
export type SDIStatusCode =
  | 'INVIATA'
  | 'RICEVUTA_CONSEGNA'        // RC — buon esito
  | 'NOTIFICA_MANCATA_CONSEGNA' // MC — valido fiscalmente, niente cassetto cliente
  | 'NOTIFICA_SCARTO'          // NS — terminale, da rifare
  | 'NOTIFICA_ESITO'           // NE — accettata/rifiutata da committente
  | 'DECORRENZA_TERMINI'       // DT — 15gg senza esito = accettata
  | 'IN_ELABORAZIONE'
  | 'ERRORE';

export interface SendResult {
  externalId: string;
  sdiIdentificativo?: string;
  acceptedAt: Date;
  rawResponse: unknown;
}

export interface SDIStatus {
  code: SDIStatusCode;
  occurredAt: Date;
  errorCode?: string;
  errorMessage?: string;
  ricevutaUrl?: string;          // URL ricevuta SDI (XML)
  rawResponse: unknown;
}

export interface InvoiceSender {
  readonly providerName: string;
  send(xml: Buffer, ctx: { invoiceId: number; numeroCompleto: string; idempotencyKey: string }): Promise<SendResult>;
  getStatus(externalId: string): Promise<SDIStatus>;
  downloadReceipt(externalId: string): Promise<Buffer | null>;
  parseWebhook(headers: Record<string,string>, body: unknown): { externalId: string; status: SDIStatus } | null;
}
```

`factory.ts` legge `invoice_settings.sender_provider` e ritorna l'implementazione concreta. In test/dev si usa `MockSender`.

---

## 7. Macchina a stati della fattura (allineata ai marking ACube)

Stato locale Fiumana ↔ marking ACube:

| Stato Fiumana | Marking ACube | Transizione triggerata da |
|---|---|---|
| `bozza` | — (non ancora inviata) | UI |
| `in_invio` | — | POST `/api/invoices/[id]/send` (chiama ACube `POST /invoices`) |
| `accettata_acube` | `waiting` | risposta 202 ACube con UUID |
| `quarantena` | `quarantena` | webhook `invoice-status-quarantena` |
| `inviata_sdi` | `sent` | webhook `customer-invoice` |
| `consegnata` | `sent` + notifica RC | webhook `customer-notification` con esito RC |
| `mancata_consegna` | `sent` + notifica MC | webhook `customer-notification` con esito MC |
| `scartata` | `sent` + notifica NS | webhook `customer-notification` con esito NS |
| `errore_invio` | `invoice-error` | webhook `invoice-status-invoice-error` |
| `annullata` | — | UI cancellazione bozza |

```
[bozza]
  ├─ EDIT   → [bozza]
  ├─ DELETE → (rimossa)
  └─ SEND   → [in_invio]
                ├─ ACube 202 → [accettata_acube]   (marking ACube: waiting)
                ├─ ACube 400 → [bozza] + errore validation
                └─ ACube 500/timeout → [bozza] + retry

[accettata_acube]                                    (marking ACube: waiting)
  ├─ webhook customer-invoice          → [inviata_sdi]
  └─ webhook invoice-status-quarantena → [quarantena]

[quarantena]                                          (marking ACube: quarantena)
  ├─ webhook customer-invoice              → [inviata_sdi]   (retry riuscito)
  └─ webhook invoice-status-invoice-error  → [errore_invio]

[inviata_sdi]                                         (marking ACube: sent)
  └─ webhook customer-notification:
       ├─ esito RC → [consegnata]
       ├─ esito MC → [mancata_consegna]   (valido fiscalmente)
       ├─ esito NS → [scartata]            (terminale, serve riemissione)
       ├─ esito NE → resta [inviata_sdi] o [consegnata]
       └─ esito DT → [consegnata]          (15gg senza esito = accettata)

[consegnata] / [mancata_consegna]
  └─ CREDIT_NOTE → crea nuova [bozza] TD04 con parent_invoice_id

[scartata] / [errore_invio]
  └─ REISSUE → clona come [bozza] (ACube riusa il numero della sequenza per il prossimo invio OK)
```

**Nota sulla numerazione e errori:** dato che ACube **incrementa il counter solo su invio andato a buon fine**, una fattura scartata o in `errore_invio` non consuma un numero. Quindi su REISSUE non serve gestire "buchi": ACube assegnerà il numero successivo come se la prima fosse mai esistita. Eliminato un'intera classe di bug.

---

## 8. Edge case e regole di business

### 8.1 Pre-fill da prenotazione

```ts
// src/lib/fatturapa/booking-mapper.ts (pseudo)
async function bookingToDraftInvoice(bookingId: number) {
  const b = await getBooking(bookingId);
  const guests = await getGuests(bookingId);
  const property = await getProperty(b.property_id);
  const settings = await getInvoiceSettings();

  // Customer dal guest principale (progressivo=1)
  const mainGuest = guests.find(g => g.progressivo === 1);
  const customer = await upsertCustomerFromGuest(mainGuest, b.guest_email);

  // Imponibile
  const cityTax = b.city_tax_amount ?? estimateCityTax(b, settings);
  const totaleLordo = b.total_amount - cityTax;             // 344 - 4 = 340
  const imponibile = Math.round((totaleLordo / 1.10) * 100); // 30909 cents
  const iva       = Math.round(totaleLordo * 100) - imponibile; // 3091 cents
  const totale    = imponibile + iva;

  return {
    booking_id: b.id,
    customer_id: customer.id,
    data_documento: today(),
    data_pagamento: b.check_in,
    modalita_pagamento: 'MP08',
    imponibile_cents: imponibile,
    iva_cents: iva,
    totale_cents: totale,
    booking_total_cents: Math.round(b.total_amount * 100),
    city_tax_cents: Math.round(cityTax * 100),
    items: [{
      descrizione: `Affitto ${property.nome} ${formatDateRange(b.check_in, b.check_out)}`,
      quantita: 1,
      prezzo_unitario_cents: imponibile,
      imponibile_cents: imponibile,
      iva_cents: iva,
      totale_cents: totale,
      aliquota_iva: 10.0,
    }],
  };
}
```

### 8.2 Mapping completo `Booking → Invoice`

| Campo invoice/customer | Origine | Trasformazione |
|---|---|---|
| `tipo_documento` | hardcoded | `'TD01'` |
| `sezionale` | `invoice_settings.sezionale_default` | `'AIR'` |
| `numero/anno/numero_completo` | `reserveInvoiceNumber()` | atomico al send |
| `data_documento` | computed | `today()` (entro 12 gg da check-in) |
| `data_pagamento` | `bookings.check_in` | direct |
| `modalita_pagamento` | hardcoded | `'MP08'` |
| `totale_cents` | `bookings.total_amount − city_tax` | × 100. Le commissioni Airbnb NON si sottraggono: sono già incluse nel prezzo lordo pagato dall'ospite e quindi nel totale fatturato. Si scaricano lato costi con la fattura passiva Airbnb. |
| `imponibile_cents` | computed | `round(totale / 1.10, 0)` |
| `iva_cents` | computed | `totale − imponibile` |
| `aliquota_iva` | hardcoded | `10.0` |
| `natura_iva` | NULL | (l'IVA si applica) |
| `customers.cognome/nome` | `guests[progressivo=1]` | direct |
| `customers.codice_fiscale` | `guests.numero_documento` se IT, altrimenti `NULL` | |
| `customers.nazione` | `guests.stato_residenza` | mapping ISO 3166 alpha-2 |
| `customers.indirizzo` | `guests.indirizzo_residenza` | direct |
| `customers.is_estero` | `nazione !== 'IT'` | bool |
| `customers.codice_destinatario` | computed | `is_estero ? 'XXXXXXX' : '0000000'` |
| `customers.email` | `bookings.guest_email` | direct |

### 8.3 Cliente estero — regole di compilazione XML

- `<IdPaese>` = ISO 3166 alpha-2 (es. `UA`)
- `<CodiceFiscale>` = vuoto / non emesso (NON `XXX`, anche se Krossbooking lo accetta)
- `<IdCodice>` (sotto `IdFiscaleIVA`) = numero documento o `99999999999`
- `<CodiceDestinatario>` = `XXXXXXX`
- `<Provincia>` = `EE`
- `<CAP>` = `00000` se non disponibile

### 8.4 Idempotenza

Client genera `idempotencyKey` (UUID) all'apertura del form invio. L'API `/send`:

1. Cerca invoice con stessa `idempotency_key`. Se esiste e in stato `(in_invio | inviata_sdi | consegnata | mancata_consegna)` → ritorna 200 con stato corrente, niente reinvio.
2. Lock applicativo: `UPDATE invoices SET stato='in_invio' WHERE id=? AND stato='bozza' RETURNING *`. Se non ritorna riga, qualcun altro l'ha presa → 409.
3. Riserva numero, genera XML, chiama sender, salva risultato.

### 8.5 Note di credito

Endpoint `POST /api/invoices/[id]/credit-note` con body `{ tipo: 'totale' | 'parziale', importi?, motivazione }`. Crea invoice `tipo_documento='TD04'`, `parent_invoice_id` settato, in XML va `<DatiFattureCollegate>` sezione 2.1.2.

### 8.6 Conservazione

**Non implementiamo conservazione a norma in casa.** Si delega al provider scelto (ACube/Openapi). Salviamo comunque su Vercel Blob (privato) `invoices/{anno}/{id}/{xml_filename}.xml` + `ricevuta_*.xml` + `pdf_cortesia.pdf` come backup tecnico. Path naming: `IT01340960481_<base36>.xml` (campo `next_xml_progressivo`, max 5 char alfanumerici).

### 8.7 Cron polling SDI (fallback ai webhook)

`vercel.json`:
```json
{ "crons": [{ "path": "/api/invoices/cron/poll-sdi", "schedule": "0 */2 * * *" }] }
```

Logica: select invoices in `inviata_sdi` con `last_polled_at < now-1h` AND `poll_attempts < 50` LIMIT 20 (per stare entro timeout 10s). Backoff: prime 24h ogni 2h, poi ogni 6h, poi giornaliero. I webhook coprono il caso normale; il cron è la safety net.

---

## 9. Esempio XML FatturaPA 1.2.2 generato (caso Yana Kachura)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
    xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>01340960481</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>00004</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>XXXXXXX</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01340960481</IdCodice></IdFiscaleIVA>
        <CodiceFiscale>01340960481</CodiceFiscale>
        <Anagrafica><Denominazione>Immobiliare Fiumana S.r.l.</Denominazione></Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via del Seminario, 79</Indirizzo>
        <CAP>59100</CAP><Comune>Prato</Comune><Provincia>PO</Provincia><Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <CodiceFiscale>0000000</CodiceFiscale>
        <Anagrafica><Cognome>Kachura</Cognome><Nome>Yana</Nome></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Kiev</Indirizzo>
        <CAP>00000</CAP><Comune>Kiev</Comune><Provincia>EE</Provincia><Nazione>UA</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2026-04-21</Data>
        <Numero>2026/AIR/0004</Numero>
        <ImportoTotaleDocumento>340.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Affitto Incantevole Suite sul Mare 18-22 Aprile 2026</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>309.09</PrezzoUnitario>
        <PrezzoTotale>309.09</PrezzoTotale>
        <AliquotaIVA>10.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>10.00</AliquotaIVA>
        <ImponibileImporto>309.09</ImponibileImporto>
        <Imposta>30.91</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP08</ModalitaPagamento>
        <DataScadenzaPagamento>2026-04-18</DataScadenzaPagamento>
        <ImportoPagamento>340.00</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>
```

---

## 10. Roadmap di sviluppo (13 giornate)

| # | Task | Dip. | Ore |
|---|---|---|---|
| 1 | Migration schema DB (5 tabelle + ALTER bookings) | — | 3 |
| 2 | `types.ts` + `state-machine.ts` con unit test (mapping marking ACube → stato) | 1 | 3 |
| 3 | `customer-mapper.ts` + `calculator.ts` (city tax scomputo, IVA inclusa→esclusa) | 1 | 3 |
| 4 | `crypto.ts` + endpoint `/api/invoices/settings` | 1 | 3 |
| 5 | UI admin `fatturazione/impostazioni` (credenziali ACube, setup NumberingSequence one-time) | 4 | 5 |
| 6 | `payload-builder.ts` (Invoice → JSON FatturaPA snake_case) | 2,3 | 5 |
| 7 | `sender/interface.ts` + `mock.ts` + `factory.ts` + `acube-auth.ts` | 2 | 4 |
| 8 | API `/api/invoices` GET/POST + `[id]` GET/PATCH/DELETE | 2,3 | 5 |
| 9 | API `/api/invoices/from-booking/[bookingId]` | 3,8 | 3 |
| 10 | API `/api/invoices/customers` + `[id]` | 3 | 3 |
| 11 | API `/api/invoices/[id]/send` (idempotency lock + payload + ACube + log) | 6,7,8 | 5 |
| 12 | `sender/acube.ts` impl reale (POST /invoices, parse webhook) | 7 | 6 |
| 13 | Webhook handler `/api/invoices/webhook/acube` con HTTP signature verify | 12 | 4 |
| 14 | `pdf.ts` PDF cortesia + endpoints `/xml`, `/pdf`, `/zip`, `/email` | 6,11 | 5 |
| 15 | API `/api/invoices/[id]/credit-note` (TD04) | 6,11 | 4 |
| 16 | Mirror Vercel Blob (XML emesso + ricevute SDI da webhook) | 13,14 | 3 |
| 17 | UI admin lista `fatturazione/page.tsx` + filtri (UX Krossbooking) | 8 | 6 |
| 18 | UI admin form `nuova/page.tsx` + `[id]/modifica/page.tsx` | 8,10 | 8 |
| 19 | UI admin dettaglio `[id]/page.tsx` con log SDI + bottoni | 11,12,13,14,15 | 6 |
| 20 | UI admin clienti `clienti/*` | 10 | 4 |
| 21 | Bottone "Crea fattura" in `prenotazioni/[id]/page.tsx` | 9,18 | 2 |
| 22 | Cron `cron/retry-pending` (safety net per webhook persi) | 12,13 | 3 |
| 23 | Testing E2E con MockSender + fixture sandbox ACube | 19,12 | 6 |
| 24 | Documentazione runbook | 23 | 2 |

**Totale: 96 ore ≈ 12 giornate.** Path critico: 1 → 2 → 6 → 11 → 12 → 13 → 19.

**Risparmio rispetto al piano precedente:** 6 ore eliminate grazie a NumberingSequence ACube (no transazioni atomiche, no `numbering.ts`, no XML builder XSD validator — il formato JSON è già validato da ACube).

---

## 11. Rischi e mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Timeout 10s Vercel Hobby | Media | Alto | Passare a Pro (60s) o split send asincrono con `waitUntil` |
| Buchi numerazione | Bassa | Medio | Reserve-after-200 oppure documenta buchi (consentiti AdE) |
| Webhook duplicati | Alta | Basso | Dedup su `(externalId, eventType)` in `invoice_sdi_logs` |
| Lock-in provider | Media | Alto | Clausola portabilità in contratto + sender astratto |
| Tassa soggiorno mappata male | Media | Alto | UI dedicata in dettaglio booking + default da settings |
| XML scartato per CF estero invalido | Alta | Medio | Test aggressivo in sandbox, lasciare CF vuoto se estero |
| Fatturazione fuori termine 12 gg | Media | Alto | Notifica admin se pendono bozze a >10 gg da pagamento |

---

## 12. Sintesi finale

| Domanda | Risposta |
|---|---|
| Si può replicare la sezione fatturazione di Krossbooking dentro Fiumana? | **Sì, completamente.** L'unico componente non clonabile è il canale SDI in sé (richiede sempre intermediario). |
| Quanto costa? | **Sviluppo:** ~13 giornate. **Runtime:** 18–80 €/anno con ACube/Openapi. |
| Si fa direttamente "al cassetto fiscale"? | Tecnicamente no — passa sempre dal SDI tramite intermediario, che lo deposita nel cassetto. UX-wise indistinguibile. |
| Quando si comincia? | Subito dopo la conferma del commercialista su (a) aliquota IVA 10%, (b) trattamento clienti esteri, (c) sezionale di partenza. |

**Prossimi passi concreti:**

1. Apri account sandbox su ACube (5 min) e/o Openapi SDI per validare i payload reali.
2. Confronta i due preventivi su 300 fatture/anno.
3. Aggiungi i due campi mancanti in `bookings` (`city_tax_amount`, `airbnb_commission`).
4. Inizia dallo step 1 della roadmap (schema DB).

---

**File correlati nel repo:**
- `ANALISI_FATTURAZIONE_ELETTRONICA.md` — analisi preliminare di fattibilità (questa doc è il livello successivo).
- `src/lib/db.ts` — qui vanno aggiunte le tabelle al punto 3.
- `src/app/api/bookings/[id]/receipt/route.ts` — pattern di riferimento per upload XML+ricevute (da replicare).
