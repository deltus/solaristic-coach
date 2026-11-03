// The database layer against fake-indexeddb: a full game with subs, attendance, ratings,
// season numbers, demo data, encrypted backup and preview isolation. Fictional data only.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CoachDB, useDatabase, db } from '../src/db';
import * as svc from '../src/services';
import { minutesByPlayer, totalPlayerMs } from '../src/logic/gameTime';
import { seasonStats, needsAttention, teamListText, record } from '../src/logic/season';
import { loadDemoData } from '../src/demo';
import { dbName, storageKey } from '../src/preview';
import { decryptBackup } from '../src/logic/backupCrypto';

const MIN = 60000;
let i = 0;
beforeEach(() => useDatabase(new CoachDB(`test-${++i}`)));

async function squad(n: number) {
  const team = await svc.createTeam({ name: 'Test Team', sportId: 'basketball', season: 'Winter 2027', ageGroup: 'U10', overrides: {} });
  const players = [];
  for (let k = 0; k < n; k++) players.push(await svc.addPlayer(team.id, { firstName: `Kid${k}`, lastName: 'Zed', positions: [] }));
  return { team, players };
}

describe('players', () => {
  it('keeps only a first name and last initial', async () => {
    const { team } = await squad(0);
    const p = await svc.addPlayer(team.id, { firstName: '  Mary Jane ', lastName: 'smith', jersey: 3, positions: ['pg'] });
    expect(p).toMatchObject({ firstName: 'Mary', lastInitial: 'S', jersey: 3 });
    await expect(svc.addPlayer(team.id, { firstName: ' ', lastName: '', positions: [] })).rejects.toThrow();
  });
});

describe('a full game with subs', () => {
  it('minutes add up to game length × players on court', async () => {
    const { team, players } = await squad(7);
    const sport = svc.sportOf(team);
    const ev = await svc.openEvent(team.id, 'game', { opponent: 'Rivals', gameType: 'competition' });
    await svc.markRestHere(
      ev.id,
      players.map((p) => p.id)
    );
    await svc.setAttendance(ev.id, players[6].id, 'away');
    const slots = sport.positions.map((p) => p.id);
    await svc.setLineup(ev.id, Object.fromEntries(slots.map((s, k) => [s, players[k].id])));

    const t0 = 1_000_000;
    await svc.kickOff(ev.id, t0);
    await svc.sub(ev.id, slots[0], players[5].id, t0 + 4 * MIN); // Kid5 on for Kid0
    await svc.pauseTime(ev.id, t0 + 6 * MIN);
    await svc.startTime(ev.id, t0 + 9 * MIN); // 3-minute stoppage
    await svc.endCurrentPeriod(ev.id, sport.periods, t0 + 11 * MIN); // Q1 = 8 min
    await svc.startTime(ev.id, t0 + 20 * MIN);
    await svc.sub(ev.id, slots[1], players[0].id, t0 + 24 * MIN); // Kid0 back on for Kid1
    await svc.swap(ev.id, slots[2], slots[3], t0 + 25 * MIN);
    await svc.endCurrentPeriod(ev.id, sport.periods, t0 + 28 * MIN); // Q2 = 8 min
    for (let q = 2; q < sport.periods; q++) {
      await svc.startTime(ev.id, t0 + q * 100 * MIN);
      await svc.endCurrentPeriod(ev.id, sport.periods, t0 + q * 100 * MIN + 8 * MIN);
    }
    await svc.setScore(ev.id, 24, 20);
    await svc.closeEvent(ev.id, t0 + 999 * MIN);

    const done = (await svc.getEvent(ev.id))!;
    expect(done.clock!.finished).toBe(true);
    const length = done.clock!.done.reduce((a, b) => a + b, 0);
    expect(length).toBe(32 * MIN);
    const stints = await svc.stintsFor(ev.id);
    expect(stints.every((s) => s.end !== undefined)).toBe(true);
    expect(totalPlayerMs(stints, 0)).toBe(length * sport.onField);
    const m = minutesByPlayer(stints, 0);
    expect(m.get(players[0].id)).toBe(4 * MIN + 20 * MIN);
    expect(m.get(players[1].id)).toBe(12 * MIN);
    expect(m.get(players[5].id)).toBe(28 * MIN);

    const stats = seasonStats(await svc.loadSeason(team.id), sport);
    const kid6 = stats.find((s) => s.player.id === players[6].id)!;
    expect(kid6).toMatchObject({ games: 0, away: 1, minutesMs: 0 });
    expect(stats.reduce((a, s) => a + s.minutesMs, 0)).toBe(length * sport.onField);
    expect(record((await svc.loadSeason(team.id)).events)).toMatchObject({ played: 1, won: 1 });
  });

  it('closing mid-quarter counts the quarter so far', async () => {
    const { team, players } = await squad(5);
    const ev = await svc.openEvent(team.id, 'game');
    await svc.setLineup(ev.id, Object.fromEntries(svc.sportOf(team).positions.map((p, k) => [p.id, players[k].id])));
    await svc.kickOff(ev.id, 0);
    await svc.closeEvent(ev.id, 5 * MIN);
    const stints = await svc.stintsFor(ev.id);
    expect(totalPlayerMs(stints, 0)).toBe(5 * 5 * MIN);
  });
});

