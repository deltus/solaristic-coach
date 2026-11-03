// Live game time: line-up, kick-off, the clock, and subs. Pure maths is in src/logic/gameTime.ts;
// this file saves the results. Every change happens in one transaction so minutes always add up.

import { db, newId } from '../db';
import { endPeriod, gameMs, newClock, pauseClock, startClock, substitute, swapPositions } from '../logic/gameTime';
import type { Clock, TeamEvent } from '../types';

async function need(eventId: string): Promise<TeamEvent> {
  const ev = await db.events.get(eventId);
  if (!ev) throw new Error('That game no longer exists.');
  return ev;
}

export const setLineup = (eventId: string, lineup: Record<string, string>) => db.events.update(eventId, { lineup });

export const stintsFor = (eventId: string) => db.stints.where('eventId').equals(eventId).toArray();

/** Starts the game: the planned line-up goes on and the clock starts. */
export async function kickOff(eventId: string, now = Date.now()) {
  await db.transaction('rw', db.events, db.stints, async () => {
    const ev = await need(eventId);
    if (ev.clock) return;
    const clock = startClock(newClock(), now);
    const lineup = ev.lineup ?? {};
    await db.stints.bulkAdd(
      Object.entries(lineup).map(([positionId, playerId]) => ({
        id: newId(),
        eventId,
        teamId: ev.teamId,
        playerId,
        positionId,
        period: 0,
        start: 0
      }))
    );
    await db.events.update(eventId, { clock });
  });
}

async function setClock(eventId: string, f: (c: Clock) => Clock) {
  const ev = await need(eventId);
  if (ev.clock) await db.events.update(eventId, { clock: f(ev.clock) });
}

export const startTime = (eventId: string, now = Date.now()) => setClock(eventId, (c) => startClock(c, now));
export const pauseTime = (eventId: string, now = Date.now()) => setClock(eventId, (c) => pauseClock(c, now));

/** Ends the quarter / half. After the last one, everyone comes off and the game clock is finished. */
export async function endCurrentPeriod(eventId: string, periods: number, now = Date.now()) {
  await db.transaction('rw', db.events, db.stints, async () => {
    const ev = await need(eventId);
    if (!ev.clock || ev.clock.finished) return;
    const clock = endPeriod(ev.clock, now, periods);
    if (clock.finished) {
      const at = gameMs(clock, now);
      const open = (await stintsFor(eventId)).filter((s) => s.end === undefined);
      await db.stints.bulkPut(open.map((s) => ({ ...s, end: Math.max(s.start, at) })));
    }
    await db.events.update(eventId, { clock });
  });
}

/** Undo the last "End quarter" if it was tapped by mistake (only before the next one starts). */
export async function undoEndPeriod(eventId: string) {
  const ev = await need(eventId);
  const c = ev.clock;
  if (!c || !c.done.length || c.elapsed > 0 || c.runningSince !== null || c.finished) return;
  await db.events.update(eventId, { clock: { ...c, period: c.period - 1, elapsed: c.done[c.done.length - 1], done: c.done.slice(0, -1) } });
}

/** Puts `playerIn` (a bench player, or null for nobody) into a position, taking off whoever was there. */
export async function sub(eventId: string, positionId: string, playerIn: string | null, now = Date.now()) {
  await db.transaction('rw', db.events, db.stints, async () => {
    const ev = await need(eventId);
    if (!ev.clock || ev.clock.finished) {
      // Before kick-off a "sub" just edits the line-up.
      const lineup = { ...(ev.lineup ?? {}) };
      for (const k of Object.keys(lineup)) if (lineup[k] === playerIn) delete lineup[k];
      if (playerIn) lineup[positionId] = playerIn;
      else delete lineup[positionId];
      if (!ev.clock) await db.events.update(eventId, { lineup });
      return;
    }
    const stints = await stintsFor(eventId);
    const at = gameMs(ev.clock, now);
    await db.stints.bulkPut(substitute(stints, { positionId, playerIn, at, period: ev.clock.period, eventId, teamId: ev.teamId }, newId));
  });
}

/** Two on-field players swap positions. */
export async function swap(eventId: string, a: string, b: string, now = Date.now()) {
  await db.transaction('rw', db.events, db.stints, async () => {
    const ev = await need(eventId);
    if (!ev.clock || ev.clock.finished) return;
    const stints = await stintsFor(eventId);
    const at = gameMs(ev.clock, now);
    await db.stints.bulkPut(swapPositions(stints, { a, b, at, period: ev.clock.period, eventId, teamId: ev.teamId }, newId));
  });
}

export const setScore = (eventId: string, scoreFor: number, scoreAgainst: number) =>
  db.events.update(eventId, { scoreFor: Math.max(0, scoreFor), scoreAgainst: Math.max(0, scoreAgainst) });
