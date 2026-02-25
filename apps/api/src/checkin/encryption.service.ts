import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  private getEncryptionKey(): Buffer {
    const key = process.env.CHECKIN_ENCRYPTION_KEY;

    if (!key) {
      throw new Error('CHECKIN_ENCRYPTION_KEY environment variable not set');
    }

    // If key is base64 encoded
    if (key.length === 44) {
      return Buffer.from(key, 'base64');
    }

    // If key is hex encoded
    if (key.length === 64) {
      return Buffer.from(key, 'hex');
    }

    // Otherwise, derive key from passphrase using PBKDF2
    const salt = process.env.CHECKIN_ENCRYPTION_SALT || 'fiumana_immobiliare_salt';
    return crypto.pbkdf2Sync(key, salt, 100000, this.keyLength, 'sha256');
  }

  encrypt(data: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      // Combine IV + AuthTag + Encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'base64'),
      ]);

      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, AuthTag, and encrypted data
      const iv = combined.subarray(0, this.ivLength);
      const authTag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  encryptObject<T extends object>(data: T): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString);
  }

  decryptObject<T extends object>(encryptedData: string): T {
    const jsonString = this.decrypt(encryptedData);
    return JSON.parse(jsonString) as T;
  }

  // Generate a new encryption key (for setup)
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  // Hash sensitive data for logging/indexing (one-way)
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
