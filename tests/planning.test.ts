// Sport templates, Fair rotation, the team builder and drills. Fictional ids only.
import { describe, expect, it } from 'vitest';
import { customSport, onFieldChoices, SPORTS, teamSport } from '../src/config/sports';
import { benchPlan, fairRotation, placeInLineup, type PlayerHistory } from '../src/logic/lineup';
import { seeded } from '../src/logic/random';
import { balanceTeams, movePlayer, strengthFrom, swapPlayers, teamCost } from '../src/logic/teamBuilder';
import { drillsFor, sortByRecord, trackRecords } from '../src/logic/drills';
import { DRILLS } from '../src/config/drills';
import { ageBand } from '../src/config/coaching';

describe('sport templates', () => {
  it('every template is complete and consistent', () => {
    for (const s of SPORTS) {
      expect(s.positions.length).toBe(s.onField);
      expect(new Set(s.positions.map((p) => p.id)).size).toBe(s.positions.length);
      for (const p of s.positions) expect(s.roles.map((r) => r.id)).toContain(p.role);
      for (const [n, ids] of Object.entries(s.formats ?? {})) {
        expect(ids.length).toBe(Number(n));
        for (const id of ids) expect(s.positions.some((p) => p.id === id)).toBe(true);
      }
    }
  });
  it('applies a team’s own numbers', () => {
    const s = teamSport('soccer', { onField: 9, periodMinutes: 25 });
    expect(s.positions.map((p) => p.id)).toContain('gk');
    expect(s.positions).toHaveLength(9);
    expect(onFieldChoices('soccer')).toEqual([4, 5, 7, 9, 11]);
  });
  it('custom sports get generic positions', () => {
    const c = customSport(5, 4, 10);
    expect(c.positions).toHaveLength(5);
    expect(c.periodName).toBe('Quarter');
    expect(teamSport('custom', { onField: 6, periods: 2, periodMinutes: 15 }).positions).toHaveLength(6);
  });
});

describe('fair rotation', () => {
  const slots = teamSport('soccer', { onField: 5 }).positions;
  const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, preferred: [] as string[] }));

  it('players who played most sit first, and the bench rotates', () => {
    const season = new Map([
      ['a', 90],
      ['b', 80]
    ]);
    const plan = benchPlan(
      players.map((p) => p.id),
      5,
      4,
      season
    );
    expect(plan[0]).toEqual(['a', 'b']);
    expect(new Set(plan.flat()).size).toBe(7);
  });

  it('steers each player towards roles they have played least', () => {
    const history = new Map<string, PlayerHistory>(players.map((p) => [p.id, { totalMs: 100, byRole: new Map([['gk', 100]]) }]));
    history.set('c', { totalMs: 100, byRole: new Map([['def', 100]]) });
    const lineup = fairRotation({ players, slots, history });
    expect(Object.keys(lineup)).toHaveLength(5);
    expect(new Set(Object.values(lineup)).size).toBe(5);
    expect(lineup.gk).toBe('c');
  });

  it('dropping a player on a taken spot swaps them', () => {
    expect(placeInLineup({ x: 'a', y: 'b' }, 'y', 'a')).toEqual({ x: 'b', y: 'a' });
    expect(placeInLineup({ x: 'a' }, 'y', 'c')).toEqual({ x: 'a', y: 'c' });
  });
});

describe('team builder', () => {
  const squad = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, strength: (i % 4) / 3 - 0.5, role: i % 3 ? 'mid' : 'def' }));

  it('splits into even, balanced teams', () => {
    for (const k of [2, 3, 4]) {
      const teams = balanceTeams(squad, k, seeded(1));
      expect(teams).toHaveLength(k);
      const sizes = teams.map((t) => t.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(teams.flat()).toHaveLength(12);
      // Total strength within one "average player" of each other, and the role mix as even as it can be.
      const sums = teams.map((t) => t.reduce((a, p) => a + p.strength, 0));
      expect(Math.max(...sums) - Math.min(...sums)).toBeLessThan(0.7);
      expect(teamCost(teams)).toBeLessThanOrEqual(1);
    }
  });
  it('shuffle gives a different but still balanced split', () => {
    const a = balanceTeams(squad, 2, seeded(1), 0.3).map((t) => t.map((p) => p.id).sort());
    const b = balanceTeams(squad, 2, seeded(99), 0.3).map((t) => t.map((p) => p.id).sort());
    expect(a).not.toEqual(b);
  });
  it('strength comes from recent ratings', () => {
    const r = (at: number, v: 1 | -1) => ({ id: `${at}`, eventId: 'e', teamId: 't', playerId: 'p', scores: { effort: v, skills: v }, at });
    expect(strengthFrom([r(1, -1), r(2, 1), r(3, 1)], 2)).toBe(1);
    expect(strengthFrom([])).toBe(0);
  });
  it('manual swaps and moves', () => {
    expect(swapPlayers([['a'], ['b']], 'a', 'b')).toEqual([['b'], ['a']]);
    expect(movePlayer([['a', 'c'], ['b']], 'c', 1)).toEqual([['a'], ['b', 'c']]);
  });
});

describe('drills', () => {
  it('filters by sport and age, and sorts by track record', () => {
    expect(ageBand('U11')).toBe('U9-U12');
    expect(ageBand('Open')).toBe('U13+');
    const list = drillsFor('netball', 'U7');
    expect(list.every((d) => d.sports === 'all' || d.sports.includes('netball'))).toBe(true);
    expect(list.some((d) => d.id === 'netball-pivot')).toBe(true);
    const rec = trackRecords([
      { id: '1', eventId: 'e', teamId: 't', drillId: 'mirror', result: 'worked', at: 1 },
      { id: '2', eventId: 'e', teamId: 't', drillId: 'ball-tag', result: 'didnt', at: 1 }
    ]);
    const sorted = sortByRecord(DRILLS, rec);
    expect(sorted[0].id).toBe('mirror');
    expect(sorted[sorted.length - 1].id).toBe('ball-tag');
  });
});
