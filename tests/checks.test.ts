// Round 2: the roll (everyone starts here, absences have reasons), the post-session check and
// "Log now", the database v1 → v2 upgrade, backups with voice notes and old backups, and the
// sport templates (futsal, skill lists, team sizes 4–15). Fictional data only.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { CoachDB, db, useDatabase } from '../src/db';
import * as svc from '../src/services';
import { addLogged, combineCheck, isPresent, rollChoiceOf, summariseChecks } from '../src/logic/checks';
import { strengthFrom } from '../src/logic/teamBuilder';
import { encryptBackup } from '../src/logic/backupCrypto';
import { MAX_ON_FIELD, MIN_ON_FIELD, onFieldChoices, SPORTS, teamSport, customSport } from '../src/config/sports';
import { ALL_CHIPS } from '../src/config/checks';
import { availablePlayers } from '../src/ui/screens/LineupScreen';
import type { Check } from '../src/types';

let n = 0;
beforeEach(() => useDatabase(new CoachDB(`checks-${++n}`)));

async function squad(k: number) {
  const team = await svc.createTeam({
    name: 'Test Team',
    sportId: 'soccer',
    season: 'Winter 2027',
    ageGroup: 'U11',
    overrides: { onField: 9 }
  });
  const players = [];
  for (let i = 0; i < k; i++) players.push(await svc.addPlayer(team.id, { firstName: `Kid${i}`, lastName: 'Zed', positions: [] }));
  return { team, players };
}

describe('the roll', () => {
  it('starts everyone as here; a tap marks an absence with a reason', async () => {
    const { team, players } = await squad(4);
    await svc.removePlayer(players[3].id); // never came: deleted, so not on the roll
    const ev = await svc.openEvent(team.id, 'training');
    let att = await svc.attendanceFor(ev.id);
    expect(att).toHaveLength(3);
    expect(att.every((a) => a.status === 'here')).toBe(true);

    await svc.setAttendance(ev.id, players[0].id, 'sick');
    await svc.setAttendance(ev.id, players[1].id, 'late');
    att = await svc.attendanceFor(ev.id);
    const a0 = att.find((a) => a.playerId === players[0].id)!;
    expect(a0).toMatchObject({ status: 'absent', reason: 'sick' });
    expect(isPresent(a0)).toBe(false);
    expect(rollChoiceOf(a0)).toBe('sick');
    expect(availablePlayers(players.slice(0, 3), att).map((p) => p.firstName)).toEqual(['Kid1', 'Kid2']);

    await svc.setAttendance(ev.id, players[0].id, 'here');
    expect((await svc.attendanceFor(ev.id)).find((a) => a.playerId === players[0].id)).toMatchObject({ status: 'here', reason: undefined });
  });
});

describe('combining swipes and notes', () => {
  it('a quick swipe never wipes logged chips', () => {
    const logged = addLogged(undefined, ['rough-play']);
    expect(logged).toMatchObject({ verdict: 'note', chips: ['rough-play'], logged: true });
    expect(combineCheck(logged, { verdict: 'good' })).toMatchObject({ verdict: 'note', chips: ['rough-play'] });
    expect(combineCheck(logged, { verdict: 'star' })).toMatchObject({ verdict: 'star', chips: ['rough-play'] });
  });
  it('ticking chips replaces them; no chips means all good; conflict needs its chip', () => {
    const c = combineCheck(undefined, { verdict: 'note', chips: ['conflict', 'argued'], conflictWith: ['p2'] });
    expect(c).toMatchObject({ verdict: 'note', conflictWith: ['p2'] });
    const d = combineCheck(c, { verdict: 'note', chips: ['argued'] });
    expect(d.conflictWith).toBeUndefined();
    expect(combineCheck(d, { verdict: 'note', chips: [] }).verdict).toBe('good');
  });
  it('the summary counts verdicts and flags safety chips', () => {
    const mk = (playerId: string, verdict: Check['verdict'], chips: string[] = []): Check => ({
      id: playerId,
      eventId: 'e',
      teamId: 't',
      playerId,
      verdict,
      chips,
      at: 0
    });
    const s = summariseChecks([mk('a', 'good'), mk('b', 'star'), mk('c', 'note', ['knock']), mk('d', 'note', ['helped'])]);
    expect(s).toEqual({ good: 1, star: 1, note: 2, safety: ['c'] });
  });
});

