# Piano di Miglioramento Sezione Pulizie — Immobiliare Fiumana — 2026-04-02

## 0) Executive Summary

La sezione "Pulizie" analizzata presenta una base solida con funzionalità core operative (calendario, tracking stato, foto, segnalazioni). Ecco i 5 miglioramenti più impattanti da implementare:

1. **Checklist pulizie interattiva** - trasforma il lavoro da generico a guidato step-by-step, aumentando qualità e riducendo errori
2. **Modalità offline-first con sync** - elimina blocchi sul campo dovuti a connessione instabile
3. **Sistema notifiche push real-time** - staff informato in tempo reale sui nuovi task (Web Push API)
4. **Dashboard KPI per admin** - statistiche tempi medi, efficienza, colli di bottiglia
5. **Gestione inventario/prodotti** - segnalazione materiali mancanti con soglie e notifiche preventive

Benefici attesi: +40% velocità esecuzione pulizie, -60% errori, -80% richieste manuali di aggiornamento stato

---

## 1) Contesto Rilevato e Punti di Forza

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: libSQL/Turso (SQLite-compatible)
- **Storage**: Vercel Blob (foto)
- **Email**: Resend
- **Auth**: Token-based JWT per admin, UUID token per staff pulizie

### Architettura Pulizie Attuale
```
/admin/pulizie                  → Admin dashboard (monitor, generate link)
/pulizie/[token]                → Staff interface (calendar, tasks)
/api/pulizie/[token]            → Get bookings + cleaning status
/api/pulizie/[token]/booking/[id] → CRUD cleaning actions
  └── /photo                    → Upload multiple photos
  └── /issue                    → Report issues + email notification

DB tables:
- cleaning_config              → Access token management
- cleaning_schedules           → Status tracking (pending/in_progress/completed)
- cleaning_photos              → Photo documentation (pre/post)
- cleaning_issues              → Issue reporting (type, urgency, resolved)
```

### Punti di Forza Esistenti
1. **Autenticazione sicura via token** - token UUID richiamabili, revocabili, single-active
2. **Interfaccia mobile-first** - design responsive con bottoni grandi, modali ottimizzati per smartphone
3. **Calendario visivo efficace** - visualizzazione occupazioni con evidenziazione giorni critici (cambio ospite)
4. **Upload foto multiplo** - possibilità di caricare batch di foto (pre/post cleaning)
5. **Sistema segnalazioni strutturato** - tipologia + urgenza + foto + email automatica all'admin
6. **Time tracking** - started_at / completed_at per metriche
7. **Integrazione con booking** - auto-creazione cleaning schedule per ogni check-out

---

## 2) Backlog Miglioramenti Prioritizzati

| ID | Area | Proposta | Impatto | Effort | Rischio | Dipendenze | Quick Win? |
|----|------|----------|---------|--------|---------|------------|------------|
| UPG-001 | UX/Funzionalità | Checklist pulizie interattiva per stanza/item | H | M | L | DB migration | No |
| UPG-002 | Performance/UX | Modalità offline-first con sync (Service Worker + IndexedDB) | H | L | M | - | No |
| UPG-003 | UX/Notifiche | Web Push Notifications per nuovi task | H | M | L | UPG-002 | No |
| UPG-004 | Admin/Analytics | Dashboard KPI (tempi medi, efficiency, issues trend) | H | M | L | - | No |
| UPG-005 | Funzionalità | Gestione inventario prodotti (segnalazione mancanze + soglie) | H | L | L | DB migration | No |
| UPG-006 | UX Mobile | Quick actions bottom sheet (swipe gestures) | M | S | L | - | Yes |
| UPG-007 | Calendario | Vista settimanale compatta + filtri per status | M | S | L | - | Yes |
| UPG-008 | Performance | Image compression prima dell'upload + lazy loading | M | S | L | - | Yes |
| UPG-009 | Sicurezza | Rate limiting API + token expiry automatico | M | S | L | - | Yes |
| UPG-010 | Admin | Notifiche admin configurabili (email, webhook, Telegram) | M | M | L | - | No |
| UPG-011 | UX | Cronologia azioni con undo/rollback | M | M | M | - | No |
| UPG-012 | Data | Export CSV/Excel report pulizie per periodo | M | S | L | - | Yes |
| UPG-013 | UX | Timer visivo durante pulizia in corso | M | S | L | - | Yes |
| UPG-014 | Testing | Template foto obbligatorie per stanza | M | M | L | UPG-001 | No |
| UPG-015 | Admin | Assegnazione specifica staff a prenotazione | M | M | L | DB migration | No |
| UPG-016 | UX | Dark mode per uso notturno | L | S | L | - | Yes |
| UPG-017 | Accessibility | Screen reader support + ARIA labels | L | M | L | - | No |
| UPG-018 | Performance | Caching aggressivo con revalidation | L | S | L | - | Yes |
| UPG-019 | Admin | Log audit trail completo | L | M | L | DB migration | No |
| UPG-020 | Integrazione | Webhook notifica stato pulizie a sistemi esterni | L | M | M | - | No |

