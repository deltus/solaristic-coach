// Line-ups and the "Fair rotation" button. Adapted from Radar's seating planner idea (fill spots
// by a score, then improve by swapping pairs), but the score is fairness across the season:
// players who sat out most start, and each player is steered towards the kinds of positions
// (roles) they have played least. Preferred positions are a gentle nudge, never a rule.

import type { Position } from '../config/sports';

export interface PlayerHistory {
  /** Season ms on the field. */
  totalMs: number;
  /** Season ms per role. */
  byRole: Map<string, number>;
}

export interface RotationPlayer {
  id: string;
  preferred: string[];
}

/** Who sits out each period: rotate through the squad, those with the most season minutes first. */
export function benchPlan(players: string[], onField: number, periods: number, seasonMs: Map<string, number>): string[][] {
  const k = Math.max(0, players.length - onField);
  const order = [...players].sort((a, b) => (seasonMs.get(b) ?? 0) - (seasonMs.get(a) ?? 0) || a.localeCompare(b));
  const plan: string[][] = [];
  let next = 0;
  for (let p = 0; p < periods; p++) {
    const sit: string[] = [];
    for (let i = 0; i < k; i++) sit.push(order[(next + i) % order.length]);
    next = (next + k) % Math.max(1, order.length);
    plan.push(sit);
  }
  return plan;
}

/** Lower is better: playing a role you've rarely played, or a spot you like. */
export function slotCost(player: RotationPlayer, slot: Position, history?: PlayerHistory): number {
  const total = history?.totalMs ?? 0;
  const share = total > 0 ? (history!.byRole.get(slot.role) ?? 0) / total : 0;
  const likes = player.preferred.includes(slot.id) ? 0.35 : 0;
  return share - likes;
}

/**
 * Assigns players to slots with low total cost: a greedy pass, then pairwise swaps until no swap
 * helps. Small squads (≤ 20) make this fast and close to the best possible.
 */
export function assign(
  players: RotationPlayer[],
  slots: Position[],
  cost: (p: RotationPlayer, s: Position) => number
): Record<string, string> {
  const n = Math.min(players.length, slots.length);
  const pick: (RotationPlayer | null)[] = slots.map(() => null);
  const left = [...players];
  // Greedy: fill the slot whose best option is cheapest, one at a time.
  for (let filled = 0; filled < n; filled++) {
    let best = { s: -1, p: -1, c: Infinity };
    slots.forEach((slot, s) => {
      if (pick[s]) return;
      left.forEach((pl, p) => {
        const c = cost(pl, slot);
        if (c < best.c) best = { s, p, c };
      });
    });
    pick[best.s] = left[best.p];
    left.splice(best.p, 1);
  }
  const c = (i: number) => (pick[i] ? cost(pick[i]!, slots[i]) : 0);
  for (let pass = 0, improved = true; improved && pass < 50; pass++) {
    improved = false;
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++) {
        if (!pick[i] || !pick[j]) continue;
        const now = c(i) + c(j);
        const swapped = cost(pick[j]!, slots[i]) + cost(pick[i]!, slots[j]);
        if (swapped < now - 1e-9) {
          [pick[i], pick[j]] = [pick[j], pick[i]];
          improved = true;
        }
      }
  }
  const out: Record<string, string> = {};
  slots.forEach((s, i) => pick[i] && (out[s.id] = pick[i]!.id));
  return out;
}

/**
 * The "Fair rotation" button: who starts (those who sat most), and where each starter plays.
 * `jitter` (0 = none) lets a reshuffle give a different but still fair answer.
 */
export function fairRotation(args: {
  players: RotationPlayer[];
  slots: Position[];
  history: Map<string, PlayerHistory>;
  rnd?: () => number;
  jitter?: number;
}): Record<string, string> {
  const { players, slots, history } = args;
  const rnd = args.rnd ?? Math.random;
  const jitter = args.jitter ?? 0;
  const season = new Map(players.map((p) => [p.id, history.get(p.id)?.totalMs ?? 0]));
  const sitting = new Set(
    benchPlan(
      players.map((p) => p.id),
      slots.length,
      1,
      season
    )[0]
  );
  const starters = players.filter((p) => !sitting.has(p.id));
  const noise = new Map<string, number>();
  const cost = (p: RotationPlayer, s: Position) => {
    const key = `${p.id}|${s.id}`;
    if (!noise.has(key)) noise.set(key, jitter ? rnd() * jitter : 0);
    return slotCost(p, s, history.get(p.id)) + noise.get(key)!;
  };
  return assign(starters, slots, cost);
}

/** Moves a player into a slot on a line-up, swapping with whoever was there (drag and drop / tap). */
export function placeInLineup(lineup: Record<string, string>, slotId: string, playerId: string): Record<string, string> {
  const next = { ...lineup };
  const from = Object.keys(next).find((k) => next[k] === playerId);
  const there = next[slotId];
  if (from) delete next[from];
  if (from && there) next[from] = there;
  next[slotId] = playerId;
  return next;
}

export function removeFromLineup(lineup: Record<string, string>, playerId: string): Record<string, string> {
  return Object.fromEntries(Object.entries(lineup).filter(([, v]) => v !== playerId));
}
