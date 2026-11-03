// Round 1's coach-only ratings (kept for old data), drill use with its track record, and the season
// data loader used by the season view, the summary, Fair rotation and the team builder.

import { db, newId } from '../db';
import type { SeasonData } from '../logic/season';
import type { DrillUse, Rating, RatingValue } from '../types';

async function ratingFor(eventId: string, playerId: string): Promise<Rating> {
  const ev = await db.events.get(eventId);
  if (!ev) throw new Error('That session no longer exists.');
  const existing = (await db.ratings.where('eventId').equals(eventId).toArray()).find((r) => r.playerId === playerId);
  return existing ?? { id: newId(), eventId, teamId: ev.teamId, playerId, scores: {}, at: Date.now() };
}

/** One swipe: right = great (1), left = needs work (-1), up = skip (null clears the area). */
export async function rate(eventId: string, playerId: string, area: string, value: RatingValue | null) {
  const r = await ratingFor(eventId, playerId);
  const scores = { ...r.scores };
  if (value === null) delete scores[area];
  else scores[area] = value;
  await db.ratings.put({ ...r, scores, at: Date.now() });
}

export async function setRatingNote(eventId: string, playerId: string, note: string) {
  const r = await ratingFor(eventId, playerId);
  const trimmed = note.trim().slice(0, 200);
  await db.ratings.put({ ...r, note: trimmed || undefined, at: Date.now() });
}

export const ratingsFor = (eventId: string) => db.ratings.where('eventId').equals(eventId).toArray();

export async function addDrill(eventId: string, drillId: string): Promise<DrillUse | undefined> {
  const ev = await db.events.get(eventId);
  if (!ev) return;
  const already = (await db.drillUses.where('eventId').equals(eventId).toArray()).find((u) => u.drillId === drillId);
  if (already) return already;
  const use: DrillUse = { id: newId(), eventId, teamId: ev.teamId, drillId, at: Date.now() };
  await db.drillUses.add(use);
  return use;
}

export const setDrillResult = (useId: string, result: DrillUse['result']) => db.drillUses.update(useId, { result });
export const removeDrill = (useId: string) => db.drillUses.delete(useId);
export const drillsUsedIn = (eventId: string) => db.drillUses.where('eventId').equals(eventId).toArray();
export const drillUsesForTeam = (teamId: string) => db.drillUses.where('teamId').equals(teamId).toArray();

/** Everything the season view needs for one team. Inactive players are included (their history counts). */
export async function loadSeason(teamId: string): Promise<SeasonData> {
  const [players, events, attendance, stints, ratings, checks] = await Promise.all([
    db.players.where('teamId').equals(teamId).toArray(),
    db.events.where('teamId').equals(teamId).toArray(),
    db.attendance.where('teamId').equals(teamId).toArray(),
    db.stints.where('teamId').equals(teamId).toArray(),
    db.ratings.where('teamId').equals(teamId).toArray(),
    db.checks.where('teamId').equals(teamId).toArray()
  ]);
  players.sort((a, b) => a.firstName.localeCompare(b.firstName));
  return { players, events, attendance, stints, ratings, checks };
}
