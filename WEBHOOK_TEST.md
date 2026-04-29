# Test Webhook ACube — guida rapida

Questa guida copre due scenari per validare il `webhook handler` (`src/app/api/invoices/webhook/[provider]/route.ts`):

- **Test locale (rapido, 5 min):** simula tu stesso le chiamate webhook con uno script — non serve internet, ngrok o configurare ACube.
- **Test reale end-to-end (15 min):** esponi `localhost` con ngrok, configura le 5 ApiConfiguration su ACube, invia una fattura → ACube ti chiama davvero.

Entrambi i test richiedono il server Next attivo (`npm run dev`).

---

## Prerequisiti

1. **Server Next attivo:**
   ```bash
   cd "/Users/fabioborselli/Desktop/DOBY SRL/Fiumana immobiliare/sito/immobiliare-fiumana"
   npm run dev
   ```
   Default: `http://localhost:3000`.

2. **Webhook secret valorizzato** — vai su [http://localhost:3000/admin/fatturazione/impostazioni](http://localhost:3000/admin/fatturazione/impostazioni), sezione **Webhook secret** → bottone **"Genera webhook secret"**. Il token viene copiato negli appunti automaticamente. Salvalo da qualche parte: ti serve come `Bearer <token>`.

3. **Almeno una fattura inviata con `external_id` valorizzato.** Da `/admin/fatturazione/<id>/` clicca "Invia ad ACube" → quando il marking diventa `waiting`/`accettata_acube`, l'`external_id` è popolato. Copia l'UUID che vedi nel pannello "UUID ACube".

---

## A) Test locale (simulato)

Lo script `scripts/test-webhook.ts` invia 4 webhook al nostro endpoint locale come fa ACube:

1. `invoice-status-quarantena` (primo retry)
2. `customer-invoice` (poi torna `sent`)
3. `customer-notification RC` (Ricevuta Consegna)
4. `customer-notification MC` (Mancata Consegna — caso estero)

```bash
npx tsx scripts/test-webhook.ts \
  '<webhook-secret-che-hai-generato>' \
  '<external-id-della-fattura>' \
  http://localhost:3000
```

Cosa vedrai dopo l'esecuzione:

- Il dettaglio fattura `/admin/fatturazione/<id>` mostra **4 nuovi log nella tab "Log SDI"**
- Il **marking ACube** transita `waiting → quarantena → sent`
- Lo **stato locale** transita di conseguenza fino a `consegnata` (dopo l'evento RC) o `mancata_consegna` (dopo l'evento MC)
- Il campo **Ricevuta XML** mostra il link al file di notifica

> ⚠️ Lo script invia gli eventi in serie; in produzione possono arrivare in ordine diverso o con duplicati. La state machine è progettata per essere idempotente.

---

## B) Test reale end-to-end con ngrok

### 1. Installa & avvia ngrok

```bash
# Solo la prima volta
brew install ngrok
# oppure
npm install -g ngrok

# Avvia il tunnel (lascia aperto in un terminale dedicato)
ngrok http 3000
```

ngrok ti mostrerà un URL pubblico tipo:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

### 2. Configura le 5 ApiConfiguration in dashboard ACube

Vai su [https://dashboard-sandbox.acubeapi.com/api-configurations](https://dashboard-sandbox.acubeapi.com/api-configurations) e crea **5 configurazioni**, una per evento.

Per ognuna, compila:

| Campo                    | Valore                                                              |
|--------------------------|---------------------------------------------------------------------|
| **Evento**               | uno di: `customer-invoice`, `customer-notification`, `invoice-status-quarantena`, `invoice-status-invoice-error`, `legal-storage-receipt` |
| **URL**                  | `https://abc123.ngrok-free.app/api/invoices/webhook/acube`          |
| **Authentication type**  | `header`                                                            |
| **Authentication key**   | `Authorization`                                                     |
| **Authentication token** | `Bearer <webhook-secret-generato-dalle-impostazioni>`               |

Salva ognuna delle 5 voci.

### 3. Invia una fattura di test

Da `/admin/fatturazione/<id>/` cliccando "Invia ad ACube" — la sandbox dovrebbe:

1. Accettare la fattura → marking `waiting` → ti arriva subito un webhook (lo vedi anche nei log ngrok in `http://127.0.0.1:4040`)
2. Inoltrare la fattura al SDI sandbox
3. Entro ~60 secondi ricevi una notifica RC o MC dal SDI sandbox
4. Lo stato della fattura nel dettaglio Fiumana si aggiorna automaticamente

### 4. Verifica

- Dashboard ngrok (`http://127.0.0.1:4040`): vedi tutte le request webhook in tempo reale
- Tab "Log SDI" del dettaglio fattura: vedi tutti gli eventi salvati con timestamp + payload
- Marking nella dashboard ACube e marking nel dettaglio fattura locale devono coincidere

---

## Troubleshooting

| Sintomo | Probabile causa | Soluzione |
|---|---|---|
| `HTTP 401 Webhook auth invalida` | Bearer token diverso fra ApiConfiguration ACube e webhook_secret nel DB | Rigenera il secret dalle impostazioni e riconfigura le 5 ApiConfiguration |
| `HTTP 202 reason=invoice_not_found` | L'`external_id` nel webhook non corrisponde a nessuna fattura nel DB | Verifica che la fattura sia stata inviata via `/api/invoices/[id]/send` (non solo creata) |
| `HTTP 202 reason=unparseable` | Body in formato inaspettato | Vedi il log nella tab "Log SDI" → dump completo del body in `payload_in`. Aggiungi un nuovo case in `parseWebhook` di `sender/acube.ts` |
| Tunnel ngrok scade dopo 2h (free) | Limite gratuito | Riavvia `ngrok` e aggiorna l'URL nelle 5 ApiConfiguration. Per dev permanente: piano free permanent ngrok o Cloudflare tunnel |

---

## Cleanup

Quando hai finito di testare, **disabilita o elimina le 5 ApiConfiguration ACube** per evitare che ti chiami su un URL ngrok scaduto e accumuli retry per 10 ore.
