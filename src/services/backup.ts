// Backup, restore and "delete everything". Backups are always encrypted with the coach's
// passphrase (src/logic/backupCrypto.ts). Adapted from Radar's src/services/backup.ts.

import { db, TABLES } from '../db';
import { decryptBackup, encryptBackup, type EncryptedBackup } from '../logic/backupCrypto';
import { upgradeAttendanceRow } from '../logic/checks';

export const BACKUP_INNER = 'solaristic-coach-data';

/** 1 = round 1; 2 = round 2 (checks, voice notes as base64, absence reasons). Both restore. */
export interface BackupData {
  format: typeof BACKUP_INNER;
  version: 1 | 2;
  tables: Record<string, unknown[]>;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

export async function collectData(): Promise<BackupData> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  // Voice recordings go into the (encrypted) file as text.
  tables.voiceNotes = (tables.voiceNotes as { data: ArrayBuffer }[]).map((v) => ({ ...v, data: toBase64(v.data) }));
  return { format: BACKUP_INNER, version: 2, tables };
}

/** Brings rows from an older backup up to date before they go back in. */
function upgradeRows(table: string, rows: unknown[]): unknown[] {
  if (table === 'attendance') for (const r of rows as { status: string }[]) upgradeAttendanceRow(r);
  if (table === 'voiceNotes')
    return (rows as { data: unknown }[]).map((v) => ({ ...v, data: typeof v.data === 'string' ? fromBase64(v.data) : v.data }));
  return rows;
}

export async function createBackup(passphrase: string, iterations?: number): Promise<EncryptedBackup> {
  return encryptBackup(await collectData(), passphrase, iterations);
}

/** Replaces everything on this device with the backup. Checks the whole file before changing anything. */
export async function restoreBackup(file: unknown, passphrase: string) {
  const d = await decryptBackup<BackupData>(file, passphrase);
  if (!d || d.format !== BACKUP_INNER || !d.tables) throw new Error('This file is not a Solaristic Coach backup.');
  for (const t of TABLES) if (d.tables[t] !== undefined && !Array.isArray(d.tables[t])) throw new Error(`Backup table "${t}" is invalid.`);
  await db.transaction(
    'rw',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLES) {
        await db.table(t).clear();
        const rows = upgradeRows(t, d.tables[t] ?? []);
        if (rows.length) await db.table(t).bulkAdd(rows);
      }
    }
  );
}

export async function deleteAllData() {
  await db.transaction(
    'rw',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLES) await db.table(t).clear();
    }
  );
}

export function backupFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `solaristic-coach-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.coachbackup`;
}
