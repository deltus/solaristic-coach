// Training sessions and games: open, edit, close (like Radar's lessons), and the roll. When a
// session opens, every active player starts as "here"; the coach only taps who's missing or late.

import type { RollChoice } from '../config/coaching';
import { db, EVENT_TABLES, newId } from '../db';
import { attendanceFor as rowFor } from '../logic/checks';
import { closeAll, gameMs, pauseClock } from '../logic/gameTime';
import { today } from '../lib/format';
import type { EventKind, TeamEvent } from '../types';

export type GameDetails = Pick<TeamEvent, 'opponent' | 'venue' | 'gameType'>;

export async function openEvent(teamId: string, kind: EventKind, details: GameDetails = {}, date = today()): Promise<TeamEvent> {
  const ev: TeamEvent = {
    id: newId(),
    teamId,
    kind,
    date,
    openedAt: Date.now(),
    ...(kind === 'game' ? { venue: 'home' as const, gameType: 'competition' as const, scoreFor: 0, scoreAgainst: 0, ...details } : {})
  };
  const players = (await db.players.where('teamId').equals(teamId).toArray()).filter((p) => p.active);
  await db.transaction('rw', db.events, db.attendance, async () => {
    await db.events.add(ev);
    await db.attendance.bulkAdd(players.map((p) => ({ id: newId(), eventId: ev.id, teamId, playerId: p.id, status: 'here' as const })));
  });
  return ev;
}

export const getEvent = (id: string) => db.events.get(id);

export const updateEvent = (id: string, patch: Partial<Omit<TeamEvent, 'id' | 'teamId'>>) => db.events.update(id, patch);

/** Closes a session or game. For a game, the clock stops and every player still on comes off. */
export async function closeEvent(id: string, now = Date.now()) {
  const ev = await db.events.get(id);
  if (!ev || ev.closedAt) return;
  await db.transaction('rw', db.events, db.stints, async () => {
    const patch: Partial<TeamEvent> = { closedAt: now };
    if (ev.kind === 'game' && ev.clock) {
      const c = pauseClock(ev.clock, now);
      // Count the period in progress as played, so its minutes add up.
      const done = c.elapsed > 0 ? [...c.done, c.elapsed] : c.done;
      const clock = c.finished ? c : { ...c, done, elapsed: 0, period: done.length, finished: true };
      patch.clock = clock;
      const stints = await db.stints.where('eventId').equals(id).toArray();
      await db.stints.bulkPut(closeAll(stints, gameMs(clock, now)));
    }
    await db.events.update(id, patch);
  });
}

/** Re-opens a closed session (e.g. closed by mistake). The game clock stays finished. */
export const reopenEvent = (id: string) => db.events.update(id, { closedAt: undefined });

export async function deleteEvent(id: string) {
  const tables = EVENT_TABLES.map((t) => db.table(t));
  await db.transaction('rw', [db.events, ...tables], async () => {
    for (const t of tables) await t.where('eventId').equals(id).delete();
    await db.events.delete(id);
  });
}

export async function listEvents(teamId: string): Promise<TeamEvent[]> {
  const all = await db.events.where('teamId').equals(teamId).toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.openedAt - a.openedAt);
}

/** Sessions and games still open, across all teams. */
export async function openEvents(): Promise<TeamEvent[]> {
  return (await db.events.toArray()).filter((e) => !e.closedAt);
}

/** Sets one player on the roll: here, late, or absent with a reason. null clears it (not marked). */
export async function setAttendance(eventId: string, playerId: string, choice: RollChoice | null) {
  const ev = await db.events.get(eventId);
  if (!ev) return;
  const existing = await db.attendance.where('[eventId+playerId]').equals([eventId, playerId]).first();
  if (!choice) {
    if (existing) await db.attendance.delete(existing.id);
    return;
  }
  await db.attendance.put({ id: existing?.id ?? newId(), eventId, teamId: ev.teamId, playerId, ...rowFor(choice) });
}

/** Marks everyone without a status as here (the "All here" button). */
export async function markRestHere(eventId: string, playerIds: string[]) {
  const ev = await db.events.get(eventId);
  if (!ev) return;
  const have = new Set((await db.attendance.where('eventId').equals(eventId).toArray()).map((a) => a.playerId));
  await db.attendance.bulkAdd(
    playerIds
      .filter((p) => !have.has(p))
      .map((playerId) => ({ id: newId(), eventId, teamId: ev.teamId, playerId, status: 'here' as const }))
  );
}

export const attendanceFor = (eventId: string) => db.attendance.where('eventId').equals(eventId).toArray();
