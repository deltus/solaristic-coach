// Fair game time: the game clock, minutes and positions played, and live "sub on next" suggestions.
// Pure functions (no database), so the maths is tested on its own (tests/gameTime.test.ts).
// Time on the field is measured on the game clock, not the wall clock, so breaks never count.

import { SUB_GAP_MINUTES } from '../config/coaching';
import type { Clock, Stint } from '../types';

export const newClock = (): Clock => ({ period: 0, done: [], elapsed: 0, runningSince: null, finished: false });

/** ms played in the current period. */
export const periodElapsed = (c: Clock, now: number): number =>
  c.elapsed + (c.runningSince !== null ? Math.max(0, now - c.runningSince) : 0);

/** Game-clock ms since kick-off (all finished periods plus the current one). */
export const gameMs = (c: Clock, now: number): number => c.done.reduce((a, b) => a + b, 0) + (c.finished ? 0 : periodElapsed(c, now));

export const startClock = (c: Clock, now: number): Clock => (c.finished || c.runningSince !== null ? c : { ...c, runningSince: now });

export const pauseClock = (c: Clock, now: number): Clock =>
  c.runningSince === null ? c : { ...c, elapsed: periodElapsed(c, now), runningSince: null };

/** Ends the current period. After the last one the game is finished. */
export function endPeriod(c: Clock, now: number, periods: number): Clock {
  const done = [...c.done, periodElapsed(c, now)];
  return { period: c.period + 1, done, elapsed: 0, runningSince: null, finished: done.length >= periods };
}

/** Length of a stint, using `now` (game ms) for one that is still open. */
export const stintMs = (s: Stint, now: number): number => Math.max(0, (s.end ?? now) - s.start);

/** Total ms on the field per player. */
export function minutesByPlayer(stints: Stint[], now: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of stints) out.set(s.playerId, (out.get(s.playerId) ?? 0) + stintMs(s, now));
  return out;
}

/** ms per position id (or per role, via `roleOf`) for each player. */
export function positionsByPlayer(stints: Stint[], now: number, roleOf: (positionId: string) => string = (x) => x) {
  const out = new Map<string, Map<string, number>>();
  for (const s of stints) {
    const m = out.get(s.playerId) ?? new Map<string, number>();
    const k = roleOf(s.positionId);
    m.set(k, (m.get(k) ?? 0) + stintMs(s, now));
    out.set(s.playerId, m);
  }
  return out;
}

/** Who is on the field right now: position id → player id (from the open stints). */
export function onFieldNow(stints: Stint[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of stints) if (s.end === undefined) out.set(s.positionId, s.playerId);
  return out;
}

/**
 * A sub: closes the outgoing player's stint and opens one for the incoming player in the same
 * position. Returns the stints to save (changed and new). `newId` makes ids (injected for tests).
 */
export function substitute(
  stints: Stint[],
  args: { positionId: string; playerIn: string | null; at: number; period: number; eventId: string; teamId: string },
  newId: () => string
): Stint[] {
  const changed: Stint[] = [];
  for (const s of stints) {
    if (s.end !== undefined) continue;
    // The position's current player comes off, and the incoming player leaves any other position.
    if (s.positionId === args.positionId || s.playerId === args.playerIn) changed.push({ ...s, end: Math.max(s.start, args.at) });
  }
  if (args.playerIn)
    changed.push({
      id: newId(),
      eventId: args.eventId,
      teamId: args.teamId,
      playerId: args.playerIn,
      positionId: args.positionId,
      period: args.period,
      start: args.at
    });
  return changed;
}

/** Swaps two on-field players' positions (both keep playing). */
export function swapPositions(
  stints: Stint[],
  args: { a: string; b: string; at: number; period: number; eventId: string; teamId: string },
  newId: () => string
): Stint[] {
  const open = stints.filter((s) => s.end === undefined);
  const sa = open.find((s) => s.positionId === args.a);
  const sb = open.find((s) => s.positionId === args.b);
  if (!sa || !sb) return [];
  const mk = (playerId: string, positionId: string): Stint => ({
    id: newId(),
    eventId: args.eventId,
    teamId: args.teamId,
    playerId,
    positionId,
    period: args.period,
    start: args.at
  });
  return [{ ...sa, end: args.at }, { ...sb, end: args.at }, mk(sa.playerId, args.b), mk(sb.playerId, args.a)];
}

/** Closes every open stint (at the end of the game). */
export const closeAll = (stints: Stint[], at: number): Stint[] =>
  stints.filter((s) => s.end === undefined).map((s) => ({ ...s, end: Math.max(s.start, at) }));

export interface SubSuggestion {
  /** Bench player to bring on. */
  on: string;
  /** On-field player to take off, and their position. */
  off: string;
  positionId: string;
  /** Minutes the incoming player trails by. */
  gapMs: number;
}

/**
 * Live suggestions: the bench player with the fewest minutes this game (season minutes break ties)
 * for the on-field player with the most, but only once the gap is big enough to be worth a sub.
 */
export function suggestSubs(args: {
  stints: Stint[];
  now: number;
  available: string[];
  season?: Map<string, number>;
  gapMs?: number;
  limit?: number;
}): SubSuggestion[] {
  const { stints, now, available } = args;
  const gap = args.gapMs ?? SUB_GAP_MINUTES * 60000;
  const mins = minutesByPlayer(stints, now);
  const field = onFieldNow(stints);
  const onIds = new Set(field.values());
  // This game's minutes first; season minutes only break ties.
  const cmp = (a: string, b: string) => (mins.get(a) ?? 0) - (mins.get(b) ?? 0) || (args.season?.get(a) ?? 0) - (args.season?.get(b) ?? 0);
  const bench = available.filter((id) => !onIds.has(id)).sort(cmp);
  const playing = [...field.entries()].sort((a, b) => cmp(b[1], a[1]));
  const out: SubSuggestion[] = [];
  for (let i = 0; i < Math.min(bench.length, playing.length, args.limit ?? 3); i++) {
    const [positionId, off] = playing[i];
    const d = (mins.get(off) ?? 0) - (mins.get(bench[i]) ?? 0);
    if (d < gap) break;
    out.push({ on: bench[i], off, positionId, gapMs: d });
  }
  return out;
}

/** Each available player's fair share of the game so far: game time × players on field ÷ players available. */
export const fairShareMs = (elapsed: number, onField: number, available: number): number =>
  available ? (elapsed * Math.min(onField, available)) / available : 0;

/** Total player-ms on the field; equals game ms × players on field when every spot was always filled. */
export const totalPlayerMs = (stints: Stint[], now: number): number => stints.reduce((a, s) => a + stintMs(s, now), 0);
