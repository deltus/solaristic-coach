// Backup files are encrypted with a passphrase the coach chooses: PBKDF2 (SHA-256) turns the
// passphrase into an AES-GCM key. Without the passphrase the file can't be read, so a lost phone's
// backup in someone's Downloads folder doesn't expose children's data. Adapted from Radar's
// src/sync/crypto.ts (same AES-GCM layout: 12-byte IV, then the ciphertext).

export const BACKUP_FORMAT = 'solaristic-coach-backup';
export const KDF_ITERATIONS = 310_000;
export const MIN_PASSPHRASE = 8;

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export interface EncryptedBackup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  encrypted: true;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  /** base64 of IV (12 bytes) + AES-GCM ciphertext of the JSON backup. */
  data: string;
  exportedAt: string;
}

async function keyFrom(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackup(value: unknown, passphrase: string, iterations = KDF_ITERATIONS): Promise<EncryptedBackup> {
  if (passphrase.length < MIN_PASSPHRASE) throw new Error(`Use a passphrase of at least ${MIN_PASSPHRASE} characters.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(passphrase, salt, iterations);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return {
    format: BACKUP_FORMAT,
    version: 1,
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: b64(salt) },
    data: b64(out),
    exportedAt: new Date().toISOString()
  };
}

export function isEncryptedBackup(x: unknown): x is EncryptedBackup {
  const d = x as Partial<EncryptedBackup> | null;
  return !!d && d.format === BACKUP_FORMAT && d.encrypted === true && typeof d.data === 'string' && !!d.kdf?.salt;
}

/** Throws "Wrong passphrase…" if the passphrase doesn't open the file. */
export async function decryptBackup<T = unknown>(file: unknown, passphrase: string): Promise<T> {
  if (!isEncryptedBackup(file)) throw new Error('This file is not a Solaristic Coach backup.');
  const key = await keyFrom(passphrase, unb64(file.kdf.salt), file.kdf.iterations);
  const bytes = unb64(file.data);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    throw new Error('Wrong passphrase, or the file is damaged.');
  }
}
