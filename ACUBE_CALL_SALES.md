# Brief per call con Sales ACube
*Da tenere aperto durante la chiamata*

---

## Chi siamo

**Cliente:** Immobiliare Fiumana S.r.l. — P.IVA `IT01340960481`
**Settore:** affitti brevi tramite Airbnb / Booking
**Volumi attesi:** ~~40 fatture attive/anno (una per ogni soggiorno)
**Sviluppatore:** Fabio Borselli
**Stato attuale:** sandbox A-Cube **già operativa** con integrazione completa

---

## Cosa abbiamo già fatto (tecnicamente)

Sull'account sandbox `borselli.fabio@gmail.com` (collegato alla SRL Immobiliare Fiumana) abbiamo:

- ✅ **BusinessRegistryConfiguration** creata e configurata:
  customer-invoice ON, supplier-invoice ON, signature OFF, legal-storage ON, scontrini OFF
- ✅ **NumberingSequence** "FiumanaAIR" con format `%Y/AIR/%04s` — UUID `2e98c5f3-4fd2-497f-ac32-af8398cd07fb`
- ✅ **3 fatture inviate** in sandbox con marking `sent`, l'ultima `2026/AIR/0003`
- ✅ **5 ApiConfiguration webhook** create per gli eventi: `customer-invoice`, `customer-notification`, `invoice-status-quarantena`, `invoice-status-invoice-error`, `legal-storage-receipt`
- ✅ Endpoint webhook produzione: `https://immobiliarefiumana.com/api/invoices/webhook/acube`

**Stack integrazione:** Next.js 14 su Vercel, OAuth2 password grant, payload JSON FatturaPA snake_case, webhook con bearer token in header `Authorization`. Tutto già live in produzione.

---

## Dove siamo (problemi aperti, utili da menzionare)

1. **Sandbox flaky sui webhook customer-notification**
   I marking change arrivano come `customer-invoice` ma le notifiche SDI vere e proprie (RC/MC/NS) nella sandbox non sembrano essere generate in modo affidabile. Domanda: la sandbox simula tutti i tipi di notifica SDI o solo alcuni?

2. **Dashboard sandbox non mostra "Last delivery attempts"** delle ApiConfiguration
   Mi piacerebbe poter vedere i tentativi di delivery di ogni webhook (URL + HTTP response) per debug. Esiste in produzione?

3. **Riconciliazione fatture passive Airbnb** non ancora implementata, ma è il prossimo step (commissioni Airbnb in reverse charge UE).

---

## Domande PRIORITARIE per il sales

### A) Pricing per la nostra dimensione

> *"Per ~~40 fatture attive/anno, regime ordinario RF01, niente firma elettronica, niente scontrini, niente Sistema TS — qual è il prezzo annuo? Esiste un piano dedicato a piccoli operatori del turismo?"*

Vuoi avere come benchmark **realistico** per i tuoi volumi: 40 fatture/anno × 0,06 €/fattura = **2,40 €/anno** su Openapi SDI. Aggiunto un eventuale fisso da ~10 €/anno = comunque sotto i 15 €/anno.

Quindi: se ACube ti propone un canone fisso > 50 €/anno, è sproporzionato per i tuoi volumi. Per piccoli operatori del turismo serve un piano "pay-per-use" senza canone fisso oppure un pacchetto starter molto contenuto.

### B) Conservazione sostitutiva — chiedere CONFERMA SCRITTA

> *"La conservazione che attivate dall'opzione `apply_legal_storage` è davvero a norma DPCM 3/12/2013 e Linee Guida AgID? Posso averlo per iscritto sul contratto? Quanti anni garantite di conservazione (servono 10 anni per legge)?"*

⚠️ Critico: senza la conservazione "a norma" siamo costretti a pagare un servizio terzo, e il vantaggio economico di ACube cala.

### C) Portabilità in caso di disdetta — CHIEDERE PER ISCRITTO

> *"Cosa succede ai nostri archivi se decidiamo di disdire il contratto? Per quanto tempo restano accessibili? Esiste un endpoint API per export massivo (ZIP completo: tutti gli XML + tutte le ricevute SDI + il PDF di conservazione) o è solo download manuale dalla dashboard? L'export è gratuito?"*

⚠️ Anche questo critico per evitare lock-in. Lo standard di mercato è **90 giorni di accesso post-disdetta** poi cancellazione — voglio sapere se ACube è meglio o peggio.

### D) Passaggio sandbox → produzione

> *"Quanto tempo richiede l'attivazione del nostro account produzione? Possiamo riusare lo stesso account o serve registrazione separata? Possiamo migrare la BusinessRegistry e la NumberingSequence dalla sandbox alla produzione, o devo ricrearle?"*

Idealmente vorrei che il counter `2026/AIR/####` continui dalla numerazione di produzione vera (la numerazione fiscale deve essere coerente, niente reset).

### E) Limiti volume sandbox

> *"In sandbox c'è un cap mensile/annuo di chiamate API o di webhook? Vorrei poter testare aggressivamente prima di passare in produzione."*

### F) Webhooks affidabili

> *"In produzione i webhook arrivano in modo affidabile? Ci sono SLA? Cosa succede se il nostro endpoint è down per 1 ora — i webhook vengono persi o messi in coda?"*

Dalla doc so che fate 15 retry × 300s con backoff 1.25 (~10h totali). Conferma anche per produzione.

### G) Supporto

> *"In caso di problemi tecnici/fiscali con una fattura specifica, qual è il canale di supporto? Tempi di risposta? È incluso nel piano o è add-on?"*

### H) Dashboard produzione

> *"La dashboard produzione ha funzioni che la sandbox non ha? In particolare: tracking delivery dei webhook, metriche, audit trail, stato conservazione, export contabile (es. registro IVA vendite)?"*

---

## Nice-to-have (se hai tempo durante la call)

- **API per fatture passive automatiche**: come ricevo automaticamente la fattura passiva Airbnb (commissioni in reverse charge UE) tramite ACube? Vorrei usare l'evento `supplier-invoice`.
- **Cassetto fiscale read-only**: l'integrazione `/cassettofiscale` permette di leggere documenti dal cassetto AdE? Mi servirebbe per verificare che tutte le fatture siano effettivamente lì.
- **Multi-azienda**: il pricing è per BusinessRegistry o è flat? Se in futuro Fiumana aprisse altre SRL con la stessa licenza, cosa cambia?

---

## Cosa NON serve dire (per ora)

- Il problema specifico del bearer token 401 sui webhook è nostro (config interna), non un loro bug.
- La numerazione `2026/AIR/0003` non riflette le fatture reali (sono test in sandbox), non ne parlare come se fossero fiscali.
- Non serve far vedere il codice — chiedono solo dimensioni e requisiti.

---

## TL;DR — Le 4 cose da portare a casa dalla call

1. **Preventivo scritto** per ~40 fatture/anno + conservazione a norma 10 anni
2. **Conservazione AgID-compliant**: confermato per iscritto
3. **Clausola portabilità**: 90+ giorni post-disdetta + endpoint API export massivo gratuito
4. **Tempistiche** per attivazione produzione

Se i punti 1 e 2 sono ok, valuti se firmare. Se il 3 è proibitivo (lock-in), valuti l'alternativa Openapi SDI.

⚠️ **Per 40 fatture/anno la convenienza ACube è tutta da dimostrare.** Se non hanno un piano realistico per piccoli operatori (≤ 30 €/anno tutto incluso), conviene sicuramente lasciar perdere e usare Openapi SDI. Lo `senderProvider` è swappabile in poche ore di lavoro grazie all'architettura sender-agnostic.