describe('check services', () => {
  it('log now, then the swipe after the session, then a note', async () => {
    const { team, players } = await squad(3);
    const ev = await svc.openEvent(team.id, 'game');
    await svc.logIncident(ev.id, players[0].id, ['knock']);
    await svc.logIncident(ev.id, players[0].id, ['conflict'], [players[1].id]);
    await svc.closeEvent(ev.id);
    await svc.saveCheck(ev.id, players[0].id, { verdict: 'good' });
    await svc.saveCheck(ev.id, players[1].id, { verdict: 'star' });
    await svc.saveCheck(ev.id, players[2].id, { verdict: 'note', chips: ['helped'] });
    const checks = await svc.checksFor(ev.id);
    expect(checks).toHaveLength(3);
    const c0 = checks.find((c) => c.playerId === players[0].id)!;
    expect(c0).toMatchObject({ verdict: 'note', logged: true, conflictWith: [players[1].id] });
    expect(c0.chips.sort()).toEqual(['conflict', 'knock']);
    await svc.clearCheck(ev.id, players[2].id);
    expect(await svc.checksFor(ev.id)).toHaveLength(2);
    // Deleting the session deletes its checks too.
    await svc.deleteEvent(ev.id);
    expect(await db.checks.count()).toBe(0);
  });

  it('checks feed the team builder strength', () => {
    const c = (at: number, verdict: Check['verdict'], chips: string[] = []): Check => ({
      id: `${at}`,
      eventId: 'e',
      teamId: 't',
      playerId: 'p',
      verdict,
      chips,
      at
    });
    expect(strengthFrom([], [c(1, 'star'), c(2, 'note', ['nailed-drill'])])).toBe(0.75);
    expect(strengthFrom([], [c(1, 'good')])).toBe(0);
    expect(strengthFrom([], [c(1, 'note', ['struggled-drill'])])).toBe(-0.5);
  });
});

describe('upgrading round 1 data', () => {
  it('keeps everything and turns "away" into an absence with a reason', async () => {
    const name = `upgrade-${++n}`;
    const old = new Dexie(name);
    old.version(1).stores({
      teams: 'id, createdAt',
      players: 'id, teamId',
      events: 'id, teamId, [teamId+date], date',
      attendance: 'id, eventId, teamId, [eventId+playerId]',
      stints: 'id, eventId, teamId, playerId',
      ratings: 'id, eventId, teamId, playerId',
      drillUses: 'id, eventId, teamId, drillId',
      settings: 'key'
    });
    await old.table('attendance').bulkAdd([
      { id: 'a1', eventId: 'e1', teamId: 't1', playerId: 'p1', status: 'away' },
      { id: 'a2', eventId: 'e1', teamId: 't1', playerId: 'p2', status: 'late' }
    ]);
    await old.table('ratings').add({ id: 'r1', eventId: 'e1', teamId: 't1', playerId: 'p2', scores: { effort: 1 }, note: 'Keep', at: 1 });
    old.close();

    const next = new CoachDB(name);
    await next.open();
    expect(next.verno).toBe(2);
    expect(await next.attendance.get('a1')).toMatchObject({ status: 'absent', reason: 'away' });
    expect(await next.attendance.get('a2')).toMatchObject({ status: 'late' });
    expect(await next.ratings.get('r1')).toMatchObject({ note: 'Keep' });
    expect(await next.checks.count()).toBe(0);
    next.close();
  });

  it('restores a round 1 backup', async () => {
    const v1 = {
      format: 'solaristic-coach-data',
      version: 1,
      tables: {
        teams: [{ id: 't1', kind: 'team', name: 'Old Team', sportId: 'soccer', overrides: {}, season: 'S', ageGroup: 'U9', createdAt: 1 }],
        attendance: [{ id: 'a1', eventId: 'e1', teamId: 't1', playerId: 'p1', status: 'away' }]
      }
    };
    await svc.restoreBackup(await encryptBackup(v1, 'correct horse', 1000), 'correct horse');
    expect(await db.teams.count()).toBe(1);
    expect(await db.attendance.get('a1')).toMatchObject({ status: 'absent', reason: 'away' });
  });

  it('backs up and restores voice notes', async () => {
    const { team, players } = await squad(1);
    const ev = await svc.openEvent(team.id, 'training');
    const bytes = new Uint8Array([1, 2, 3, 250]);
    await svc.saveVoiceNote(ev.id, players[0].id, bytes.buffer, 'audio/webm', 1500);
    await svc.saveVoiceNote(ev.id, players[0].id, bytes.buffer, 'audio/webm', 2500); // replaces
    expect(await svc.voiceNotesFor(ev.id)).toHaveLength(1);
    const file = await svc.createBackup('correct horse', 1000);
    await svc.deleteAllData();
    await svc.restoreBackup(file, 'correct horse');
    const [v] = await svc.voiceNotesFor(ev.id);
    expect(v.ms).toBe(2500);
    expect([...new Uint8Array(v.data)]).toEqual([1, 2, 3, 250]);
  });
});

describe('sport templates', () => {
  it('has futsal, 5–8 skills each, and team sizes from 4 to 15', () => {
    expect(SPORTS.map((s) => s.id)).toEqual(expect.arrayContaining(['soccer', 'afl', 'netball', 'basketball', 'futsal']));
    for (const s of [...SPORTS, customSport()]) {
      expect(s.skills.length).toBeGreaterThanOrEqual(5);
      expect(s.skills.length).toBeLessThanOrEqual(8);
      expect(new Set(s.skills.map((k) => k.id)).size).toBe(s.skills.length);
      for (const c of onFieldChoices(s.id)) {
        expect(c).toBeGreaterThanOrEqual(MIN_ON_FIELD);
        expect(c).toBeLessThanOrEqual(MAX_ON_FIELD);
      }
    }
    expect(onFieldChoices('soccer')).toEqual(expect.arrayContaining([9, 11]));
    expect(teamSport('afl', { onField: 18 }).onField).toBe(15);
    expect(customSport(2).onField).toBe(4);
    expect(new Set(ALL_CHIPS.map((c) => c.id)).size).toBe(ALL_CHIPS.length);
  });
});
