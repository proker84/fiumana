# Deploy su Vercel — checklist completa

Procedura per portare il modulo fatturazione in produzione e completare la
configurazione webhook ACube con URL pubblico stabile.

---

## 0) Prima di iniziare — chiave master cifratura

Genera UNA SOLA VOLTA una chiave AES-256 per cifrare le credenziali nel DB.
Da qui in poi non va MAI cambiata, altrimenti perdi le password salvate.

```bash
openssl rand -base64 32
```

Output esempio (la tua sarà diversa):
```
XKtUP0PAVe+xFTe2tC1xuDDqDevV5K5RfW5+eiGmFGo=
```

Salvala in un password manager. La useremo come `INVOICE_ENCRYPTION_KEY` su Vercel.

---

## 1) Cleanup prima del push

Rimuovi i file che non vanno in produzione (sono già in `.gitignore` aggiornato):

```bash
cd "~/Desktop/DOBY SRL/Fiumana immobiliare/sito/immobiliare-fiumana"

# Sicurezza — verifica che .env.local NON sia tracciato
git ls-files | grep -E "\.env" | grep -v ".env.example"
# Output atteso: vuoto. Se compare .env.vercel rimuovilo:
# git rm --cached .env.vercel .env.vercel-check 2>/dev/null

# Rimuovi i file temporanei dev
rm -f .build.log .build.done
rm -f src/lib/fatturapa/_smoke_test.ts
```

---

## 2) Push su GitHub

```bash
git add .gitignore
git add src/ scripts/ *.md
git status   # verifica cosa stai per committare

git commit -m "feat: modulo fatturazione elettronica via ACube + UI completa

- Schema DB: invoice_settings, customers, invoices, invoice_items, invoice_sdi_logs
- ALTER bookings: city_tax_amount, airbnb_commission
- Lib fatturapa: types, state-machine, calculator, customer-mapper, payload-builder, crypto
- Sender: AcubeSender (OAuth2 password grant + POST /invoices + webhook parser)
        + MockSender per dev + factory
- API: /api/invoices CRUD + /from-booking + /[id]/send + /webhook/acube + /customers + /settings
- UI admin: lista fatture + dettaglio + impostazioni + tassa soggiorno editabile su booking
- Bottone 'Crea bozza fattura' nella pagina prenotazione
- Smoke test sandbox ACube validato"

git push origin main   # o il branch principale
```

---

## 3) Deploy su Vercel

Se il progetto è già su Vercel, il push attiva automaticamente un deploy.
Dovrebbe fallire al primo tentativo perché mancano le env vars nuove —
non spaventarti, lo aggiusti al passo 4.

Se il progetto non è ancora su Vercel:

1. https://vercel.com/new → Import Git Repository
2. Seleziona `immobiliare-fiumana`
3. Framework: **Next.js** (autodetect)
4. Build & Output: **default** (Vercel sa già)
5. Environment Variables: **NON metterle ora**, lo facciamo al prossimo passo
6. Deploy

---

## 4) Environment Variables su Vercel

Vai in **Project → Settings → Environment Variables** e aggiungi tutte queste.
Imposta scope su **Production + Preview + Development** (oppure solo Production
se preferisci tenere Preview/Dev sul Mac).

### Già esistenti (devi solo verificare)

| Nome | Valore |
|---|---|
| `JWT_SECRET` | quello che già usi in dev (segreto random forte) |
| `TURSO_DATABASE_URL` | URL DB Turso produzione |
| `TURSO_AUTH_TOKEN` | token Turso |
| `BLOB_READ_WRITE_TOKEN` | token Vercel Blob (se usi @vercel/blob) |
| `RESEND_API_KEY` | API key Resend (se invii email) |
| `NEXT_PUBLIC_BASE_URL` | `https://immobiliarefiumana.com` (o domain custom) |
| `ALLOGGIATI_USERNAME` / `ALLOGGIATI_WSKEY` | credenziali Portale Alloggiati (se usate) |

### NUOVE — modulo fatturazione

