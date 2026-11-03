// The data model. Everything is stored on the coach's device (Dexie, src/db.ts).
// Players are mostly children: only a first name, last initial, jersey number and preferred
// positions are kept. No birth dates, photos, addresses or phone numbers.

import type { SportOverrides } from '../config/sports';

/**
 * A team for one season. `kind` is always 'team' in round 1; PE teacher mode will add 'class'
 * (same shape, with classes instead of teams) without a new table.
 */
export interface Team {
  id: string;
  kind: 'team';
  name: string;
  sportId: string;
  /** The team's own numbers (players on field, periods, minutes); for custom sports, all of them. */
  overrides: SportOverrides;
  season: string;
  ageGroup: string;
  createdAt: number;
  archived?: boolean;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastInitial: string;
  jersey?: number;
  /** Preferred position ids from the sport template. */
  positions: string[];
  active: boolean;
  createdAt: number;
}

export type EventKind = 'training' | 'game';
export type GameType = 'friendly' | 'competition';

/** The game clock. Game time only moves while running, so breaks don't count as minutes played. */
export interface Clock {
  /** 0-based period (quarter, half…). */
  period: number;
  /** Lengths in ms of the periods already finished. */
  done: number[];
  /** ms played in the current period before the clock was last started. */
  elapsed: number;
  /** Wall-clock time (ms) the clock was last started, or null when paused. */
  runningSince: number | null;
  finished: boolean;
}

/** A training session or a game. Opened, then closed when it's done (like Radar's lessons). */
export interface TeamEvent {
  id: string;
  teamId: string;
  kind: EventKind;
  /** Local date, YYYY-MM-DD. */
  date: string;
  openedAt: number;
  closedAt?: number;
  /** Games only. */
  opponent?: string;
  venue?: 'home' | 'away';
  gameType?: GameType;
  scoreFor?: number;
  scoreAgainst?: number;
  clock?: Clock;
  /** Starting line-up planned for a game: position id → player id. */
  lineup?: Record<string, string>;
  /** Training only: drills planned or used. */
  drillIds?: string[];
  /** Training only: the skill this session focuses on (an id from the sport's skill list). */
  focus?: string;
}

/** Round 1 stored 'away'; database v2 turns that into 'absent' with reason 'away'. */
export type AttendanceStatus = 'here' | 'late' | 'absent';
export type AbsentReason = 'sick' | 'injured' | 'away' | 'noshow';

export interface Attendance {
  id: string;
  eventId: string;
  teamId: string;
  playerId: string;
  status: AttendanceStatus;
  /** Only when absent. */
  reason?: AbsentReason;
}

/** One spell on the field in one position. Times are game-clock ms from kick-off. */
export interface Stint {
  id: string;
  eventId: string;
  teamId: string;
  playerId: string;
  positionId: string;
  period: number;
  start: number;
  /** Open while the player is still on. */
  end?: number;
}

export type RatingValue = 1 | -1;

/**
 * Round 1's quick ratings (great / needs work per area). Kept so old data still counts, but new
 * sessions use Check instead. Coach only.
 */
export interface Rating {
  id: string;
  eventId: string;
  teamId: string;
  playerId: string;
  /** Area id → 1 (great) or -1 (needs work). Skipped areas are left out. */
  scores: Record<string, RatingValue>;
  note?: string;
  at: number;
}

export type CheckVerdict = 'good' | 'star' | 'note';

/**
 * The post-session check for one player at one session: all good, star of the session, or
 * something to note (chips from src/config/checks.ts). "Log now" during a session adds chips
 * here too. Coach only: never shown to players or parents, never in shared exports.
 */
export interface Check {
  id: string;
  eventId: string;
  teamId: string;
  playerId: string;
  verdict: CheckVerdict;
  /** Chip ids from src/config/checks.ts. */
  chips: string[];
  /** For the "conflict with" chip: the other player(s). */
  conflictWith?: string[];
  /** True when something was logged during the session with "Log now". */
  logged?: boolean;
  at: number;
}

/** A short voice note about one player at one session. Stays on the device. Coach only. */
export interface VoiceNote {
  id: string;
  eventId: string;
  teamId: string;
  playerId: string;
  /** The recording itself (ArrayBuffer so backups and tests can copy it). */
  data: ArrayBuffer;
  mime: string;
  ms: number;
  at: number;
}

/** A drill used at a training, with the coach's verdict (like Radar's brain break track record). */
export interface DrillUse {
  id: string;
  eventId: string;
  teamId: string;
  drillId: string;
  result?: 'worked' | 'didnt';
  at: number;
}

export interface Settings {
  key: 'settings';
  coachName: string;
  swipeAnimations: boolean;
  lastTeamId?: string;
}
