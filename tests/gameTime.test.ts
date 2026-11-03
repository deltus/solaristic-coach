// Game clock, subs and minutes: the heart of fair game time. Fictional ids only.
import { describe, expect, it } from 'vitest';
import {
  endPeriod,
  fairShareMs,
  gameMs,
  minutesByPlayer,
  newClock,
  onFieldNow,
  pauseClock,
  periodElapsed,
  startClock,
  substitute,
  suggestSubs,
  swapPositions,
  totalPlayerMs
} from '../src/logic/gameTime';
import type { Stint } from '../src/types';

const MIN = 60000;
let n = 0;
const id = () => `s${++n}`;
const base = { eventId: 'e', teamId: 't' };
const open = (playerId: string, positionId: string, start = 0): Stint => ({ id: id(), ...base, playerId, positionId, period: 0, start });

/** Applies saved stints the way Dexie bulkPut would (replace by id, add new). */
function apply(all: Stint[], changed: Stint[]): Stint[] {
  const m = new Map(all.map((s) => [s.id, s]));
  for (const c of changed) m.set(c.id, c);
  return [...m.values()];
}

describe('clock', () => {
  it('only counts time while running, and carries finished periods', () => {
    let c = startClock(newClock(), 1000);
    expect(periodElapsed(c, 1000 + 5 * MIN)).toBe(5 * MIN);
    c = pauseClock(c, 1000 + 5 * MIN);
    // A two-minute stoppage doesn't count.
    c = startClock(c, 1000 + 7 * MIN);
    expect(gameMs(c, 1000 + 10 * MIN)).toBe(8 * MIN);
    c = endPeriod(c, 1000 + 10 * MIN, 2);
    expect(c.period).toBe(1);
    expect(c.done).toEqual([8 * MIN]);
    expect(c.runningSince).toBeNull();
    c = startClock(c, 50 * MIN);
    expect(gameMs(c, 52 * MIN)).toBe(10 * MIN);
    c = endPeriod(c, 60 * MIN, 2);
    expect(c.finished).toBe(true);
    expect(gameMs(c, 99 * MIN)).toBe(18 * MIN);
    expect(startClock(c, 100 * MIN)).toBe(c);
  });
});

describe('subs and minutes', () => {
  it('minutes add up to game time × players on the field', () => {
    let stints = [open('ann', 'a'), open('bo', 'b')];
    stints = apply(stints, substitute(stints, { positionId: 'a', playerIn: 'cy', at: 10 * MIN, period: 0, ...base }, id));
    stints = apply(stints, substitute(stints, { positionId: 'b', playerIn: 'ann', at: 15 * MIN, period: 0, ...base }, id));
    const now = 40 * MIN;
    const m = minutesByPlayer(stints, now);
    expect(m.get('ann')).toBe(10 * MIN + 25 * MIN);
    expect(m.get('bo')).toBe(15 * MIN);
    expect(m.get('cy')).toBe(30 * MIN);
    expect(totalPlayerMs(stints, now)).toBe(2 * now);
    expect([...onFieldNow(stints).entries()].sort()).toEqual([
      ['a', 'cy'],
      ['b', 'ann']
    ]);
  });

  it('a player subbed into a new position leaves their old one', () => {
    let stints = [open('ann', 'a'), open('bo', 'b')];
    stints = apply(stints, substitute(stints, { positionId: 'b', playerIn: 'ann', at: 5 * MIN, period: 0, ...base }, id));
    const field = onFieldNow(stints);
    expect(field.get('b')).toBe('ann');
    expect(field.has('a')).toBe(false);
  });

  it('swapping positions keeps both players on', () => {
    let stints = [open('ann', 'a'), open('bo', 'b')];
    stints = apply(stints, swapPositions(stints, { a: 'a', b: 'b', at: 5 * MIN, period: 0, ...base }, id));
    expect(onFieldNow(stints).get('a')).toBe('bo');
    expect(minutesByPlayer(stints, 10 * MIN).get('ann')).toBe(10 * MIN);
  });
});

describe('suggestions', () => {
  it('suggests the bench player with the least time for the player with the most', () => {
    const stints = [open('ann', 'a'), open('bo', 'b', 4 * MIN)];
    const s = suggestSubs({ stints, now: 10 * MIN, available: ['ann', 'bo', 'cy'] });
    expect(s[0]).toMatchObject({ on: 'cy', off: 'ann', positionId: 'a' });
  });
  it('waits until the gap is worth a sub', () => {
    const stints = [open('ann', 'a')];
    expect(suggestSubs({ stints, now: 1 * MIN, available: ['ann', 'cy'] })).toEqual([]);
  });
  it('uses season minutes only to break ties', () => {
    const stints = [open('ann', 'a')];
    const season = new Map([
      ['cy', 50 * MIN],
      ['di', 10 * MIN]
    ]);
    expect(suggestSubs({ stints, now: 10 * MIN, available: ['ann', 'cy', 'di'], season })[0].on).toBe('di');
  });
  it('fair share is game time × spots ÷ players', () => {
    expect(fairShareMs(40 * MIN, 9, 12)).toBe(30 * MIN);
    expect(fairShareMs(40 * MIN, 9, 7)).toBe(40 * MIN);
  });
});
