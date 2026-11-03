// Season numbers per player (games, minutes, positions, attendance, checks, old ratings, notes), the
// "who needs attention" list (adapted from Radar's need ranking: here it's fair game time and
// coach attention), and the parents' group team list (first names only).

import type { Sport } from '../config/sports';
import type { AbsentReason, Attendance, Check, Player, Rating, Stint, Team, TeamEvent } from '../types';
import { isPresent } from './checks';
import { positionsByPlayer } from './gameTime';
import type { PlayerHistory } from './lineup';

export interface SeasonData {
  players: Player[];
  events: TeamEvent[];
  attendance: Attendance[];
  stints: Stint[];
  ratings: Rating[];
  checks: Check[];
}

export interface PlayerSeason {
  player: Player;
  games: number;
  trainings: number;
  late: number;
  /** Sessions missed, for any reason. */
  away: number;
  absentFor: Partial<Record<AbsentReason, number>>;
  /** Attendance rate over closed events with a record, 0–1. */
  attendanceRate: number;
  minutesMs: number;
  byPosition: Map<string, number>;
  byRole: Map<string, number>;
  /** Round 1 ratings per area: [great, needs work]. */
  ratings: Map<string, [number, number]>;
  /** Post-session checks: all good, stars, notes, and how often each chip was ticked. */
  checks: { good: number; star: number; note: number; chips: Map<string, number> };
  notes: { date: string; note: string }[];
  /** Fraction of the game time they could have had (0–1), over games they attended. */
  shareOfAvailable: number;
}

/** Only closed games count towards season minutes (an open game is still being played). */
const closed = (e: TeamEvent) => e.closedAt !== undefined;

export function seasonStats(d: SeasonData, sport: Sport): PlayerSeason[] {
  const roleOf = (pos: string) => sport.positions.find((p) => p.id === pos)?.role ?? 'any';
  const closedEvents = d.events.filter(closed);
  const eventById = new Map(closedEvents.map((e) => [e.id, e]));
  const gameStints = d.stints.filter((s) => eventById.get(s.eventId)?.kind === 'game');
  const byPos = positionsByPlayer(gameStints, 0);
  const byRole = positionsByPlayer(gameStints, 0, roleOf);
  const gameLength = new Map(
    closedEvents.filter((e) => e.kind === 'game').map((e) => [e.id, (e.clock?.done ?? []).reduce((a, b) => a + b, 0)])
  );
  const attended = (a: Attendance) => isPresent(a);

  return d.players.map((player) => {
    const att = d.attendance.filter((a) => a.playerId === player.id && eventById.has(a.eventId));
    const games = att.filter((a) => attended(a) && eventById.get(a.eventId)!.kind === 'game');
    const trainings = att.filter((a) => attended(a) && eventById.get(a.eventId)!.kind === 'training');
    const posMap = byPos.get(player.id) ?? new Map<string, number>();
    const minutesMs = [...posMap.values()].reduce((a, b) => a + b, 0);
    const possible = games.reduce((a, g) => a + (gameLength.get(g.eventId) ?? 0), 0);
    const ratings = new Map<string, [number, number]>();
    const notes: { date: string; note: string }[] = [];
    for (const r of d.ratings.filter((x) => x.playerId === player.id)) {
      for (const [area, v] of Object.entries(r.scores)) {
        const t = ratings.get(area) ?? [0, 0];
        t[v === 1 ? 0 : 1]++;
        ratings.set(area, t);
      }
      if (r.note) notes.push({ date: d.events.find((e) => e.id === r.eventId)?.date ?? '', note: r.note });
    }
    notes.sort((a, b) => a.date.localeCompare(b.date));
    const checks = { good: 0, star: 0, note: 0, chips: new Map<string, number>() };
    for (const c of d.checks.filter((x) => x.playerId === player.id && eventById.has(x.eventId))) {
      checks[c.verdict]++;
      for (const chip of c.chips) checks.chips.set(chip, (checks.chips.get(chip) ?? 0) + 1);
    }
    const absentFor: PlayerSeason['absentFor'] = {};
    for (const a of att) if (a.status === 'absent') absentFor[a.reason ?? 'away'] = (absentFor[a.reason ?? 'away'] ?? 0) + 1;
    return {
      player,
      games: games.length,
      trainings: trainings.length,
      late: att.filter((a) => a.status === 'late').length,
      away: att.filter((a) => !attended(a)).length,
      absentFor,
      attendanceRate: att.length ? att.filter(attended).length / att.length : 0,
      minutesMs,
      byPosition: posMap,
      byRole: byRole.get(player.id) ?? new Map(),
      ratings,
      checks,
      notes,
      shareOfAvailable: possible ? minutesMs / possible : 0
    };
  });
}

