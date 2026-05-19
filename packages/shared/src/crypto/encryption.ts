/**
 * AES-256-GCM envelope encryption (ADR-011).
 *
 * Architecture:
 *   - Master KEK (Key Encryption Key) lives in TOKEN_ENCRYPTION_KEY env var
 *   - Each user gets a random 256-bit DEK (Data Encryption Key) on first use
 *   - Tokens are encrypted with the DEK; the DEK is encrypted ("wrapped") with the KEK
 *   - Storage: { ciphertext, iv, authTag, encryptedDek, dekIv, dekAuthTag } — all hex-encoded
 *
 * Migration path to Cloud KMS:
 *   Replace wrapDek / unwrapDek with KMS.encrypt / KMS.decrypt while keeping the
 *   DEK-level encryption unchanged.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm' as const;
const KEY_BYTES = 32; // 256 bits
const IV_BYTES = 12; // 96-bit IV is recommended for GCM
const AUTH_TAG_BYTES = 16;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  /** AES-256-GCM ciphertext (hex) */
  ciphertext: string;
  /** 96-bit IV used for token encryption (hex) */
  iv: string;
  /** GCM auth tag for token ciphertext (hex) */
  authTag: string;
  /** DEK encrypted with the master KEK (hex) */
  encryptedDek: string;
  /** 96-bit IV used for DEK encryption (hex) */
  dekIv: string;
  /** GCM auth tag for encrypted DEK (hex) */
  dekAuthTag: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getMasterKey(): Buffer {
  const raw = process.env['TOKEN_ENCRYPTION_KEY'];
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY env var is not set');

  const buf = Buffer.from(raw, 'base64');
  if (buf.byteLength !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value (got ${buf.byteLength} bytes). ` +
        'Generate with: openssl rand -base64 32',
    );
  }
  return buf;
}

function aesGcmEncrypt(key: Buffer, plaintext: Buffer): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

function aesGcmDecrypt(
  key: Buffer,
  ciphertext: Buffer,
  iv: Buffer,
  authTag: Buffer,
): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using envelope encryption.
 *
 * A fresh DEK is generated on every call.  Call `encryptWithDek` if you want
 * to reuse an existing DEK for the same user record.
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const kek = getMasterKey();
  const dek = randomBytes(KEY_BYTES);

  // Encrypt token with DEK
  const {
    ciphertext,
    iv,
    authTag,
  } = aesGcmEncrypt(dek, Buffer.from(plaintext, 'utf8'));

  // Wrap DEK with KEK
  const {
    ciphertext: encryptedDekBuf,
    iv: dekIvBuf,
    authTag: dekAuthTagBuf,
  } = aesGcmEncrypt(kek, dek);

  return {
    ciphertext: ciphertext.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encryptedDek: encryptedDekBuf.toString('hex'),
    dekIv: dekIvBuf.toString('hex'),
    dekAuthTag: dekAuthTagBuf.toString('hex'),
  };
}

/**
 * Serialises an EncryptedPayload to a single compact string for DB storage.
 * Format: `v1:<ciphertext>:<iv>:<authTag>:<encryptedDek>:<dekIv>:<dekAuthTag>`
 */
export function serialize(payload: EncryptedPayload): string {
  return [
    'v1',
    payload.ciphertext,
    payload.iv,
    payload.authTag,
    payload.encryptedDek,
    payload.dekIv,
    payload.dekAuthTag,
  ].join(':');
}

/**
 * Parses a serialised encrypted payload back to an EncryptedPayload.
 */
export function deserialize(stored: string): EncryptedPayload {
  const parts = stored.split(':');
  if (parts.length !== 7 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted payload format');
  }
  const [, ciphertext, iv, authTag, encryptedDek, dekIv, dekAuthTag] = parts as [
    string, string, string, string, string, string, string,
  ];
  return { ciphertext, iv, authTag, encryptedDek, dekIv, dekAuthTag };
}

/**
 * Decrypts a stored encrypted payload.
 */
export function decrypt(payload: EncryptedPayload): string {
  const kek = getMasterKey();

  // Unwrap DEK
  const dek = aesGcmDecrypt(
    kek,
    Buffer.from(payload.encryptedDek, 'hex'),
    Buffer.from(payload.dekIv, 'hex'),
    Buffer.from(payload.dekAuthTag, 'hex'),
  );

  // Decrypt token
  const plaintext = aesGcmDecrypt(
    dek,
    Buffer.from(payload.ciphertext, 'hex'),
    Buffer.from(payload.iv, 'hex'),
    Buffer.from(payload.authTag, 'hex'),
  );

  return plaintext.toString('utf8');
}

/**
 * Convenience: encrypt + serialize in one call.
 */
export function encryptToken(plaintext: string): string {
  return serialize(encrypt(plaintext));
}

/**
 * Convenience: deserialize + decrypt in one call.
 */
export function decryptToken(stored: string): string {
  return decrypt(deserialize(stored));
}

// Re-export types that consumers may need
export type { EncryptedPayload as TokenEncryptedPayload };
export { AUTH_TAG_BYTES, IV_BYTES, KEY_BYTES };
