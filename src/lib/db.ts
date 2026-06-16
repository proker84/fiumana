import { createClient, Client } from '@libsql/client';

let client: Client | null = null;
// Promise di inizializzazione: viene awaited dai wrapper dbExecute/dbQuery
// per evitare race condition fra "primo getDb()" e prime query in arrivo.
// Tutte le statement dentro initializeDb sono idempotenti (CREATE TABLE IF NOT
// EXISTS / ALTER con check PRAGMA / INSERT solo se vuoto), quindi awaitarla
// più volte è gratuito e non distruttivo per i dati esistenti.
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!client) {
    // Use Turso in production, local file in development
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      // Fallback to local SQLite file for development
      client = createClient({
        url: 'file:./data/immobiliare.db',
      });
    }

    // Avvia l'init e MEMORIZZA la promise. I wrapper la await prima di ogni query.
    initPromise = initializeDb(client);
  }
  return client;
}

/**
 * Attende che le CREATE TABLE / ALTER COLUMN della prima inizializzazione
 * siano completate. Non distrugge mai dati: tutte le statement sono idempotenti.
 * Sicuro chiamarla N volte (no-op dopo la prima).
 */
export async function ensureDbReady(): Promise<void> {
  if (!client) getDb(); // assicura che client + initPromise esistano
  if (initPromise) await initPromise;
}

