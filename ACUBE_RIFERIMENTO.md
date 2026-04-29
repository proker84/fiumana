# Riferimento tecnico — ACube API per Fiumana

Note sintetiche dalla documentazione ufficiale ACube (verificata 28 apr 2026, doc aggiornata da loro 31 mar 2026).

## Composing an invoice
Doc: https://docs.acubeapi.com/documentation/italy/gov-it/invoices/composing-invoice

ACube accetta DUE formati equivalenti:

- **FatturaPA XML** (`Content-Type: application/xml`) — PascalCase, formato AdE standard
- **FatturaPA JSON** (`Content-Type: application/json`) — snake_case, **stessi nomi campi del tracciato AdE ma in snake_case** (es. `dati_generali_documento`, `cedente_prestatore`, `cessionario_committente`)

**Per Fiumana usiamo JSON** — più semplice da costruire/validare in TypeScript, niente XML builder.

ACube **auto-compila** dentro `dati_trasmissione`:
- `id_trasmittente`
- `progressivo_invio`
- `formato_trasmissione`

→ Non li gestiamo noi. Stop.

## Sending an invoice
Doc: https://docs.acubeapi.com/documentation/italy/gov-it/invoices/sending-invoice

- **Endpoint:** `POST /invoices`
- **Risposta sincrona:** `HTTP 202` + `{ "uuid": "<Invoice UUID>" }`
- **Asincrono:** SDI risponde dopo ~60 secondi tramite webhook
- **Marking iniziale:** `waiting`
- **Retry automatici lato ACube se SDI non risponde:** 14 tentativi × 300s con backoff 1.6 ≈ ~4 giorni in stato `quarantena`
- **Esiti finali marking:** `sent` (OK) | `invoice-error` (KO definitivo)
- **Errori sincroni:** `HTTP 400` validazione, `HTTP 500` server error
- **Filename XML:** generato automaticamente da ACube come `IT10442360961ACB<YY>_<SEQ>.xml` (è la VAT di ACube come trasmittente, non la nostra)
- **Firma XAdES-BES:** non necessaria per Fiumana (clienti privati)

### Webhook body per cambio marking

```json
{
  "uuid": "<Invoice UUID>",
  "marking": "<New marking>",
  "previous_marking": "<Previous marking>",
  "notice": "<Error description, se errore>",
  "transioned_at": "<ISO date>"
}
```

⚠️ Attenzione: il campo è scritto `transioned_at` (typo loro, manca la "t"). Da gestire con quel nome esatto.

### Eventi webhook rilevanti per marking

- `invoice-status-quarantena` — `waiting → quarantena` (primo fallimento, retry in corso)
- `invoice-status-invoice-error` — `quarantena → invoice-error` (fallimento definitivo)
- `customer-invoice` — fattura inviata con successo al SDI
- `customer-notification` — notifica generica dal SDI (RC, MC, NS, NE, DT)

## Numerazione automatica — feature killer
Doc: https://docs.acubeapi.com/documentation/italy/gov-it/invoices/autonumbering

**Questa elimina tutta la complessità della numerazione atomica lato Fiumana.** ACube ha un'API dedicata `NumberingSequence`.

### Setup (una sola volta)

```
POST /numbering-sequences
Content-Type: application/json

{
  "name": "FiumanaAIR",
  "format": "%Y/AIR/%04s",
  "number": 0
}
```

Risponde con un UUID che salviamo in `invoice_settings.numbering_sequence_uuid`.

### Uso nel payload fattura

```json
"dati_generali_documento": {
  "data": "2026-04-28",
  "numero": "getNumero(FiumanaAIR)",
  ...
}
```

ACube sostituisce `getNumero(FiumanaAIR)` con `2026/AIR/0001`, `2026/AIR/0002`, ecc.

### Garanzie ACube
- Counter incrementa **solo** se l'invio ha successo → **niente buchi**
- Reset automatico a 1 il 1° gennaio
- Nuova sequenza creata in automatico per anno nuovo

### Placeholder format supportati
- `%s` numero semplice (1, 2, 3...)
- `%0Xs` zero-padded (`%04s` → 0001, 0002...)
- `%Y` anno 4 cifre (2026)
- `%y` anno 2 cifre (26)

**Decisione per Fiumana:** sequenza `FiumanaAIR` con format `%Y/AIR/%04s` → numerazione `2026/AIR/0001`...

## Cosa NON dobbiamo più gestire lato Fiumana
- Generazione XML FatturaPA (usiamo JSON)
- Filename progressivo XML (ACube)
- Firma XAdES (non serve)
- Numerazione atomica con transazioni Turso (delegata ad ACube via NumberingSequence)
- Validazione XSD (delegata ad ACube)
- ProgressivoInvio (auto)

## Cosa restiamo a gestire lato Fiumana
- Bozze di fattura prima dell'invio
- Anagrafica clienti (con regole codice destinatario `0000000` / `XXXXXXX`)
- Calcolo imponibile da prenotazione (totale_ospite − city_tax)
- Note di credito (TD04)
- UI lista/dettaglio/filtri (replica UX Krossbooking)
- Mirror dei file su Vercel Blob (per portabilità)
- Invio email PDF cortesia con Resend
- Webhook handler con HMAC verify
- Stato locale specchio del marking ACube

## Pagine doc da leggere ancora (per fase implementativa)
- https://docs.acubeapi.com/documentation/italy/gov-it/configurations — setup BusinessRegistryConfiguration
- https://docs.acubeapi.com/documentation/italy/gov-it/invoices/receiving-notification — payload notifiche SDI (RC/MC/NS)
- https://docs.acubeapi.com/documentation/italy/gov-it/invoices/rejected-invoices — gestione scarti
- https://docs.acubeapi.com/documentation/italy/gov-it/sandbox/introduction — credenziali sandbox
- https://docs.acubeapi.com/documentation/api/gov-it/api-invoices-post-collection — schema completo payload JSON
- https://docs.acubeapi.com/documentation/preservation/ — Legal Archive