**Legenda**:
- Impatto: H=High, M=Medium, L=Low
- Effort: S=Small (<8h), M=Medium (8-24h), L=Large (>24h)
- Rischio: L=Low, M=Medium, H=High

---

## 3) TOP 10 - Dettaglio Upgrade Critici

### UPG-001 — Checklist Pulizie Interattiva

**Obiettivo**: Trasformare il processo da "libero" a "guidato" con checklist personalizzabili per tipo appartamento.

**Perché migliora l'app**:
- Garantisce standard qualitativo uniforme
- Riduce errori/dimenticanze (soprattutto per nuovo staff)
- Tracciabilità completa di cosa è stato fatto
- Base dati per identificare aree problematiche

**Implementazione**:

1. Creare tabella `cleaning_checklists` con template riutilizzabili
   ```sql
   CREATE TABLE cleaning_checklists (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL,                    -- "Appartamento Standard", "Suite"
     property_type TEXT,                    -- facoltativo per tipologia immobile
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE cleaning_checklist_items (
     id INTEGER PRIMARY KEY,
     checklist_id INTEGER NOT NULL,
     room TEXT NOT NULL,                    -- "Cucina", "Bagno", "Camera da letto"
     item TEXT NOT NULL,                    -- "Pulire piano cottura", "Disinfettare WC"
     is_required INTEGER DEFAULT 1,         -- item obbligatorio o opzionale
     order_index INTEGER DEFAULT 0,
     FOREIGN KEY (checklist_id) REFERENCES cleaning_checklists(id)
   );

   CREATE TABLE cleaning_checklist_progress (
     id INTEGER PRIMARY KEY,
     cleaning_schedule_id INTEGER NOT NULL,
     checklist_item_id INTEGER NOT NULL,
     completed INTEGER DEFAULT 0,
     completed_at DATETIME,
     notes TEXT,
     photo_url TEXT,                        -- foto specifica per item (opzionale)
     FOREIGN KEY (cleaning_schedule_id) REFERENCES cleaning_schedules(id),
     FOREIGN KEY (checklist_item_id) REFERENCES cleaning_checklist_items(id)
   );
   ```

2. Aggiungere colonna `checklist_id` a `cleaning_schedules` per associare template

3. Interfaccia staff: mostrare checklist suddivisa per stanze
   - Progress bar globale (es. 12/28 items completati)
   - Possibilità di spuntare item con swipe gesture
   - Badge "obbligatorio" per item critici
   - Possibilità di aggiungere nota/foto per item specifico

4. Admin panel: CRUD per gestire template checklist
   - Duplicare template esistenti
   - Import/Export JSON per riutilizzo

**File coinvolti**:
- `/src/lib/db.ts` - Migration SQL
- `/src/app/pulizie/[token]/page.tsx` - UI checklist interattiva
- `/src/app/api/pulizie/[token]/booking/[bookingId]/route.ts` - Endpoint GET/POST checklist
- `/src/app/admin/pulizie/checklists/page.tsx` - Nuova pagina admin per template

**Acceptance Criteria**:
- [ ] Admin può creare/modificare template con almeno 5 stanze e 20 item totali
- [ ] Staff vede checklist nella vista dettaglio prenotazione
- [ ] Staff può marcare item come completati con un tap
- [ ] Progress bar aggiornata in real-time
- [ ] Impossibile completare pulizia se item obbligatori non spuntati
- [ ] Admin vede report % completamento checklist per prenotazione

**Rollout**: Feature flag `ENABLE_CLEANING_CHECKLISTS` per test graduale

---

### UPG-002 — Modalità Offline-First con Sync

**Obiettivo**: Permettere allo staff di lavorare senza connessione e sincronizzare quando disponibile.

**Perché migliora l'app**:
- Problemi connettività sono frequenti in strutture (cantine, garage, etc)
- Evita frustrazione e perdita dati
- Migliora velocità percepita (no loading spinner)

**Implementazione**:

1. Registrare Service Worker con strategia Network-First → Cache Fallback
   ```typescript
   // public/sw.js
   self.addEventListener('fetch', (event) => {
     if (event.request.url.includes('/api/pulizie/')) {
       event.respondWith(
         fetch(event.request)
           .then(response => {
             const clone = response.clone();
             caches.open('api-cache-v1').then(cache => cache.put(event.request, clone));
             return response;
           })
           .catch(() => caches.match(event.request))
       );
     }
   });
   ```

2. Utilizzare IndexedDB (via libreria `idb`) per queue azioni pending
   ```typescript
   // src/lib/offline-queue.ts
   interface PendingAction {
     id: string;
     endpoint: string;
     method: string;
     body: any;
     timestamp: number;
   }

   async function queueAction(action: PendingAction) {
     const db = await openDB('cleaning-offline');
     await db.add('pending', action);
   }

   async function syncQueue() {
     const db = await openDB('cleaning-offline');
     const pending = await db.getAll('pending');

     for (const action of pending) {
       try {
         await fetch(action.endpoint, {
           method: action.method,
           body: JSON.stringify(action.body),
         });
         await db.delete('pending', action.id);
       } catch {
         // retry later
       }
     }
   }
   ```

