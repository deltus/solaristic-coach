// Team builder for scrims and training games: split the squad into 2–4 balanced teams.
// Simple maths on the device (no AI): a snake draft by strength, then swaps that even out total
// strength and the mix of preferred roles. "Shuffle" reseeds the order of equal players and adds
// a little noise, so each tap gives a different but still balanced split.

import { RATING_WINDOW } from '../config/coaching';
import type { Rating } from '../types';
import { shuffle } from './random';

export interface BuilderPlayer {
  id: string;
  /** -1 (needs work) … 1 (great). 0 when there are no ratings yet. */
  strength: number;
  /** Main role from the first preferred position, or 'any'. */
  role: string;
}

/** Average of the latest ratings (all areas), newest RATING_WINDOW only. */
export function strengthFrom(ratings: Rating[], window = RATING_WINDOW): number {
  const recent = [...ratings].sort((a, b) => b.at - a.at).slice(0, window);
  const vals = recent.flatMap((r) => Object.values(r.scores));
  return vals.length ? vals.reduce((a: number, b) => a + b, 0) / vals.length : 0;
}

export function teamCost(teams: BuilderPlayer[][]): number {
  const sums = teams.map((t) => t.reduce((a, p) => a + p.strength, 0));
  const mean = sums.reduce((a, b) => a + b, 0) / teams.length;
  const strength = sums.reduce((a, s) => a + (s - mean) ** 2, 0);
  const roles = [...new Set(teams.flat().map((p) => p.role))].filter((r) => r !== 'any');
  let mix = 0;
  for (const r of roles) {
    const counts = teams.map((t) => t.filter((p) => p.role === r).length);
    const m = counts.reduce((a, b) => a + b, 0) / teams.length;
    mix += counts.reduce((a, c) => a + (c - m) ** 2, 0);
  }
  return strength + 0.5 * mix;
}

export function balanceTeams(players: BuilderPlayer[], k: number, rnd: () => number = Math.random, noise = 0): BuilderPlayer[][] {
  const n = Math.max(1, Math.min(k, players.length || 1));
  const keyed = shuffle(players, rnd).map((p) => ({ p, key: p.strength + (noise ? (rnd() - 0.5) * noise : 0) }));
  keyed.sort((a, b) => b.key - a.key);
  const teams: BuilderPlayer[][] = Array.from({ length: n }, () => []);
  keyed.forEach(({ p }, i) => {
    const round = Math.floor(i / n);
    const slot = i % n;
    teams[round % 2 === 0 ? slot : n - 1 - slot].push(p);
  });
  // Swap pairs across teams while it lowers the cost (sizes never change).
  for (let pass = 0, improved = true; improved && pass < 30; pass++) {
    improved = false;
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++)
        for (let i = 0; i < teams[a].length; i++)
          for (let j = 0; j < teams[b].length; j++) {
            const before = teamCost(teams);
            [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
            if (teamCost(teams) < before - 1e-9) improved = true;
            else [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
          }
  }
  return teams;
}

/** Manual swap: two players trade teams. */
export function swapPlayers(teams: string[][], a: string, b: string): string[][] {
  return teams.map((t) => t.map((id) => (id === a ? b : id === b ? a : id)));
}

/** Manual move: a player joins another team. */
export function movePlayer(teams: string[][], id: string, to: number): string[][] {
  return teams.map((t, i) => (i === to ? [...t.filter((x) => x !== id), id] : t.filter((x) => x !== id)));
}

export const TEAM_NAMES = ['Bibs', 'No bibs', 'Team 3', 'Team 4'];
