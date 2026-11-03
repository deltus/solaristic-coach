// Backup, restore and "delete everything". Backups are always encrypted with the coach's
// passphrase (src/logic/backupCrypto.ts). Adapted from Radar's src/services/backup.ts.

import { db, TABLES } from '../db';
import { decryptBackup, encryptBackup, type EncryptedBackup } from '../logic/backupCrypto';

export const BACKUP_INNER = 'solaristic-coach-data';

export interface BackupData {
  format: typeof BACKUP_INNER;
  version: 1;
  tables: Record<string, unknown[]>;
}

export async function collectData(): Promise<BackupData> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  return { format: BACKUP_INNER, version: 1, tables };
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
        const rows = d.tables[t] ?? [];
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
