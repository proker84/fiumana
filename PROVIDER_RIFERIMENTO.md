# Riferimento tecnico — Provider SDI per Fiumana

Documento ombrello che raccoglie i riferimenti tecnici dei provider SDI
supportati dal modulo fatturazione di Fiumana. Architettura sender-agnostic
basata sull'`interface InvoiceSender` (vedi `src/lib/fatturapa/types.ts`).

Provider supportati:
- **ACube** — implementazione attiva (`src/lib/fatturapa/sender/acube.ts`)
- **Openapi SDI** — placeholder, da implementare quando arriva la doc reale
- **Mock** — solo dev/test (`src/lib/fatturapa/sender/mock.ts`)

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

## Openapi SDI — TODO da compilare con doc reale

> Sezione placeholder — sarà popolata appena ricevuta la documentazione
> ufficiale Openapi SDI.

### Endpoint (presunti, da verificare)

- **Sandbox:** `https://test.invoice.openapi.com`
- **Produzione:** `https://invoice.openapi.com`

### Autenticazione

- TODO: verificare se username + password (come ACube) oppure API key fissa
- Env vars previste: `OPENAPI_USERNAME`, `OPENAPI_API_KEY`,
  `OPENAPI_API_BASE_URL`
- Nel DB: `sender_api_key_encrypted` mantiene il formato `email:password`
  cifrato AES-256-GCM (stesso schema di ACube), per non toccare la crypto

### Invio fattura

- TODO: endpoint (presumibilmente `POST /invoice` o simile)
- TODO: formato body — JSON FatturaPA o multipart con XML allegato?
- Il payload-builder di Fiumana produce JSON snake_case AdE; verificare
  compatibilità o necessità di conversione XML

### Polling stato / Webhook

- TODO: endpoint stato (`GET /invoice/{id}`?)
- TODO: formato webhook (campi, firma, autenticazione)
- TODO: mapping stati Openapi → `AcubeMarking` interno
  (`waiting | quarantena | sent | invoice-error`)
- TODO: mapping esiti SDI (`RC | MC | NS | NE | EC | DT | AT`)

### Pricing

- Pay-per-use: **0,06 €/fattura** inclusa conservazione decennale
- Per ~40 fatture/anno di Fiumana: ~2,40 €/anno (vs 600 € ACube)

### Implementazione

- File da creare: `src/lib/fatturapa/sender/openapi.ts`
- Classe: `OpenapiSender implements InvoiceSender`
- Metodi richiesti dal contratto:
  - `send(payload, ctx)`
  - `getStatus(externalId)`
  - `downloadReceipt(externalId)`
  - `parseWebhook(headers, body)`
- Una volta pronto, in `factory.ts` sostituire il placeholder MockSender
  con `new OpenapiSender(settings)` nel `case 'openapi'`.

---

## Mock — solo dev

Vedi `src/lib/fatturapa/sender/mock.ts`. Espone scenari simulabili:
`success | mancata_consegna | scarto | quarantena | invoice-error | pending`.
Non comunica con nessun servizio esterno.