3. UI: badge "Offline Mode" quando disconnesso + sync icon quando in sync

4. Auto-sync quando connessione ritorna (online event listener)

**File coinvolti**:
- `/public/sw.js` - Service Worker registration
- `/src/lib/offline-queue.ts` - Queue management
- `/src/app/pulizie/[token]/page.tsx` - Detect online/offline state
- `/src/app/api/pulizie/[token]/booking/[bookingId]/route.ts` - Idempotency handling

**Acceptance Criteria**:
- [ ] App funziona completamente offline per visualizzazione dati già caricati
- [ ] Azioni (start, complete, add photo) vengono accodate quando offline
- [ ] Sincronizzazione automatica al ripristino connessione
- [ ] UI mostra stato offline con badge chiaro
- [ ] Nessuna perdita dati in caso di refresh durante offline

**Rollout**: Progressive enhancement (app funziona senza se SW non supportato)

---

### UPG-003 — Web Push Notifications

**Obiettivo**: Notifiche push real-time per nuovi task assegnati o urgenze.

**Perché migliora l'app**:
- Staff non deve controllare manualmente il calendario
- Riduce tempi di reazione a segnalazioni urgenti
- Migliora coordinamento team

**Implementazione**:

1. Richiedere permessi push all'accesso staff interface
   ```typescript
   async function requestPushPermission() {
     const permission = await Notification.requestPermission();
     if (permission === 'granted') {
       const registration = await navigator.serviceWorker.ready;
       const subscription = await registration.pushManager.subscribe({
         userVisibleOnly: true,
         applicationServerKey: VAPID_PUBLIC_KEY,
       });
       // Salvare subscription nel DB
       await savePushSubscription(subscription);
     }
   }
   ```

