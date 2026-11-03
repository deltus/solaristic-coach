// Teams and players: create, edit, list, delete. Player names are cleaned to first name + last initial.

import { db, newId, saveSettings } from '../db';
import { teamSport, type Sport } from '../config/sports';
import { cleanName } from '../lib/format';
import type { Player, Team } from '../types';

export type TeamInput = Pick<Team, 'name' | 'sportId' | 'season' | 'ageGroup' | 'overrides'>;

export async function createTeam(input: TeamInput): Promise<Team> {
  const team: Team = { id: newId(), kind: 'team', createdAt: Date.now(), ...input, name: input.name.trim() };
  await db.teams.add(team);
  await saveSettings({ lastTeamId: team.id });
  return team;
}

export const updateTeam = (id: string, patch: Partial<TeamInput>) => db.teams.update(id, patch);

export const getTeam = (id: string) => db.teams.get(id);

export async function listTeams(): Promise<Team[]> {
  return (await db.teams.orderBy('createdAt').toArray()).filter((t) => !t.archived);
}

export const sportOf = (team: Pick<Team, 'sportId' | 'overrides'>): Sport => teamSport(team.sportId, team.overrides);

/** Deletes a team and everything recorded for it. */
export async function deleteTeam(id: string) {
  const tables = [db.players, db.events, db.attendance, db.stints, db.ratings, db.drillUses, db.checks, db.voiceNotes];
  await db.transaction('rw', [db.teams, ...tables], async () => {
    for (const t of tables) await t.where('teamId').equals(id).delete();
    await db.teams.delete(id);
  });
}

export interface PlayerInput {
  firstName: string;
  lastName: string;
  jersey?: number;
  positions: string[];
}

export async function addPlayer(teamId: string, input: PlayerInput): Promise<Player> {
  const name = cleanName(input.firstName, input.lastName);
  if (!name.firstName) throw new Error('Add a first name.');
  const player: Player = {
    id: newId(),
    teamId,
    ...name,
    jersey: input.jersey,
    positions: input.positions,
    active: true,
    createdAt: Date.now()
  };
  await db.players.add(player);
  return player;
}

export async function updatePlayer(id: string, input: PlayerInput) {
  const name = cleanName(input.firstName, input.lastName);
  if (!name.firstName) throw new Error('Add a first name.');
  await db.players.update(id, { ...name, jersey: input.jersey, positions: input.positions });
}

/** Players with history are kept (inactive) so the season numbers still add up; others are deleted. */
export async function removePlayer(id: string) {
  const p = await db.players.get(id);
  if (!p) return;
  const attended = await db.attendance
    .where('teamId')
    .equals(p.teamId)
    .filter((a) => a.playerId === id)
    .count();
  const used =
    attended ||
    (await db.stints.where('playerId').equals(id).count()) ||
    (await db.ratings.where('playerId').equals(id).count()) ||
    (await db.checks.where('playerId').equals(id).count());
  if (used) await db.players.update(id, { active: false });
  else await db.players.delete(id);
}

export const restorePlayer = (id: string) => db.players.update(id, { active: true });

export async function listPlayers(teamId: string, includeInactive = false): Promise<Player[]> {
  const all = await db.players.where('teamId').equals(teamId).toArray();
  return all.filter((p) => includeInactive || p.active).sort((a, b) => a.firstName.localeCompare(b.firstName));
}
