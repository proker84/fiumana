/**
 * Cifratura simmetrica AES-256-GCM per credenziali sensibili (es. password ACube,
 * webhook secret) salvate sul DB Turso.
 *
 * - Algoritmo: AES-256-GCM (authenticated encryption, integrità + segretezza)
 * - IV: 12 byte casuali per ogni cifratura (raccomandazione NIST per GCM)
 * - Tag: 16 byte di auth tag concatenato
 * - Output: base64 di `iv (12B) || ciphertext || authTag (16B)`
 *
 * La chiave master viene letta da `INVOICE_ENCRYPTION_KEY` (32 byte in base64 o hex).
 * In sviluppo, se assente, viene derivata via PBKDF2 da `JWT_SECRET` con un warning.
 * In produzione l'env var DEVE essere impostata: l'avvio fallisce se manca.
 */

import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32; // 256 bit
const IV_LEN = 12; // 96 bit, raccomandato per GCM
const TAG_LEN = 16; // 128 bit

let cachedKey: Buffer | null = null;

/**
 * Restituisce la chiave master, derivandola se necessario.
 * Cached al primo uso per evitare PBKDF2 ripetuto in dev.
 */
function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey;

  const explicit = process.env.INVOICE_ENCRYPTION_KEY;
  if (explicit) {
    let buf: Buffer;
    if (/^[A-Za-z0-9+/=]+$/.test(explicit) && explicit.length >= 44) {
      buf = Buffer.from(explicit, 'base64');
    } else if (/^[0-9a-fA-F]+$/.test(explicit) && explicit.length === KEY_LEN * 2) {
      buf = Buffer.from(explicit, 'hex');
    } else {
      throw new Error(
        'INVOICE_ENCRYPTION_KEY deve essere 32 byte in base64 (44 char) o hex (64 char). ' +
          'Genera con: openssl rand -base64 32',
      );
    }
    if (buf.length !== KEY_LEN) {
      throw new Error(`INVOICE_ENCRYPTION_KEY deve essere esattamente ${KEY_LEN} byte`);
    }
    cachedKey = buf;
    return cachedKey;
  }

  // Fallback dev: deriviamo da JWT_SECRET con PBKDF2
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'INVOICE_ENCRYPTION_KEY non impostata in produzione. ' +
        'Genera una chiave con `openssl rand -base64 32` e settala in Vercel Env Vars.',
    );
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      'Né INVOICE_ENCRYPTION_KEY né JWT_SECRET sono impostate. Imposta almeno una delle due.',
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[fatturapa/crypto] INVOICE_ENCRYPTION_KEY non impostata. Derivo chiave da JWT_SECRET ' +
      'con PBKDF2 (solo dev). In produzione setta la variabile esplicitamente.',
  );
  cachedKey = pbkdf2Sync(
    jwtSecret,
    'fiumana-invoice-encryption-salt-v1',
    100_000,
    KEY_LEN,
    'sha256',
  );
  return cachedKey;
}

/**
 * Cifra una stringa UTF-8.
 * Output: base64 di `iv || ciphertext || authTag`.
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt richiede una stringa');
  }
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString('base64');
}

/**
 * Decifra una stringa precedentemente prodotta da `encrypt`.
 * Lancia se il payload è corrotto o l'auth tag non combacia.
 */
export function decrypt(payloadBase64: string): string {
  if (typeof payloadBase64 !== 'string' || !payloadBase64) {
    throw new TypeError('decrypt richiede una stringa base64 non vuota');
  }
  const buf = Buffer.from(payloadBase64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Payload cifrato troppo corto o malformato');
  }
  const key = getMasterKey();
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Confronto a tempo costante per token/secret.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Maschera una stringa segreta per l'esposizione UI (es. "sk_•••••••cd92").
 * Mostra solo gli ultimi 4 caratteri se ce ne sono almeno 8, altrimenti tutto offuscato.
 */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return '';
  if (secret.length < 8) return '•'.repeat(secret.length);
  return '•'.repeat(secret.length - 4) + secret.slice(-4);
}

/**
 * Genera una nuova chiave master a 32 byte come stringa base64.
 * Da usare una sola volta in fase di deploy iniziale.
 */
export function generateMasterKey(): string {
  return randomBytes(KEY_LEN).toString('base64');
}

/**
 * Genera un secret per webhook (32 byte random base64-url).
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('base64url');
}