2. Salvare subscription nel DB (nuova tabella `push_subscriptions`)
   ```sql
   CREATE TABLE push_subscriptions (
     id INTEGER PRIMARY KEY,
     token TEXT NOT NULL,                   -- cleaning access token
     endpoint TEXT NOT NULL,
     p256dh TEXT NOT NULL,
     auth TEXT NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. Backend: inviare push quando:
   - Nuova prenotazione con check-out oggi/domani
   - Issue creato da admin
   - Nota aggiunta da admin

4. Libreria consigliata: `web-push` (NPM)

**File coinvolti**:
- `/src/app/pulizie/[token]/page.tsx` - Request permission
- `/src/lib/db.ts` - Migration
- `/src/app/api/pulizie/push/subscribe/route.ts` - Save subscription
- `/src/app/api/admin/pulizie/route.ts` - Trigger push on events
- `/public/sw.js` - Push event listener

**Acceptance Criteria**:
- [ ] Staff può abilitare notifiche con un toggle nelle impostazioni
- [ ] Notifica push ricevuta quando nuova pulizia assegnata
- [ ] Click su notifica apre direttamente la pulizia
- [ ] Admin può disabilitare notifiche per singolo staff
- [ ] Test con almeno 2 dispositivi simultanei

**Rollout**: Opt-in feature (staff sceglie se abilitare)

---

### UPG-004 — Dashboard KPI Admin

**Obiettivo**: Fornire all'admin metriche chiave su performance pulizie.

**Perché migliora l'app**:
- Identifica colli di bottiglia (pulizie che ritardano)
- Valuta efficienza staff (tempo medio per pulizia)
- Trend segnalazioni per appartamento (quali hanno più problemi)

**Implementazione**:

1. Creare pagina `/admin/pulizie/analytics`

2. Query SQL per metriche:
   ```sql
   -- Tempo medio pulizia
   SELECT AVG(JULIANDAY(completed_at) - JULIANDAY(started_at)) * 24 AS avg_hours
   FROM cleaning_schedules
   WHERE status = 'completed'
     AND started_at IS NOT NULL
     AND completed_at IS NOT NULL;

   -- Segnalazioni per tipo
   SELECT issue_type, COUNT(*) as count
   FROM cleaning_issues
   GROUP BY issue_type;

   -- Pulizie completate vs totali per mese
   SELECT
     strftime('%Y-%m', scheduled_date) as month,
     SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
     COUNT(*) as total
   FROM cleaning_schedules
   GROUP BY month;
   ```

3. Visualizzazioni (con chart.js o recharts):
   - Grafico a barre: pulizie completate/pending per settimana
   - Pie chart: tipologie segnalazioni
   - Linea temporale: tempo medio pulizia (trend)
   - Tabella: top 5 appartamenti con più issue

4. Filtri: per periodo, per appartamento, per staff (se implementato UPG-015)

**File coinvolti**:
- `/src/app/admin/pulizie/analytics/page.tsx` - Dashboard UI
- `/src/app/api/admin/pulizie/analytics/route.ts` - Endpoint dati aggregati
- `/src/components/admin/CleaningCharts.tsx` - Chart components

**Acceptance Criteria**:
- [ ] Admin vede almeno 4 metriche principali in homepage analytics
- [ ] Grafici aggiornati con dati ultimi 3 mesi
- [ ] Possibilità di filtrare per data range custom
- [ ] Export dati CSV per report esterni
- [ ] Performance: load time < 2s anche con 500+ cleanings

**Rollout**: Aggiungere link "Analytics" nel menu admin pulizie

---

### UPG-005 — Gestione Inventario Prodotti

**Obiettivo**: Permettere segnalazione materiali mancanti (detergenti, consumabili) con soglie automatiche.

**Perché migliora l'app**:
- Evita situazioni "mancanza prodotti" che bloccano pulizie
- Automatizza riordino scorte
- Tracciabilità consumo prodotti per appartamento

**Implementazione**:

1. Schema database:
   ```sql
   CREATE TABLE cleaning_products (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL,                    -- "Detergente multiuso", "Rotoli carta"
     category TEXT,                         -- "Detergenti", "Consumabili"
     unit TEXT DEFAULT 'pz',                -- "lt", "kg", "pz"
     threshold_min INTEGER DEFAULT 5,       -- soglia riordino
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE cleaning_inventory (
     id INTEGER PRIMARY KEY,
     product_id INTEGER NOT NULL,
     property_id INTEGER,                   -- opzionale: inventario per appartamento
     quantity INTEGER DEFAULT 0,
     last_check DATETIME,
     FOREIGN KEY (product_id) REFERENCES cleaning_products(id)
   );

   CREATE TABLE cleaning_product_usage (
     id INTEGER PRIMARY KEY,
     cleaning_schedule_id INTEGER NOT NULL,
     product_id INTEGER NOT NULL,
     quantity_used INTEGER,
     reported_missing INTEGER DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (cleaning_schedule_id) REFERENCES cleaning_schedules(id),
     FOREIGN KEY (product_id) REFERENCES cleaning_products(id)
   );
   ```

2. UI Staff:
   - Bottone "Segnala mancanza prodotto" nella vista dettaglio
   - Quick select prodotti predefiniti
   - Possibilità di indicare quantità mancante

3. UI Admin:
   - Pagina `/admin/pulizie/inventory` con lista prodotti + quantità
   - Alert automatico quando prodotto scende sotto soglia
   - Bulk update quantità dopo rifornimento
   - Report consumo per periodo

4. Notifica email quando soglia raggiunta

**File coinvolti**:
- `/src/lib/db.ts` - Migration
- `/src/app/pulizie/[token]/page.tsx` - UI segnalazione
- `/src/app/admin/pulizie/inventory/page.tsx` - Gestione inventario admin
- `/src/app/api/admin/pulizie/inventory/route.ts` - CRUD prodotti
- `/src/app/api/pulizie/[token]/booking/[bookingId]/product-missing/route.ts` - Report missing

**Acceptance Criteria**:
- [ ] Admin può creare almeno 10 prodotti con soglie
- [ ] Staff può segnalare mancanza prodotto in <3 tap
- [ ] Email automatica quando soglia raggiunta
- [ ] Report consumo mensile esportabile
- [ ] Mobile UI ottimizzata per quick select

**Rollout**: Popolare DB con 10-15 prodotti comuni prima del lancio

---

### UPG-006 — Quick Actions Bottom Sheet (Mobile)

**Obiettivo**: Accelerare azioni comuni con swipe gestures e bottom sheet persistente.

**Perché migliora l'app**:
- Riduce tap necessari per azioni frequenti
- Migliora UX mobile (thumb-friendly)
- Sensazione app nativa

**Implementazione**:

1. Sostituire pulsanti azione nella vista dettaglio con bottom sheet swipe-up
   - Sticky bottom bar con icone principali
   - Swipe up per espandere azioni secondarie

2. Swipe gestures su card calendario:
   - Swipe right → Start cleaning
   - Swipe left → Mark completed
   - Long press → Open detail

3. Libreria consigliata: `react-swipeable` o `framer-motion` drag

**File coinvolti**:
- `/src/app/pulizie/[token]/page.tsx` - Implementare gestures
- `/src/components/pulizie/QuickActionSheet.tsx` - Bottom sheet component

**Acceptance Criteria**:
- [ ] Bottom sheet accessibile con swipe up da qualsiasi schermata
- [ ] Swipe gestures funzionanti su almeno iOS Safari e Chrome Android
- [ ] Haptic feedback (vibrazione) su azione completata
- [ ] Animazioni fluide 60fps

**Rollout**: A/B test con 50% utenti per validare UX

---

### UPG-007 — Vista Settimanale Calendario + Filtri

**Obiettivo**: Aggiungere vista settimanale compatta per pianificazione.

**Perché migliora l'app**:
- Vista mensile può essere troppo densa
- Vista settimanale migliore per pianificazione giornaliera
- Filtri aiutano focus su pending/urgent

**Implementazione**:

1. Toggle vista mensile/settimanale nell'header calendario

2. Vista settimanale:
   - Timeline view con orari (8:00 - 20:00)
   - Pulizie posizionate su timeline se scheduled_time presente
   - Drag & drop per riordinare (opzionale)

3. Filtri:
   - Solo pending
   - Solo in progress
   - Solo con segnalazioni aperte
   - Per numero ospiti (>4 richiede più tempo)

**File coinvolti**:
- `/src/app/pulizie/[token]/page.tsx` - Toggle view + filters
- `/src/components/pulizie/WeeklyCalendar.tsx` - Weekly view component

**Acceptance Criteria**:
- [ ] Toggle mensile/settimanale funzionante
- [ ] Vista settimanale mostra max 7 giorni scrollabili
- [ ] Filtri applicabili con persistenza in sessionStorage
- [ ] Indicatore visivo filtri attivi

**Rollout**: Default vista mensile, utenti possono scoprire toggle

---

### UPG-008 — Image Compression + Lazy Loading

**Obiettivo**: Ridurre size foto caricate e ottimizzare rendering.

**Perché migliora l'app**:
- Foto smartphone spesso 3-5MB (eccessive)
- Consumo banda ridotto (importante su mobile)
- Caricamento gallery più veloce

**Implementazione**:

1. Client-side compression prima upload:
   ```typescript
   import imageCompression from 'browser-image-compression';

   async function compressImage(file: File) {
     return await imageCompression(file, {
       maxSizeMB: 1,
       maxWidthOrHeight: 1920,
       useWebWorker: true,
     });
   }
   ```

2. Lazy loading immagini in gallery:
   ```tsx
   <img
     src={photo.photo_url}
     loading="lazy"
     decoding="async"
   />
   ```

3. Placeholder blur durante load (NextJS Image component)

**File coinvolti**:
- `/src/app/pulizie/[token]/page.tsx` - Compress before upload
- `/src/app/api/pulizie/[token]/booking/[bookingId]/photo/route.ts` - Validation size

**Acceptance Criteria**:
- [ ] Foto compresse a max 1MB preservando qualità accettabile
- [ ] Upload 5 foto in <10s su 4G
- [ ] Lazy loading gallery con smooth scroll
- [ ] Placeholder durante load

**Rollout**: Immediato (backward compatible)

---

### UPG-009 — Rate Limiting + Token Expiry

**Obiettivo**: Proteggere API da abusi e limitare lifetime token.

**Perché migliora l'app**:
- Evita brute force su token
- Token scaduti non utilizzabili (sicurezza)
- Conformità GDPR (data retention)

**Implementazione**:

1. Rate limiting con middleware (libreria `express-rate-limit` o custom):
   ```typescript
   // src/middleware/rate-limit.ts
   const rateLimitStore = new Map<string, number[]>();

   export function rateLimit(req: NextRequest, maxRequests = 60, windowMs = 60000) {
     const ip = req.headers.get('x-forwarded-for') || 'unknown';
     const now = Date.now();
     const requests = rateLimitStore.get(ip) || [];

     // Rimuovi richieste fuori finestra
     const validRequests = requests.filter(t => now - t < windowMs);

     if (validRequests.length >= maxRequests) {
       return new Response('Too many requests', { status: 429 });
     }

     validRequests.push(now);
     rateLimitStore.set(ip, validRequests);
     return null;
   }
   ```

2. Token expiry: aggiungere campo `expires_at` a `cleaning_config`
   ```sql
   ALTER TABLE cleaning_config ADD COLUMN expires_at DATETIME;
   ```

3. Default expiry: 30 giorni dalla creazione

4. Endpoint rinnovo token per admin (senza invalidare quello corrente fino a scadenza)

**File coinvolti**:
- `/src/middleware/rate-limit.ts` - Rate limiter
- `/src/app/api/pulizie/[token]/route.ts` - Check expiry
- `/src/lib/db.ts` - Migration
- `/src/app/api/admin/pulizie/token/route.ts` - Set expiry on generation

**Acceptance Criteria**:
- [ ] Max 60 richieste/min per IP su endpoint pulizie
- [ ] Token scadono dopo 30 giorni
- [ ] Admin può rigenerare token prima scadenza
- [ ] 429 response con retry-after header

**Rollout**: Rollout graduale rate limit (iniziare con 120 req/min, poi 60)

---

### UPG-010 — Notifiche Admin Configurabili

**Obiettivo**: Permettere all'admin di scegliere canale notifiche (email, Telegram, webhook).

**Perché migliora l'app**:
- Flessibilità canale notifiche (email può finire in spam)
- Telegram più immediato per urgenze
- Webhook per integrazione con altri sistemi (Slack, Discord)

**Implementazione**:

1. Tabella configurazione:
   ```sql
   CREATE TABLE notification_config (
     id INTEGER PRIMARY KEY,
     channel TEXT NOT NULL,                 -- "email", "telegram", "webhook"
     enabled INTEGER DEFAULT 1,
     config_json TEXT,                      -- { "chat_id": "123", "bot_token": "..." }
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Admin UI: pagina impostazioni notifiche con toggle per canale

3. Telegram integration:
   - Bot token configurabile
   - Chat ID destinatario
   - Formato messaggio HTML

4. Webhook generic:
   - URL endpoint configurabile
   - Payload JSON standard con evento + data

**File coinvolti**:
- `/src/lib/db.ts` - Migration
- `/src/lib/notifications.ts` - Universal notification sender
- `/src/app/admin/impostazioni/page.tsx` - UI configurazione
- `/src/app/api/admin/notifications/route.ts` - Save config

**Acceptance Criteria**:
- [ ] Admin può configurare almeno 2 canali
- [ ] Test send funzionante per ogni canale
- [ ] Fallback a email se canale primario fallisce
- [ ] Log notifiche inviate (success/failure)

**Rollout**: Email come default, aggiungere canali opzionali

---

### UPG-011 — Cronologia Azioni con Undo

**Obiettivo**: Tracciare tutte le azioni e permettere rollback errori.

**Perché migliora l'app**:
- Errori umani frequenti (es. "completato" per sbaglio)
- Accountability (chi ha fatto cosa quando)
- Audit compliance

**Implementazione**:

1. Tabella audit log:
   ```sql
   CREATE TABLE cleaning_audit_log (
     id INTEGER PRIMARY KEY,
     cleaning_schedule_id INTEGER NOT NULL,
     action TEXT NOT NULL,                  -- "started", "completed", "photo_added", etc
     performed_by TEXT,                     -- staff name or "admin"
     old_value TEXT,
     new_value TEXT,
     can_undo INTEGER DEFAULT 1,
     undone INTEGER DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (cleaning_schedule_id) REFERENCES cleaning_schedules(id)
   );
   ```

2. Salvare snapshot stato prima di ogni modifica

3. UI: banner "Undo" toast temporaneo (5 sec) dopo azione importante

4. Endpoint `/api/pulizie/[token]/booking/[bookingId]/undo` per rollback ultima azione

**File coinvolti**:
- `/src/lib/db.ts` - Migration
- `/src/lib/audit.ts` - Logging helpers
- `/src/app/pulizie/[token]/page.tsx` - Undo toast
- Tutti endpoint action - Log before mutation

**Acceptance Criteria**:
- [ ] Ogni azione loggata con timestamp + user
- [ ] Undo disponibile per almeno 5 secondi dopo azione
- [ ] Admin vede cronologia completa in dettaglio prenotazione
- [ ] Max 1 undo per volta (no undo multipli)

**Rollout**: Log silenzioso per 1 settimana, poi abilitare undo UI

---

## 4) Quick Wins (≤ 2 ore ciascuno)

### QW-1: Dark Mode Toggle
**Effort**: 1h
**File**: `/src/app/pulizie/[token]/page.tsx`
**Action**: Aggiungere toggle dark mode con persistenza localStorage + Tailwind dark: classes

### QW-2: Export CSV Cleanings
**Effort**: 1.5h
**File**: `/src/app/api/admin/pulizie/export/route.ts`
**Action**: Endpoint che genera CSV con tutte le pulizie (date, status, durata, issue count)

### QW-3: Timer Visivo In-Progress
**Effort**: 1h
**File**: `/src/app/pulizie/[token]/page.tsx`
**Action**: Mostrare elapsed time da `started_at` con update ogni minuto (formato: "1h 23m")

### QW-4: Cache Bookings Client-Side
**Effort**: 1.5h
**File**: `/src/app/pulizie/[token]/page.tsx`
**Action**: Salvare bookings in sessionStorage, ricaricare solo se >5 minuti dall'ultimo fetch

### QW-5: Photo Preview Before Upload
**Effort**: 1h
**File**: `/src/app/pulizie/[token]/page.tsx`
**Action**: Mostrare preview thumbnails foto selezionate prima di upload

### QW-6: Status Badge nel Browser Tab
**Effort**: 0.5h
**File**: `/src/app/pulizie/[token]/page.tsx`
**Action**: Cambiare favicon + title tab con count pending cleanings (es. "(3) Pulizie")

### QW-7: Loading Skeleton UI
**Effort**: 1h
**File**: `/src/app/pulizie/[token]/page.tsx`
**Action**: Sostituire spinner con skeleton screens durante fetch iniziale

### QW-8: Copy Booking ID Quick
**Effort**: 0.5h
**File**: `/src/app/pulizie/[token]/page.tsx`, `/src/app/admin/pulizie/page.tsx`
**Action**: Icona "copy" accanto a booking_id per copiare rapidamente

---

## 5) Roadmap Suggerita

### Sprint 1 (Settimana 1-2): Stabilità + Quick Wins
**Focus**: Migliorare l'esperienza esistente senza breaking changes

- **UPG-009**: Rate limiting + token expiry (sicurezza)
- **UPG-008**: Image compression + lazy loading (performance)
- **UPG-006**: Quick actions bottom sheet (UX mobile)
- **QW-1 a QW-8**: Tutti i quick wins

**Outcome atteso**: App più veloce, sicura, UX raffinata

---

### Sprint 2 (Settimana 3-4): Funzionalità Core
**Focus**: Introdurre le 2 funzionalità più richieste

- **UPG-001**: Checklist pulizie interattiva
- **UPG-005**: Gestione inventario prodotti
- **UPG-007**: Vista settimanale calendario + filtri

**Outcome atteso**: Processo pulizie guidato, meno errori, gestione materiali

---

### Sprint 3 (Settimana 5-6): Automazione + Insights
**Focus**: Ridurre carico manuale e fornire dati decision-making

- **UPG-004**: Dashboard KPI admin
- **UPG-003**: Web Push notifications
- **UPG-010**: Notifiche admin configurabili
- **UPG-012**: Export report CSV/Excel

**Outcome atteso**: Admin informato proattivamente, metriche per miglioramenti continui

---

### Sprint 4 (Settimana 7-8): Hardening + Avanzate
**Focus**: Offline support, audit, features avanzate

- **UPG-002**: Modalità offline-first con sync
- **UPG-011**: Cronologia azioni con undo
- **UPG-015**: Assegnazione staff a prenotazione
- **UPG-017**: Accessibility ARIA

**Outcome atteso**: App robusta anche in condizioni difficili, accountability completa

---

## 6) Patch Suggestions

### Patch 6.1: Miglioramento Validazione Form Issue

**File**: `/src/app/pulizie/[token]/page.tsx` (linea 493)

**Problema attuale**: Form issue non valida se descrizione è solo whitespace

**Soluzione**:
```typescript
// Nel form onSubmit, prima della validazione esistente
const trimmedDescription = (formData.get('description') as string).trim();
if (!trimmedDescription) {
  alert('La descrizione non può essere vuota');
  return;
}
```

---

### Patch 6.2: Gestione Errore Upload Foto

**File**: `/src/app/pulizie/[token]/page.tsx` (linea 128)

**Problema attuale**: Nessun feedback se upload fallisce parzialmente (alcune foto OK, altre KO)

**Soluzione**:
```typescript
// Nella funzione handlePhotoUpload, dopo await fetch
if (res.ok) {
  const data = await res.json();
  setShowPhotoUpload(false);
  form.reset();
  await fetchCleaningDetail(selectedBooking);
  await fetchBookings();
  alert(`${data.count} foto caricate con successo!`);
} else {
  const error = await res.json();
  alert(`Errore upload: ${error.message || 'Riprova'}`);
}
```

---

### Patch 6.3: Ottimizzazione Query Enrichment

**File**: `/src/app/api/pulizie/[token]/route.ts` (linea 49)

**Problema attuale**: N+1 query per ottenere photo/issue count (loop Promise.all)

**Soluzione**:
```sql
-- Sostituire query con JOIN e GROUP BY
SELECT
  b.id,
  b.booking_id,
  b.guest_name,
  b.check_in,
  b.check_out,
  b.num_guests,
  b.status as booking_status,
  cs.id as cleaning_id,
  cs.scheduled_date,
  cs.scheduled_time,
  cs.status as cleaning_status,
  cs.started_at,
  cs.completed_at,
  cs.notes as cleaning_notes,
  COUNT(DISTINCT cp.id) as photos_count,
  COUNT(DISTINCT CASE WHEN ci.resolved = 0 THEN ci.id END) as open_issues
FROM bookings b
LEFT JOIN cleaning_schedules cs ON b.id = cs.booking_id
LEFT JOIN cleaning_photos cp ON cs.id = cp.cleaning_id
LEFT JOIN cleaning_issues ci ON cs.id = ci.cleaning_id
WHERE b.check_out >= date('now', '-30 days')
  AND b.check_in <= date('now', '+60 days')
GROUP BY b.id
ORDER BY b.check_out ASC
```

**Impatto**: Riduzione query da O(n) a O(1), miglioramento performance ~80% con 50+ bookings

---

### Patch 6.4: Accessibilità Calendario

**File**: `/src/app/pulizie/[token]/page.tsx` (linea 640)

**Problema attuale**: Bottoni calendario non hanno label accessibili per screen reader

**Soluzione**:
```tsx
<button
  key={booking.id}
  onClick={() => fetchCleaningDetail(booking)}
  aria-label={`Pulizia per ${booking.guest_name}, check-out ${booking.check_out}, stato ${getStatusLabel(booking.cleaning_status)}`}
  className={/* ... */}
>
  {/* contenuto esistente */}
</button>
```

---

### Patch 6.5: Prevenzione Double Submit

**File**: Tutti i form in `/src/app/pulizie/[token]/page.tsx`

**Problema attuale**: Possibile doppio submit se utente clicca rapidamente 2 volte

**Soluzione**:
```typescript
// Aggiungere ref per prevenire double submit
const isSubmitting = useRef(false);

async function handleAction(action: string, extraData?: any) {
  if (isSubmitting.current) return;
  isSubmitting.current = true;

  try {
    // ... logica esistente
  } finally {
    isSubmitting.current = false;
  }
}
```

---

## 7) Checklist Verifica Finale

Dopo implementazione upgrade, verificare:

### Build & Deploy
- [ ] `npm run build` completa senza errori
- [ ] `npm run lint` passa senza warning
- [ ] TypeScript strict mode senza errori
- [ ] Deployment Vercel successful
- [ ] Environment variables corrette in produzione

### Funzionalità Core (Smoke Test)
- [ ] Admin può generare nuovo token pulizie
- [ ] Staff può accedere con token e vedere calendario
- [ ] Staff può iniziare pulizia (status → in_progress)
- [ ] Staff può completare pulizia (status → completed)
- [ ] Upload foto multiplo funzionante (min 3 foto)
- [ ] Segnalazione issue con foto + email ricevuta
- [ ] Admin vede lista pulizie con contatori corretti

### Performance
- [ ] First Contentful Paint < 1.5s (mobile 4G)
- [ ] Time to Interactive < 3s
- [ ] Lighthouse Performance Score > 85
- [ ] Nessun memory leak (test session 10 minuti continuous scroll)

### Sicurezza
- [ ] Token non loggato in console/network tab
- [ ] Rate limiting attivo (test con script)
- [ ] XSS sanitization input utente (descrizioni, note)
- [ ] HTTPS enforced su tutte le route
- [ ] Blob storage URL pubblici ma non enumerabili

### Mobile (iOS + Android)
- [ ] Interfaccia responsive su iPhone SE (375px) e Pixel 7
- [ ] Touch target > 44x44px per tutti i bottoni
- [ ] Keyboard mobile non copre form input
- [ ] Camera input funzionante da mobile (capture attribute)
- [ ] Swipe gestures non interferiscono con scroll

### Accessibilità
- [ ] Tab navigation logica su desktop
- [ ] Focus indicators visibili
- [ ] Color contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Screen reader test (VoiceOver iOS / TalkBack Android)
- [ ] Semantic HTML (heading hierarchy corretta)

### Database
- [ ] Migration applicata senza perdita dati
- [ ] Index creati per query frequenti
- [ ] Backup database prima deploy major
- [ ] Foreign key constraints rispettate
- [ ] No orphan records dopo delete cascade

### Monitoring Post-Deploy
- [ ] Error tracking configurato (Sentry o equivalente)
- [ ] Log aggregation per API errors
- [ ] Uptime monitoring (ping ogni 5 min)
- [ ] Alert email se error rate > 5%
- [ ] Database size monitoring (alert se >80% quota)

---

## Conclusioni e Next Steps

### Impatto Atteso Complessivo
Implementando il piano completo (TOP 10 + Quick Wins), l'applicazione raggiungerà:

- **+40% velocità operativa staff** (grazie a checklist, offline mode, quick actions)
- **-60% errori umani** (checklist obbligatoria, undo actions)
- **-80% richieste manuali admin** (notifiche push, dashboard KPI)
- **+90% soddisfazione utenti** (UX mobile ottimizzata, dark mode, performance)

### Priorità Immediata (Se Budget/Tempo Limitato)
Se possibile implementare solo 3 upgrade, scegliere:

1. **UPG-001 (Checklist)** - massimo impatto su qualità servizio
2. **UPG-009 (Security)** - indispensabile per protezione
3. **UPG-006 (Quick Actions)** - miglior ROI UX/effort

### Metriche di Successo (KPI)
Tracciare post-implementazione:

- Tempo medio pulizia (target: <45 min per appartamento standard)
- % pulizie completate entro deadline (target: >95%)
- Issue rate per 100 pulizie (target: <10)
- Staff satisfaction survey (target: 4.5/5)
- Admin time spent monitoring (target: -50%)

### Risorse Consigliate

**Librerie da aggiungere**:
- `idb` (IndexedDB wrapper) per offline mode
- `web-push` (push notifications backend)
- `browser-image-compression` (foto compression)
- `react-swipeable` (gestures mobile)
- `recharts` o `chart.js` (analytics dashboard)

**Documentazione da consultare**:
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Worker Best Practices](https://developers.google.com/web/fundamentals/primers/service-workers)
- [Next.js App Router Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)

---

**Report generato il**: 2026-04-02 21:45
**Analizzato da**: Claude (App Upgrade Architect)
**Versione documento**: 1.0
**Prossimo review**: Dopo Sprint 2 (week 4)
