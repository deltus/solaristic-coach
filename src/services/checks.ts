// The post-session check and "Log now": one Check per player per session, plus an optional voice
// note. Coach only. The rules for combining swipes and logged chips are in src/logic/checks.ts.

import { db, newId } from '../db';
import { addLogged, combineCheck, type CheckInput } from '../logic/checks';
import type { Check, VoiceNote } from '../types';

async function eventTeam(eventId: string): Promise<string> {
  const ev = await db.events.get(eventId);
  if (!ev) throw new Error('That session no longer exists.');
  return ev.teamId;
}

const existingCheck = (eventId: string, playerId: string) => db.checks.where('[eventId+playerId]').equals([eventId, playerId]).first();

async function put(eventId: string, playerId: string, next: (old: Check | undefined) => ReturnType<typeof combineCheck>) {
  const teamId = await eventTeam(eventId);
  await db.transaction('rw', db.checks, async () => {
    const old = await existingCheck(eventId, playerId);
    await db.checks.put({ id: old?.id ?? newId(), eventId, teamId, playerId, ...next(old), at: Date.now() });
  });
}

/** A swipe (all good / star) or a finished note. */
export const saveCheck = (eventId: string, playerId: string, input: CheckInput) =>
  put(eventId, playerId, (old) => combineCheck(old, input));

/** "Log now" during a session: adds chips to that player's check (never removes any). */
export const logIncident = (eventId: string, playerId: string, chips: string[], conflictWith: string[] = []) =>
  put(eventId, playerId, (old) => addLogged(old, chips, conflictWith));

/** Undo: forgets this session's check for one player (a voice note stays until deleted). */
export async function clearCheck(eventId: string, playerId: string) {
  const old = await existingCheck(eventId, playerId);
  if (old) await db.checks.delete(old.id);
}

export const checksFor = (eventId: string) => db.checks.where('eventId').equals(eventId).toArray();

/** One voice note per player per session; recording again replaces it. */
export async function saveVoiceNote(eventId: string, playerId: string, data: ArrayBuffer, mime: string, ms: number): Promise<VoiceNote> {
  const teamId = await eventTeam(eventId);
  const note: VoiceNote = { id: newId(), eventId, teamId, playerId, data, mime, ms, at: Date.now() };
  await db.transaction('rw', db.voiceNotes, async () => {
    const old = (await db.voiceNotes.where('eventId').equals(eventId).toArray()).filter((v) => v.playerId === playerId);
    await db.voiceNotes.bulkDelete(old.map((v) => v.id));
    await db.voiceNotes.add(note);
  });
  return note;
}

export const voiceNotesFor = (eventId: string) => db.voiceNotes.where('eventId').equals(eventId).toArray();
export const deleteVoiceNote = (id: string) => db.voiceNotes.delete(id);
