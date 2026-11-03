// The on-device database (Dexie / IndexedDB) and settings helpers. Nothing here leaves the device.
// Same pattern as Radar's src/db.ts: versioned schema, a TABLES list for backups, a swappable `db`.
// Adding a version: see docs/DEVELOPING.md ("Adding a database version").

import Dexie, { type Table } from 'dexie';
import { dbName } from './preview';
import { upgradeAttendanceRow } from './logic/checks';
import type { Attendance, Check, DrillUse, Player, Rating, Settings, Stint, Team, TeamEvent, VoiceNote } from './types';

export class CoachDB extends Dexie {
  teams!: Table<Team, string>;
  players!: Table<Player, string>;
  events!: Table<TeamEvent, string>;
  attendance!: Table<Attendance, string>;
  stints!: Table<Stint, string>;
  ratings!: Table<Rating, string>;
  drillUses!: Table<DrillUse, string>;
  checks!: Table<Check, string>;
  voiceNotes!: Table<VoiceNote, string>;
  settings!: Table<Settings, string>;

  constructor(name = dbName()) {
    super(name);
    // v1 (round 1): teams, players, sessions/games, attendance, game-time stints, ratings, drills.
    this.version(1).stores({
      teams: 'id, createdAt',
      players: 'id, teamId',
      events: 'id, teamId, [teamId+date], date',
      attendance: 'id, eventId, teamId, [eventId+playerId]',
      stints: 'id, eventId, teamId, playerId',
      ratings: 'id, eventId, teamId, playerId',
      drillUses: 'id, eventId, teamId, drillId',
      settings: 'key'
    });
    // v2 (round 2): post-session checks and voice notes. Absences get a reason; round 1's
    // 'away' rows become absent with reason 'away'. Nothing is deleted.
    this.version(2)
      .stores({
        checks: 'id, eventId, teamId, playerId, [eventId+playerId]',
        voiceNotes: 'id, eventId, teamId, playerId'
      })
      .upgrade((tx) => tx.table('attendance').toCollection().modify(upgradeAttendanceRow));
  }
}

/** Every table that goes into a backup. */
export const TABLES = [
  'teams',
  'players',
  'events',
  'attendance',
  'stints',
  'ratings',
  'drillUses',
  'checks',
  'voiceNotes',
  'settings'
] as const;

/** Tables that belong to one session (deleted with it). */
export const EVENT_TABLES = ['attendance', 'stints', 'ratings', 'drillUses', 'checks', 'voiceNotes'] as const;

export let db = new CoachDB();

/** Swaps the database (tests use a fresh one each time). */
export function useDatabase(next: CoachDB) {
  db = next;
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

export const DEFAULT_SETTINGS: Settings = { key: 'settings', coachName: '', swipeAnimations: true };

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) };
}

export async function saveSettings(patch: Partial<Omit<Settings, 'key'>>) {
  await db.settings.put({ ...(await getSettings()), ...patch, key: 'settings' });
}