async function initializeDb(db: Client) {
  try {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nome TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        indirizzo TEXT,
        citta TEXT,
        codice_struttura TEXT,
        tipo TEXT DEFAULT 'appartamento',
        attiva INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT UNIQUE NOT NULL,
        guest_token TEXT UNIQUE NOT NULL,
        property_id INTEGER,
        platform TEXT DEFAULT 'airbnb',
        guest_name TEXT,
        guest_email TEXT,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        num_guests INTEGER DEFAULT 1,
        total_amount REAL,
        status TEXT DEFAULT 'pending',
        alloggiati_sent INTEGER DEFAULT 0,
        alloggiati_sent_at DATETIME,
        alloggiati_receipt TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        progressivo INTEGER DEFAULT 1,
        tipo_alloggiato TEXT DEFAULT '16',
        camere_occupate INTEGER DEFAULT 1,
        cognome TEXT NOT NULL,
        nome TEXT NOT NULL,
        sesso TEXT NOT NULL,
        data_nascita DATE NOT NULL,
        comune_nascita TEXT,
        comune_nascita_codice TEXT,
        provincia_nascita TEXT,
        stato_nascita TEXT NOT NULL,
        cittadinanza TEXT NOT NULL,
        stato_residenza TEXT,
        comune_residenza TEXT,
        comune_residenza_codice TEXT,
        provincia_residenza TEXT,
        indirizzo_residenza TEXT,
        tipo_documento TEXT NOT NULL,
        numero_documento TEXT NOT NULL,
        stato_rilascio TEXT,
        comune_rilascio TEXT,
        comune_rilascio_codice TEXT,
        luogo_rilascio TEXT,
        data_arrivo DATE,
        giorni_permanenza INTEGER,
        documento_fronte TEXT,
        documento_retro TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alloggiati_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        wskey TEXT NOT NULL,
        password_encrypted TEXT,
        last_sync DATETIME
      );

      CREATE TABLE IF NOT EXISTS contact_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        email TEXT NOT NULL,
        telefono TEXT,
        citta_immobile TEXT,
        tipo_immobile TEXT,
        messaggio TEXT,
        formula_interesse TEXT,
        letto INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cleaning_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        access_token TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT 'Staff Pulizie',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cleaning_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        scheduled_date DATE,
        scheduled_time TEXT,
        status TEXT DEFAULT 'pending',
        started_at DATETIME,
        completed_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      );

      CREATE TABLE IF NOT EXISTS cleaning_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cleaning_id INTEGER NOT NULL,
        photo_url TEXT NOT NULL,
        photo_type TEXT DEFAULT 'post',
        caption TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cleaning_id) REFERENCES cleaning_schedules(id)
      );

      CREATE TABLE IF NOT EXISTS cleaning_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cleaning_id INTEGER NOT NULL,
        issue_type TEXT NOT NULL,
        description TEXT NOT NULL,
        urgency TEXT DEFAULT 'media',
        photo_url TEXT,
        resolved INTEGER DEFAULT 0,
        resolved_at DATETIME,
        resolved_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cleaning_id) REFERENCES cleaning_schedules(id)
      );

      CREATE TABLE IF NOT EXISTS alloggiati_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        receipt_id TEXT NOT NULL,
        send_date DATE NOT NULL,
        schedine_count INTEGER DEFAULT 1,
        permanenza_days INTEGER DEFAULT 1,
        questura TEXT DEFAULT 'FERRARA',
        pdf_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      );

      -- ============================================================
      -- MODULO FATTURAZIONE ELETTRONICA (ACube + SDI)
      -- ============================================================

      -- Configurazione emittente (singleton, id=1)
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
        pec_emittente TEXT,
        -- credenziali sender (cifrate AES-256-GCM)
        sender_provider TEXT,
        sender_api_key_encrypted TEXT,
        sender_endpoint TEXT,
        sender_test_mode INTEGER DEFAULT 1,
        webhook_secret TEXT,
        -- ACube specific
        acube_business_registry_uuid TEXT,
        acube_numbering_sequence_uuid TEXT,
        acube_numbering_sequence_name TEXT DEFAULT 'FiumanaAIR',
        acube_credit_note_sequence_uuid TEXT,
        acube_credit_note_sequence_name TEXT DEFAULT 'FiumanaAIRNC',
        -- conservazione
        conservazione_provider TEXT DEFAULT 'acube',
        -- default city tax: 50 cent (0,50 €) per notte per persona, max 14 notti.
        -- Override possibile per singola booking dal pannello prenotazione.
        tassa_soggiorno_default_cents INTEGER DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Anagrafica clienti (separata da guests perché serve indirizzo fiscale)
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL DEFAULT 'PF',
        ragione_sociale TEXT,
        cognome TEXT,
        nome TEXT,
        codice_fiscale TEXT,
        partita_iva TEXT,
        nazione TEXT NOT NULL DEFAULT 'IT',
        indirizzo TEXT,
        cap TEXT,
        comune TEXT,
        provincia TEXT,
        email TEXT,
        pec TEXT,
        codice_destinatario TEXT DEFAULT '0000000',
        is_estero INTEGER DEFAULT 0,
        source_guest_id INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_guest_id) REFERENCES guests(id)
      );

      -- Fatture
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_documento TEXT NOT NULL DEFAULT 'TD01',
        sezionale TEXT NOT NULL,
        numero INTEGER,
        anno INTEGER,
        numero_completo TEXT,
        data_documento DATE NOT NULL,
        booking_id INTEGER,
        customer_id INTEGER NOT NULL,
        parent_invoice_id INTEGER,
        idempotency_key TEXT UNIQUE,
        imponibile_cents INTEGER NOT NULL,
        iva_cents INTEGER NOT NULL,
        totale_cents INTEGER NOT NULL,
        aliquota_iva REAL NOT NULL DEFAULT 10.0,
        natura_iva TEXT,
        booking_total_cents INTEGER,
        city_tax_cents INTEGER,
        airbnb_commission_cents INTEGER,
        modalita_pagamento TEXT DEFAULT 'MP08',
        data_pagamento DATE,
        stato TEXT NOT NULL DEFAULT 'bozza',
        marking_acube TEXT,
        external_id TEXT,
        sdi_identificativo TEXT,
        xml_url TEXT,
        xml_filename TEXT,
        pdf_url TEXT,
        ricevuta_consegna_url TEXT,
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
        FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id)
      );

      -- Righe fattura
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        riga_numero INTEGER NOT NULL,
        descrizione TEXT NOT NULL,
        quantita REAL DEFAULT 1,
        prezzo_unitario_cents INTEGER NOT NULL,
        aliquota_iva REAL NOT NULL DEFAULT 10.0,
        natura_iva TEXT,
        imponibile_cents INTEGER NOT NULL,
        iva_cents INTEGER NOT NULL,
        totale_cents INTEGER NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );

      -- Storico notifiche SDI / log eventi ACube (audit trail)
      CREATE TABLE IF NOT EXISTS invoice_sdi_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        http_status INTEGER,
        payload_in TEXT,
        payload_out TEXT,
        error_code TEXT,
        error_message TEXT,
        raw_xml_url TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_bookings_token ON bookings(guest_token)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings(check_in)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_guests_booking ON guests(booking_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cleaning_schedules_booking ON cleaning_schedules(booking_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cleaning_photos_cleaning ON cleaning_photos(cleaning_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cleaning_issues_cleaning ON cleaning_issues(cleaning_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cleaning_config_token ON cleaning_config(access_token)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_alloggiati_receipts_booking ON alloggiati_receipts(booking_id)');

    // Indexes — modulo fatturazione
    await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_cf ON customers(codice_fiscale)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_piva ON customers(partita_iva)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_nazione ON customers(nazione)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_stato ON invoices(stato)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_data ON invoices(data_documento)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_external ON invoices(external_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_idemp ON invoices(idempotency_key)');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_numero_unique ON invoices(sezionale, numero, anno, tipo_documento) WHERE numero IS NOT NULL');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sdi_logs_invoice ON invoice_sdi_logs(invoice_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sdi_logs_event ON invoice_sdi_logs(event_type)');

    // Tabella message_templates: testi customizzabili dall'admin per messaggi
    // copiati negli appunti e inviati ai clienti via WhatsApp/email/etc.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        body TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed dei template (INSERT OR IGNORE per chiave): aggiunge i nuovi
    // template ai cold-start successivi senza sovrascrivere quelli esistenti
    // già modificati dall'admin. Viene saltato il record se template_key
    // esiste già (vincolo UNIQUE sulla colonna).
    const seedTemplates: Array<{ key: string; name: string; description: string; body: string }> = [
      {
        key: 'guest_registration',
        name: 'Messaggio di registrazione ospiti',
        description: 'Inviato all\'ospite dopo la prenotazione con il link al form Alloggiati. Variabili: {{firstName}}, {{guestName}}, {{guestLink}}, {{checkInDate}}, {{checkOutDate}}.',
        body: `Ciao {{firstName}}!

Grazie per aver prenotato con noi. Per completare il check-in, ti chiediamo di compilare i dati di tutti gli ospiti al seguente link:

{{guestLink}}

È un obbligo di legge italiano (art. 109 TULPS) comunicare i dati degli ospiti al Portale Alloggiati.

Ti chiediamo di compilare il modulo entro il giorno del check-in. Le istruzioni per il check-in ti saranno inviate il giorno prima del tuo arrivo.

Grazie e buon soggiorno!
Immobiliare Fiumana`,
      },
      {
        key: 'check_in_instructions',
        name: 'Istruzioni di check-in',
        description: 'Inviato il giorno prima del check-in con accesso, parcheggio, wifi. Variabili: {{firstName}}, {{checkInDate}}.',
        body: `Buongiorno {{firstName}}, ecco le istruzioni per il check-in di domani {{checkInDate}}:
L'appartamento è in via Tofane 4 - Lido di Pomposa, condominio Adriana.
https://maps.app.goo.gl/nr9mXs4WKy15V4eZ7
Dovrete inizialmente parcheggiare all'esterno del condominio. I cancelletti pedonali ai lati della struttura sono sempre aperti. L'appartamento è nel settore B - Secondo piano, appartamento 7.
Quando arrivate davanti alla casa, suonate il videocitofono con in mano i documenti utilizzati nel processo di registrazione e vi comunicheremo direttamente il codice per accedere alla keybox sulla destra del videocitofono.
Al suo interno troverete le chiavi della suite e del cancello automatico per poter accedere all'interno con la macchina.
Non c'è un posto assegnato quindi potete parcheggiare dove trovate posto.
Per quanto riguarda il Wi-Fi, la rete è Suite sul mare Guest e la password: suitesulmare2025
La signora delle pulizie ha lasciato l'appartamento pronto all'uso con frigorifero attaccato e quadro elettrico acceso.
Il Comune di Comacchio ha predisposto i cassonetti della spazzatura che si aprono con una tessera che troverete accanto al piano cottura. Vi consigliamo di usare sacchetti piccoli, altrimenti non entrano nell'indifferenziato.

I nostri numeri per qualsiasi esigenza sono:
+393939011011 Fabio
+393884885053 David
Restiamo a disposizione per qualsiasi informazione o chiarimento.
Un caro saluto e a presto!
Fabio & David`,
      },
      {
        key: 'mid_stay_check',
        name: 'Verifica metà soggiorno',
        description: 'Da inviare a metà soggiorno per verificare che l\'ospite stia bene. Variabili: {{firstName}}.',
        body: `Buongiorno {{firstName}},
volevamo solo assicurarci che tutto stia procedendo per il meglio nell'appartamento e che vi stiate trovando bene.

Se avete qualsiasi necessità, dubbio o c'è qualcosa che non funziona come dovrebbe, non esitate a scriverci o chiamarci — siamo qui per aiutarvi.

Vi auguriamo di continuare a godervi il vostro soggiorno!

Un caro saluto,
Fabio & David
+393939011011 / +393884885053`,
      },
      {
        key: 'check_out_reminder',
        name: 'Promemoria check-out',
        description: 'Da inviare il giorno prima del check-out con istruzioni di uscita. Variabili: {{firstName}}, {{checkOutDate}}.',
        body: `Buongiorno {{firstName}},
vi ricordiamo che il check-out è previsto per domani {{checkOutDate}} entro le ore 10:00.

Per la riconsegna delle chiavi:
1. Riposizionate le chiavi all'interno della smart lock — il codice è 0902.
2. Chiudete il keybox e fate ruotare le rondelline per rimuovere il codice (così resta sicuro per il prossimo ospite).
3. Mi raccomando: parcheggiate la macchina FUORI dai cancelli del condominio PRIMA di riconsegnare le chiavi (una volta consegnate non avrete più modo di aprire il cancello automatico).

Se avete bisogno di un check-out posticipato fatecelo sapere il prima possibile, compatibilmente con il prossimo ospite vediamo cosa possiamo fare.

Grazie per aver scelto Immobiliare Fiumana, ci auguriamo di rivedervi presto!

Un caro saluto,
Fabio & David
+393939011011 / +393884885053`,
      },
    ];

    for (const t of seedTemplates) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO message_templates (template_key, name, description, body) VALUES (?, ?, ?, ?)`,
        args: [t.key, t.name, t.description, t.body],
      });
    }

    // Migration additiva su `guests`: aggiunge codice_fiscale (richiesto solo
    // per ospiti italiani, usato per fatturazione SDI).
    try {
      const cols = await db.execute('PRAGMA table_info(guests)');
      const colNames = new Set(cols.rows.map((r: any) => String(r.name)));
      if (!colNames.has('codice_fiscale')) {
        await db.execute('ALTER TABLE guests ADD COLUMN codice_fiscale TEXT');
      }
    } catch (e) {
      console.error('Migration guests.codice_fiscale failed:', e);
    }

    // Migration additiva su `bookings`: aggiunge city_tax_amount, airbnb_commission e cancelled se mancanti.
    // SQLite/Turso non supporta "ALTER TABLE ADD COLUMN IF NOT EXISTS", quindi ispezioniamo PRAGMA table_info.
    try {
      const cols = await db.execute('PRAGMA table_info(bookings)');
      const colNames = new Set(cols.rows.map((r: any) => String(r.name)));
      if (!colNames.has('city_tax_amount')) {
        await db.execute('ALTER TABLE bookings ADD COLUMN city_tax_amount REAL DEFAULT 0');
      }
      if (!colNames.has('airbnb_commission')) {
        await db.execute('ALTER TABLE bookings ADD COLUMN airbnb_commission REAL DEFAULT 0');
      }
      // Campo per soft-delete delle prenotazioni non più presenti nel CSV Airbnb
      if (!colNames.has('cancelled')) {
        await db.execute('ALTER TABLE bookings ADD COLUMN cancelled INTEGER DEFAULT 0');
      }
      // Riferimento alla fattura passiva Airbnb (commissione) — testo libero
      // così l'admin può incollare il numero fattura/data/PEC ricevuti da Airbnb.
      if (!colNames.has('airbnb_invoice_ref')) {
        await db.execute('ALTER TABLE bookings ADD COLUMN airbnb_invoice_ref TEXT');
      }
      // Prezzo a notte LORDO IVA pagato dall'ospite (in euro). Inserito a mano:
      // il payout netto (total_amount) NON permette di ricavarlo. È la base del
      // calcolo fattura: notti × price_per_night + pulizie, scorporo 10%.
      if (!colNames.has('price_per_night')) {
        await db.execute('ALTER TABLE bookings ADD COLUMN price_per_night REAL DEFAULT 0');
      }
    } catch (e) {
      console.error('Migration bookings columns failed:', e);
    }

    // Create default admin if not exists
    const adminExists = await db.execute('SELECT COUNT(*) as count FROM admin_users');
    if (adminExists.rows[0] && Number(adminExists.rows[0].count) === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin2024!', 10);
      await db.execute({
        sql: 'INSERT INTO admin_users (username, password_hash, nome) VALUES (?, ?, ?)',
        args: ['admin', hash, 'Amministratore'],
      });
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Helper functions to make migration easier.
// Awaitano `ensureDbReady` così la prima query attende che le CREATE TABLE
// IF NOT EXISTS finiscano, evitando "no such table" su cold-start serverless.
export async function dbExecute(sql: string, args: any[] = []) {
  const db = getDb();
  await ensureDbReady();
  return await db.execute({ sql, args });
}

export async function dbQuery(sql: string, args: any[] = []) {
  const db = getDb();
  await ensureDbReady();
  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function dbQueryOne(sql: string, args: any[] = []) {
  const rows = await dbQuery(sql, args);
  return rows[0] || null;
}

export default getDb;