| Nome | Valore | Note |
|---|---|---|
| **`INVOICE_ENCRYPTION_KEY`** | la chiave del passo 0 | OBBLIGATORIA in prod, l'avvio fallisce se manca |
| `ACUBE_USERNAME` | la tua email account ACube | OPZIONALE — solo se usi provider `acube` |
| `ACUBE_PASSWORD` | la tua password ACube | OPZIONALE — solo se usi provider `acube` |
| `ACUBE_API_BASE_URL` | `https://api-sandbox.acubeapi.com` | OPZIONALE — sandbox o `https://api.acubeapi.com` per produzione ACube |
| **`OPENAPI_USERNAME`** | username/email account Openapi SDI | richiesta se usi provider `openapi` |
| **`OPENAPI_API_KEY`** | API key Openapi (in caso usino API key invece di password) | richiesta se usi provider `openapi` |
| **`OPENAPI_API_BASE_URL`** | `https://test.sdi.openapi.it` per sandbox, `https://sdi.openapi.it` per produzione | richiesta se usi provider `openapi` |

> ⚠️ **`INVOICE_ENCRYPTION_KEY`**, `ACUBE_*` e `OPENAPI_*` sono "Encrypted" by default su Vercel: nessuno (incluso te) potrà rileggere il valore dal pannello dopo averlo salvato. Conservali altrove.

### Pricing — confronto provider

| Provider | Modello | Costo indicativo (40 fatture/anno) | Note |
|---|---|---|---|
| **ACube** | Abbonamento annuale | ~600 €/anno | Conviene oltre i 1000+ documenti/anno; piano custom |
| **Openapi SDI** | Pay-per-use 0,06 €/fattura | ~2,40 €/anno | Conservazione decennale inclusa, nessun canone fisso |
| Mock | — | gratis | Solo dev/test, non invia al SDI reale |

Per il volume Fiumana attuale (~40 fatture/anno) Openapi è circa 250× più economico.

Dopo aver aggiunto le env, vai su **Deployments → ultima** → menù `…` → **Redeploy** per applicarle al deploy corrente.

---

## 5) Inizializzazione DB in produzione

Al primo accesso al backend in produzione, `getDb()` esegue automaticamente
le `CREATE TABLE IF NOT EXISTS` su Turso. Quindi le 5 tabelle nuove + ALTER su
`bookings` vengono create al volo senza migrate manuale.

Verifica veloce dopo il deploy:

1. Vai su `https://immobiliarefiumana.com/admin`
2. Login con le credenziali admin
3. Click su **Fatturazione** nella sidebar — la pagina deve caricare senza errore
4. Click su **Impostazioni** → la riga `id=1` viene creata con i default Fiumana già pre-compilati

Se ottieni errore 500 sulla pagina impostazioni, controlla nei log Vercel
che `INVOICE_ENCRYPTION_KEY` sia effettivamente settata (errore tipico:
`INVOICE_ENCRYPTION_KEY non impostata in produzione`).

---

## 6) Configurazione webhook ACube con URL produzione

Adesso che hai un URL pubblico stabile, configura i webhook ACube definitivamente
(non ti serve più ngrok).

### 6a) Genera webhook secret

1. Vai su `https://immobiliarefiumana.com/admin/fatturazione/impostazioni`
2. Sezione **"Webhook secret"** → bottone **"Genera webhook secret"**
3. Il secret viene copiato negli appunti **una volta sola**. Conservalo.

### 6b) Configura le 5 ApiConfiguration in dashboard ACube

Vai su https://dashboard-sandbox.acubeapi.com/api-configurations

Crea **5 voci**, una per ognuno di questi eventi:

- `customer-invoice`
- `customer-notification`
- `invoice-status-quarantena`
- `invoice-status-invoice-error`
- `legal-storage-receipt`

Per ogni voce:

| Campo | Valore |
|---|---|
| **URL** | `https://immobiliarefiumana.com/api/invoices/webhook/acube` |
| **Authentication type** | `header` |
| **Authentication key** | `Authorization` |
| **Authentication token** | `Bearer <webhook-secret-generato>` |

Salva.

### 6c) Test end-to-end

