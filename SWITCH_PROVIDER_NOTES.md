# Switch provider SDI — note di transizione ACube → Openapi

Documento operativo che riassume il refactor "multi-provider" del modulo
fatturazione. L'architettura era già sender-agnostic (`interface InvoiceSender`),
quindi il cambio è limitato a tipi, factory, UI e default di configurazione.

---

## Cosa è stato modificato

### 1. Tipi — `src/lib/fatturapa/types.ts`

- `InvoiceSettings.senderProvider`: ora `'acube' | 'openapi' | 'mock' | null`
- `InvoiceSender.providerName`: ora `'acube' | 'openapi' | 'mock'`

### 2. Factory — `src/lib/fatturapa/sender/factory.ts`

- Aggiunto `case 'openapi'` con placeholder MockSender
  (commento `TODO` per sostituire con `OpenapiSender` quando disponibile).
- `SenderResolution.reason` esteso a `'mock' | 'acube' | 'openapi'`.

### 3. UI impostazioni — `src/app/admin/fatturazione/impostazioni/page.tsx`

- Sezione "Provider ACube" → **"Provider SDI"** neutra.
- Aggiunto dropdown a 3 valori (`acube`, `openapi`, `mock`).
- Selezione `openapi` imposta automaticamente `senderEndpoint` a
  `https://test.invoice.openapi.com` (solo se l'endpoint corrente coincide
  con un default noto, altrimenti rispetta l'override custom).
- Etichette dei campi credenziali rinominate da
  "Email account ACube" / "Password account ACube" in
  "Username/Email API" / "Password/API key".
- Aggiunta info-box con il confronto pricing/uso fra i tre provider.
- Il default del form passa da `'acube'` a `'openapi'`.
- La logica crypto **non è stata toccata**: il valore cifrato resta nel
  formato `email:password` AES-256-GCM in `sender_api_key_encrypted`.

### 4. API settings — `src/app/api/invoices/settings/route.ts`

- Default `sender_provider`: da `'acube'` a `'openapi'`.
- Default `sender_endpoint`: da `https://api-sandbox.acubeapi.com` a
  `https://test.invoice.openapi.com`.

### 5. DEPLOY_VERCEL.md

- Le env vars `ACUBE_USERNAME`, `ACUBE_PASSWORD`, `ACUBE_API_BASE_URL`
  sono ora segnate come **opzionali** (servono solo se il provider attivo
  è `acube`).
- Aggiunte env vars **`OPENAPI_USERNAME`**, **`OPENAPI_API_KEY`**,
  **`OPENAPI_API_BASE_URL`**.
- Aggiunta sezione "Pricing — confronto provider" con il dato
  ~600 €/anno (ACube) vs ~2,40 €/anno (Openapi, 40 fatture/anno).

### 6. PROVIDER_RIFERIMENTO.md

- Nuovo file ombrello che indicizza i provider supportati.
- `ACUBE_RIFERIMENTO.md` **non è stato cancellato**: resta come
  reference storica completa (linkata dal nuovo file).
- Aggiunta sezione "Openapi SDI — TODO da compilare con doc reale"
  con placeholder per endpoint, auth, invio, polling, webhook.

---

## Cosa manca per completare lo switch

1. **Implementare `src/lib/fatturapa/sender/openapi.ts`** — la classe
   `OpenapiSender implements InvoiceSender` con i 4 metodi del contratto
   (`send`, `getStatus`, `downloadReceipt`, `parseWebhook`). Questa è
   l'unica parte che richiede la documentazione Openapi reale.
2. **Aggiornare `factory.ts`** — sostituire il placeholder MockSender nel
   `case 'openapi'` con `new OpenapiSender(settings)` (e cambiare
   `reason: 'mock'` in `reason: 'openapi'`).
3. **Verificare il payload-builder** — il formato JSON snake_case FatturaPA
   AdE dovrebbe essere già compatibile (è uno standard, non specifico ACube),
   ma da confermare con la doc Openapi.
4. **Smoke test sandbox Openapi** — invio di una fattura test, verifica
   webhook in arrivo su `/api/invoices/webhook/acube` (probabilmente da
   rinominare in `/webhook/sdi` o aggiungere un secondo endpoint
   `/webhook/openapi`).
5. **Compilare la sezione "Openapi SDI" in `PROVIDER_RIFERIMENTO.md`** con
   i dati reali (auth, endpoint, mapping stati, formato webhook).
6. **Decidere se mantenere le 5 ApiConfiguration ACube** sul DB ACube
   remoto (lasciate intatte come da vincolo) o disattivarle a switch
   completato.

---

## Vincoli rispettati

- `acube.ts` non eliminato — fallback storico ancora disponibile.
- `payload-builder.ts` non modificato — formato JSON FatturaPA invariato.
- Le 5 ApiConfiguration ACube nel DB remoto non toccate.
- Crypto AES-GCM-256 invariata: stesso schema `email:password` cifrato.

---

## Comando git suggerito per committare

```bash
cd "~/Desktop/DOBY SRL/Fiumana immobiliare/sito/immobiliare-fiumana"

git add src/lib/fatturapa/types.ts \
        src/lib/fatturapa/sender/factory.ts \
        src/app/admin/fatturazione/impostazioni/page.tsx \
        src/app/api/invoices/settings/route.ts \
        DEPLOY_VERCEL.md \
        PROVIDER_RIFERIMENTO.md \
        SWITCH_PROVIDER_NOTES.md

git commit -m "refactor(fatturapa): supporto multi-provider SDI (ACube + Openapi)

- types: senderProvider e providerName accettano 'openapi'
- factory: case 'openapi' con placeholder MockSender (TODO OpenapiSender)
- UI impostazioni: sezione 'Provider SDI' neutra con dropdown 3 valori
  + info-box pricing + rinomina campi credenziali
- API settings: default sender_provider=openapi, endpoint sandbox openapi
- DEPLOY_VERCEL.md: env ACUBE_* opzionali, aggiunte OPENAPI_*, sezione pricing
- PROVIDER_RIFERIMENTO.md: nuovo file ombrello, ACUBE_RIFERIMENTO.md preservato
- payload-builder e crypto non toccati"

git push origin main
```