/** Season history for the Fair rotation button. */
export function historyFrom(stats: PlayerSeason[]): Map<string, PlayerHistory> {
  return new Map(stats.map((s) => [s.player.id, { totalMs: s.minutesMs, byRole: s.byRole }]));
}

export interface Attention {
  playerId: string;
  reasons: string[];
  score: number;
}

/**
 * Who needs attention: lowest share of available game time, roles never played, missed
 * recent sessions, and players the coach hasn't rated lately. Highest score first.
 */
export function needsAttention(stats: PlayerSeason[], d: SeasonData, sport: Sport): Attention[] {
  const withGames = stats.filter((s) => s.games > 0);
  const avgShare = withGames.length ? withGames.reduce((a, s) => a + s.shareOfAvailable, 0) / withGames.length : 0;
  const recent = d.events
    .filter(closed)
    .sort((a, b) => b.date.localeCompare(a.date) || b.openedAt - a.openedAt)
    .slice(0, 3);
  const out: Attention[] = [];
  for (const s of stats) {
    const reasons: string[] = [];
    let score = 0;
    if (s.games > 0 && avgShare > 0 && s.shareOfAvailable < avgShare * 0.85) {
      reasons.push(`Fewer minutes than most (${Math.round(s.shareOfAvailable * 100)}% of the time they were there)`);
      score += 3;
    }
    const realRoles = sport.roles.filter((r) => r.id !== 'any' && r.id !== 'gk' && r.id !== 'keep');
    const missing = realRoles.filter((r) => !s.byRole.get(r.id));
    if (s.games >= 2 && realRoles.length > 1 && missing.length) {
      reasons.push(`Hasn't played ${missing.map((r) => r.label.toLowerCase()).join(' or ')} yet`);
      score += 2;
    }
    const awayRecent = recent.filter((e) =>
      d.attendance.some((a) => a.eventId === e.id && a.playerId === s.player.id && !isPresent(a))
    ).length;
    if (awayRecent >= 2) {
      reasons.push(`Missed ${awayRecent} of the last ${recent.length}`);
      score += 1;
    }
    const seen = (e: TeamEvent) =>
      d.checks.some((c) => c.eventId === e.id && c.playerId === s.player.id) ||
      d.ratings.some((r) => r.eventId === e.id && r.playerId === s.player.id);
    if (recent.length >= 2 && !recent.some(seen) && awayRecent < recent.length) {
      reasons.push('Not checked lately');
      score += 1;
    }
    if (reasons.length) out.push({ playerId: s.player.id, reasons, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Text for the parents' group chat: team, season and first names only (with jersey numbers). */
export function teamListText(team: Team, players: Player[], sportName: string): string {
  const lines = [...players]
    .filter((p) => p.active)
    .sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999) || a.firstName.localeCompare(b.firstName))
    .map((p) => (p.jersey !== undefined ? `#${p.jersey} ${p.firstName}` : p.firstName));
  return [`${team.name} · ${team.ageGroup} ${sportName} · ${team.season}`, '', ...lines].join('\n');
}

/** Win / loss / draw from closed games with a score. */
export function record(events: TeamEvent[]) {
  const games = events.filter((e) => e.kind === 'game' && closed(e) && e.scoreFor !== undefined && e.scoreAgainst !== undefined);
  return {
    played: games.length,
    won: games.filter((g) => g.scoreFor! > g.scoreAgainst!).length,
    lost: games.filter((g) => g.scoreFor! < g.scoreAgainst!).length,
    drawn: games.filter((g) => g.scoreFor === g.scoreAgainst).length
  };
}