1. Apri una prenotazione esistente → "Crea bozza fattura"
2. Sul dettaglio fattura → "Invia ad ACube"
3. Marking deve passare `accettata_acube → inviata_sdi → consegnata` o `mancata_consegna` in 60–120 secondi
4. Tab "Log SDI" deve mostrare i webhook arrivati con timestamp

Se i webhook non arrivano:
- Vai su https://dashboard-sandbox.acubeapi.com/api-configurations e clicca su una voce → vedi gli ultimi tentativi
- Negli **Vercel Logs** del progetto vedi le chiamate POST `/api/invoices/webhook/acube` con relativi 200/401

---

## 7) Dominio custom

Il dominio del progetto è **immobiliarefiumana.com**. Se non è ancora connesso al progetto Vercel:

1. Vercel → Settings → Domains → Add `immobiliarefiumana.com` e `www.immobiliarefiumana.com`
2. Configura i record DNS come indicato da Vercel (A record + CNAME)
3. Verifica `NEXT_PUBLIC_BASE_URL=https://immobiliarefiumana.com` nelle env vars
4. Se cambi dominio in futuro, ricordati di aggiornare i 5 webhook ACube

---

## 8) Passaggio da sandbox a produzione (più avanti)

Quando vorrai passare al **vero SDI** invece della sandbox:

1. Crea un account ACube produzione (https://acubeapi.com)
2. Aggiorna `ACUBE_API_BASE_URL` → `https://api.acubeapi.com`
3. Aggiorna `ACUBE_USERNAME` / `ACUBE_PASSWORD` con le credenziali produzione
4. Crea una nuova BusinessRegistry e nuove ApiConfiguration sul portale produzione ACube
5. Aggiorna `senderEndpoint` nelle impostazioni Fiumana
6. Disattiva `senderTestMode` quando sei pronto a fatturare per davvero
7. **Verifica con il commercialista** che la conservazione sostitutiva ACube produzione sia attiva e a norma DPCM 3/12/2013

A questo punto le fatture iniziano davvero a finire nel cassetto fiscale dei tuoi clienti.

---

## Troubleshooting deploy

| Sintomo | Causa | Fix |
|---|---|---|
| `Error: INVOICE_ENCRYPTION_KEY non impostata in produzione` nei log Vercel | env var mancante | aggiungi `INVOICE_ENCRYPTION_KEY` su Vercel + Redeploy |
| Pagina /admin/fatturazione crash 500 | tabelle mancanti su Turso | apri qualsiasi pagina che usa `getDb()` (es. /api/auth con un login fittizio) → trigger `CREATE TABLE IF NOT EXISTS` |
| `POST /api/invoices/[id]/send` ritorna `Credenziali ACube non configurate` | env vars `ACUBE_USERNAME`/`ACUBE_PASSWORD` mancanti | aggiungi su Vercel + Redeploy |
| Webhook ACube ritornano `401 Webhook auth invalida` | webhook secret diverso fra DB e ApiConfiguration | rigenera dal pannello impostazioni Fiumana e reincolla nelle 5 ApiConfiguration ACube |
| Build Vercel fallisce con `Type error` | drift tra dev e prod | localmente: `npx tsc --noEmit -p .` deve essere pulito prima del push |

---

## Cosa fare adesso (riassunto operativo)

1. ✅ `openssl rand -base64 32` → salva la chiave
2. ✅ `git add . && git commit && git push`
3. ✅ Vercel: aggiungi le 4 env vars nuove (`INVOICE_ENCRYPTION_KEY`, `ACUBE_USERNAME`, `ACUBE_PASSWORD`, `ACUBE_API_BASE_URL`) + Redeploy
4. ✅ Apri `https://<tuo-dominio>/admin/fatturazione/impostazioni` → genera webhook secret
5. ✅ Crea le 5 ApiConfiguration su dashboard ACube con URL produzione
6. ✅ Crea bozza fattura da una prenotazione → "Invia ad ACube" → guarda il marking aggiornarsi via webhook

A quel punto il modulo è in produzione e funzionante end-to-end.
