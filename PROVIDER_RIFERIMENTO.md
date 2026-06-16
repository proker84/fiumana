# Riferimento tecnico — Provider SDI per Fiumana

Documento ombrello che raccoglie i riferimenti tecnici dei provider SDI
supportati dal modulo fatturazione di Fiumana. Architettura sender-agnostic
basata sull'`interface InvoiceSender` (vedi `src/lib/fatturapa/types.ts`).

Provider supportati:
- **Openapi SDI** — **provider attivo in produzione** (`src/lib/fatturapa/sender/openapi.ts`)
- **ACube** — implementazione alternativa/fallback (`src/lib/fatturapa/sender/acube.ts`)
- **Mock** — solo dev/test (`src/lib/fatturapa/sender/mock.ts`)

> **Stato (giugno 2026):** tutti e tre i sender sono implementati. La factory
> (`src/lib/fatturapa/sender/factory.ts`) instrada su Openapi quando
> `senderProvider = 'openapi'`, su ACube quando `'acube'`, altrimenti Mock.
> Il default di configurazione è `openapi`.

---

## ACube — reference storica

> Le note dettagliate restano in `ACUBE_RIFERIMENTO.md` (file originale,
> non rinominato per non perdere la storia git). Riassunto operativo qui sotto.

- **Endpoint sandbox:** `https://api-sandbox.acubeapi.com`
- **Endpoint produzione:** `https://api.acubeapi.com`
- **Auth:** OAuth2 password grant (`POST /login`, email + password)
- **Invio:** `POST /invoices` con body JSON snake_case (FatturaPA AdE)
- **Stato:** `GET /invoices/{uuid}`
- **Webhook:** 5 eventi (`customer-invoice`, `customer-notification`,
  `invoice-status-quarantena`, `invoice-status-invoice-error`,
  `legal-storage-receipt`)
- **Marking:** `waiting → quarantena? → sent | invoice-error`
- **Pricing:** abbonamento ~600 €/anno per piccoli volumi (poco conveniente
  per <500 fatture/anno)

Per i dettagli completi (formato webhook, codici errore, mapping marking →
stato locale) consulta `ACUBE_RIFERIMENTO.md`.

---

## Openapi SDI — provider attivo (IMPLEMENTATO)

> Implementato in `src/lib/fatturapa/sender/openapi.ts` (classe `OpenapiSender`)
> e instradato dalla factory nel `case 'openapi'`. È il provider di default.

### Endpoint

- **SDI sandbox:** `https://test.sdi.openapi.it`
- **SDI produzione:** `https://sdi.openapi.it`
- **OAuth sandbox:** `https://test.oauth.openapi.it`
- **OAuth produzione:** `https://oauth.openapi.it`

L'endpoint OAuth è derivato automaticamente dal pattern dell'endpoint SDI
(`sdi.` → `oauth.`); `settings.senderEndpoint` sovrascrive il default SDI.

### Autenticazione

Due modalità (in ordine di priorità nel codice):

1. **Token statico** — `OPENAPI_TOKEN` (env) oppure valore cifrato nel DB con
   prefisso `token:`. Cache 1 anno. Modalità preferita.
2. **Basic auth → POST /token** — `OPENAPI_USERNAME` + `OPENAPI_API_KEY` (env)
   oppure DB cifrato nel formato `email:apikey` (AES-256-GCM). Genera un bearer
   con TTL 30 giorni richiedendo gli scope SDI necessari (vedi `REQUIRED_SCOPES`).

Env vars: `OPENAPI_TOKEN`, `OPENAPI_USERNAME`, `OPENAPI_API_KEY`,
`OPENAPI_API_BASE_URL`.

### Invio fattura

- Endpoint: **`POST /invoices_legal_storage`** (default, conservazione 10 anni
  inclusa) oppure `POST /invoices` (opt-out via `conservazioneProvider='none'`).
  Auto-fallback fra i due in caso di HTTP 412.
- Formato body: **`application/xml`** (NON JSON). Il payload-builder produce JSON
  snake_case AdE che `jsonToFatturaPaXml` serializza in XML FatturaPA con tag
  PascalCase e namespace ufficiale. `enrichForFatturaPaSchema` inietta
  `id_trasmittente`, `progressivo_invio` e `formato_trasmissione` (che Openapi,
  a differenza di ACube, non auto-compila).
- Numerazione: client-side (Openapi non auto-numera lato server).
- Risposta: `{ data: { uuid }, success: true }`.

### Polling stato / Webhook

- Stato: `GET /invoices/{uuid}` → `{ data: { marking, notifications, notice, ... } }`.
- Ricevuta XML: `GET /invoices/{uuid}` con `Accept: application/xml` (non esiste
  un endpoint `/file` dedicato come ACube).
- Webhook body: `{ event, data: { invoice | notification | ... } }`. Eventi
  gestiti: `customer-notification`, `customer-invoice`, `supplier-invoice`,
  `invoice-status-quarantena`, `invoice-status-invoice-error`.
- Mapping stati Openapi → marking interno via `mapOpenapiMarking`
  (`waiting | delivered | not-delivered | rejected | ...` →
  `waiting | quarantena | sent | invoice-error` + outcome SDI
  `RC | MC | NS | NE | DT | AT`).

### Pricing

- Pay-per-use: invio **~0,015–0,07 €/fattura** + conservazione decennale
  **~0,035 €/fattura**. Nessun canone fisso, nessun setup.
- Per ~40 fatture/anno di Fiumana: pochi euro/anno (vs ~600 €/anno ACube).

---

## Mock — solo dev

Vedi `src/lib/fatturapa/sender/mock.ts`. Espone scenari simulabili:
`success | mancata_consegna | scarto | quarantena | invoice-error | pending`.
Non comunica con nessun servizio esterno.
