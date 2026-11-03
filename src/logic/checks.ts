// The roll and the post-session check, kept apart from the screens so they can be tested:
// roll choices ↔ stored attendance, the round-1 → v2 attendance upgrade, how a swipe or a
// "Log now" combines with what's already there, and the end-of-check summary.

import { ROLL_CHOICES, type RollChoice } from '../config/coaching';
import { chipById } from '../config/checks';
import type { AbsentReason, Attendance, Check, CheckVerdict } from '../types';

/** Here or late counts as at the session. */
export const isPresent = (a: Pick<Attendance, 'status'>) => a.status !== 'absent';

/** The roll button that matches a stored attendance row. */
export function rollChoiceOf(a: Pick<Attendance, 'status' | 'reason'>): RollChoice {
  if (a.status === 'absent') return a.reason ?? 'away';
  return a.status;
}

/** What to store for a roll button. */
export function attendanceFor(choice: RollChoice): Pick<Attendance, 'status' | 'reason'> {
  const c = ROLL_CHOICES.find((x) => x.id === choice)!;
  if ('reason' in c) return { status: 'absent', reason: c.reason as AbsentReason };
  return { status: c.id as 'here' | 'late', reason: undefined };
}

export const rollLabel = (a: Pick<Attendance, 'status' | 'reason'>) => ROLL_CHOICES.find((x) => x.id === rollChoiceOf(a))!.label;

/** Database v2 upgrade (and old backups): round 1's 'away' becomes absent with reason 'away'. */
export function upgradeAttendanceRow(row: { status: string; reason?: string }) {
  if (row.status === 'away') {
    row.status = 'absent';
    row.reason = 'away';
  }
}

export interface CheckInput {
  verdict: CheckVerdict;
  chips?: string[];
  conflictWith?: string[];
  logged?: boolean;
}

/**
 * Combines a new swipe or note with what's already saved for that player. A quick swipe never
 * wipes chips logged during the session: "all good" on a player with chips keeps them as a note,
 * and a star keeps them too. Ticking chips (verdict 'note') replaces the chip list.
 */
export function combineCheck(existing: Pick<Check, 'verdict' | 'chips' | 'conflictWith' | 'logged'> | undefined, input: CheckInput) {
  const chips = input.chips ?? existing?.chips ?? [];
  let conflictWith = input.conflictWith ?? existing?.conflictWith;
  if (!chips.includes('conflict')) conflictWith = undefined;
  let verdict = input.verdict;
  if (verdict === 'good' && chips.length) verdict = 'note';
  if (verdict === 'note' && !chips.length) verdict = 'good';
  return {
    verdict,
    chips,
    conflictWith: conflictWith?.length ? conflictWith : undefined,
    logged: input.logged || existing?.logged || undefined
  };
}

/** Adds chips logged during a session to what's there (never removes any). */
export function addLogged(
  existing: Pick<Check, 'verdict' | 'chips' | 'conflictWith'> | undefined,
  chips: string[],
  conflictWith: string[] = []
) {
  const all = [...new Set([...(existing?.chips ?? []), ...chips])];
  const others = [...new Set([...(existing?.conflictWith ?? []), ...conflictWith])];
  return combineCheck(existing, {
    verdict: existing?.verdict === 'star' ? 'star' : 'note',
    chips: all,
    conflictWith: others,
    logged: true
  });
}

export const needsSafetyPrompt = (chips: string[]) => chips.some((c) => chipById(c)?.safety);

export interface CheckSummary {
  good: number;
  star: number;
  note: number;
  /** Player ids with a safety chip (knock, upset). */
  safety: string[];
}

export function summariseChecks(checks: Check[]): CheckSummary {
  const s: CheckSummary = { good: 0, star: 0, note: 0, safety: [] };
  for (const c of checks) {
    s[c.verdict]++;
    if (needsSafetyPrompt(c.chips)) s.safety.push(c.playerId);
  }
  return s;
}
