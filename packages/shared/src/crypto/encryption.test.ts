/**
 * Unit tests for the envelope encryption utility (ADR-011).
 */

import {
  encrypt,
  decrypt,
  serialize,
  deserialize,
  encryptToken,
  decryptToken,
} from './encryption.js';

const TEST_KEY = Buffer.alloc(32, 0xab).toString('base64');

describe('encryption', () => {
  beforeEach(() => {
    process.env['TOKEN_ENCRYPTION_KEY'] = TEST_KEY;
  });

  afterEach(() => {
    delete process.env['TOKEN_ENCRYPTION_KEY'];
  });

  // ── encrypt / decrypt ──────────────────────────────────────────────────────

  it('roundtrip: encrypt then decrypt returns the original plaintext', () => {
    const plaintext = 'strava-access-token-abc123';
    const payload = encrypt(plaintext);
    expect(decrypt(payload)).toBe(plaintext);
  });

  it('produces different ciphertext on each call (fresh IV + DEK)', () => {
    const plaintext = 'same-secret';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.encryptedDek).not.toBe(b.encryptedDek);
  });

  it('encrypted payload has all required fields', () => {
    const payload = encrypt('test');
    const fields: Array<keyof typeof payload> = [
      'ciphertext', 'iv', 'authTag', 'encryptedDek', 'dekIv', 'dekAuthTag',
    ];
    for (const field of fields) {
      expect(typeof payload[field]).toBe('string');
      expect(payload[field].length).toBeGreaterThan(0);
    }
  });

  // ── serialize / deserialize ────────────────────────────────────────────────

  it('serialize produces a colon-delimited v1 string', () => {
    const payload = encrypt('hello');
    const stored = serialize(payload);
    expect(stored.startsWith('v1:')).toBe(true);
    expect(stored.split(':').length).toBe(7);
  });

  it('deserialize is the inverse of serialize', () => {
    const payload = encrypt('hello');
    const restored = deserialize(serialize(payload));
    expect(restored).toEqual(payload);
  });

  it('deserialize throws on malformed input', () => {
    expect(() => deserialize('garbage')).toThrow('Invalid encrypted payload format');
    expect(() => deserialize('v2:a:b:c:d:e:f')).toThrow('Invalid encrypted payload format');
  });

  // ── encryptToken / decryptToken ────────────────────────────────────────────

  it('encryptToken + decryptToken roundtrip', () => {
    const token = 'refresh-token-xyz';
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it('encryptToken result can be stored and recovered after serialize roundtrip', () => {
    const token = 'another-token';
    const stored = encryptToken(token);
    expect(typeof stored).toBe('string');
    expect(decryptToken(stored)).toBe(token);
  });

  // ── error handling ─────────────────────────────────────────────────────────

  it('throws when TOKEN_ENCRYPTION_KEY is missing', () => {
    delete process.env['TOKEN_ENCRYPTION_KEY'];
    expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY env var is not set');
  });

  it('throws when TOKEN_ENCRYPTION_KEY has wrong length', () => {
    process.env['TOKEN_ENCRYPTION_KEY'] = Buffer.alloc(16, 0xff).toString('base64');
    expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value');
  });

  it('decrypt throws when ciphertext is tampered (auth tag mismatch)', () => {
    const payload = encrypt('secret');
    const tampered = { ...payload, ciphertext: 'deadbeef'.repeat(4) };
    expect(() => decrypt(tampered)).toThrow();
  });

  it('decrypt throws when auth tag is tampered', () => {
    const payload = encrypt('secret');
    const tampered = { ...payload, authTag: 'ff'.repeat(16) };
    expect(() => decrypt(tampered)).toThrow();
  });
});