describe('ratings', () => {
  it('saves swipes per area and a note; skip clears an area', async () => {
    const { team, players } = await squad(1);
    const ev = await svc.openEvent(team.id, 'training');
    await svc.rate(ev.id, players[0].id, 'effort', 1);
    await svc.rate(ev.id, players[0].id, 'skills', -1);
    await svc.rate(ev.id, players[0].id, 'skills', null);
    await svc.setRatingNote(ev.id, players[0].id, ' Good listening ');
    const [r] = await svc.ratingsFor(ev.id);
    expect(r.scores).toEqual({ effort: 1 });
    expect(r.note).toBe('Good listening');
  });
});

describe('demo data', () => {
  it('has 12 players, 5 trainings and 4 games with minutes that add up', async () => {
    const team = await loadDemoData();
    const data = await svc.loadSeason(team.id);
    const sport = svc.sportOf(team);
    expect(data.players).toHaveLength(12);
    expect(data.events.filter((e) => e.kind === 'training')).toHaveLength(5);
    const games = data.events.filter((e) => e.kind === 'game');
    expect(games).toHaveLength(4);
    expect(games.filter((g) => g.gameType === 'friendly')).toHaveLength(1);
    const stats = seasonStats(data, sport);
    const total = stats.reduce((a, s) => a + s.minutesMs, 0);
    expect(total).toBe(4 * 50 * MIN * 9);
    // Every player who came to every session has a check.
    const present = data.attendance.filter((a) => a.status !== 'absent');
    expect(data.checks).toHaveLength(present.length);
    expect(data.attendance.some((a) => a.status === 'absent' && a.reason === 'noshow')).toBe(true);
    expect(data.checks.some((c) => c.verdict === 'star')).toBe(true);
    expect(data.events.filter((e) => e.kind === 'training').every((e) => e.focus)).toBe(true);
    expect(Array.isArray(needsAttention(stats, data, sport))).toBe(true);
    const text = teamListText(team, data.players, sport.name);
    expect(text).toContain('#4 Mia');
    expect(text).not.toMatch(/Mia T/);
  });
});

describe('backup', () => {
  it('is encrypted, needs the passphrase, and restores everything', async () => {
    const team = await loadDemoData();
    const file = await svc.createBackup('correct horse', 1000);
    expect(JSON.stringify(file)).not.toContain('Riverside');
    await expect(decryptBackup(file, 'wrong pass')).rejects.toThrow(/Wrong passphrase/);
    await expect(svc.createBackup('short')).rejects.toThrow();
    await svc.deleteAllData();
    expect(await db.players.count()).toBe(0);
    await svc.restoreBackup(file, 'correct horse');
    expect(await db.players.where('teamId').equals(team.id).count()).toBe(12);
  });
});

describe('preview isolation', () => {
  it('previews use their own database and storage keys', () => {
    expect(dbName(undefined)).toBe('solaristic-coach');
    expect(dbName('round1')).toBe('solaristic-coach-preview-round1');
    expect(storageKey('x', 'round1')).toBe('preview-round1:x');
    expect(storageKey('x', undefined)).toBe('x');
  });
});
