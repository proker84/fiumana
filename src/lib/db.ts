import { createClient, Client } from '@libsql/client';

let client: Client | null = null;

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

    // Initialize tables (async, but we handle it)
    initializeDb(client);
  }
  return client;
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
        tipo_alloggiato TEXT DEFAULT 'ospite_singolo',
        cognome TEXT NOT NULL,
        nome TEXT NOT NULL,
        sesso TEXT NOT NULL,
        data_nascita DATE NOT NULL,
        comune_nascita TEXT,
        provincia_nascita TEXT,
        stato_nascita TEXT NOT NULL,
        cittadinanza TEXT NOT NULL,
        tipo_documento TEXT NOT NULL,
        numero_documento TEXT NOT NULL,
        luogo_rilascio TEXT NOT NULL,
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
    `);

    // Create indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_bookings_token ON bookings(guest_token)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings(check_in)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_guests_booking ON guests(booking_id)');

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

// Helper functions to make migration easier
export async function dbExecute(sql: string, args: any[] = []) {
  const db = getDb();
  return await db.execute({ sql, args });
}

export async function dbQuery(sql: string, args: any[] = []) {
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function dbQueryOne(sql: string, args: any[] = []) {
  const rows = await dbQuery(sql, args);
  return rows[0] || null;
}

export default getDb;
