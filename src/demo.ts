// Fictional demo data: an under-11 soccer team of 12 players (9 a side, two 25-minute halves) with
// 4 trainings and 3 games already played (one a friendly), including minutes, ratings and
// attendance. Names are made up. Seeded, so it comes out the same every time.

import { db, newId, saveSettings } from './db';
import { RATING_AREAS } from './config/coaching';
import { drillsFor } from './logic/drills';
import { fairRotation, type PlayerHistory } from './logic/lineup';
import { seeded } from './logic/random';
import { today } from './lib/format';
import { sportOf } from './services/teams';
import type { Attendance, DrillUse, Player, Rating, Stint, Team, TeamEvent } from './types';

export const DEMO_TEAM_NAME = 'Riverside Rockets';

const SQUAD: [string, string, number, string[]][] = [
  ['Sam', 'K', 1, ['gk']],
  ['Mia', 'T', 4, ['lcb', 'rcb']],
  ['Noah', 'P', 5, ['lb', 'rb']],
  ['Ava', 'L', 7, ['rw', 'st']],
  ['Leo', 'M', 8, ['cm']],
  ['Isla', 'R', 9, ['st']],
  ['Jack', 'D', 10, ['cm', 'lw']],
  ['Zara', 'H', 11, ['lw', 'rw']],
  ['Oliver', 'B', 12, ['rcb', 'gk']],
  ['Ruby', 'S', 14, ['rb', 'cm']],
  ['Hamish', 'C', 15, ['lcb']],
  ['Priya', 'N', 17, ['rw', 'cm']]
];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return today(d);
};
const at = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();

export async function loadDemoData(): Promise<Team> {
  const rnd = seeded(2027);
  const team: Team = {
    id: newId(),
    kind: 'team',
    name: DEMO_TEAM_NAME,
    sportId: 'soccer',
    overrides: { onField: 9 },
    season: 'Winter 2027',
    ageGroup: 'U11',
    createdAt: Date.now() - 30 * 86400000
  };
  const sport = sportOf(team);
  const players: Player[] = SQUAD.map(([firstName, lastInitial, jersey, positions], i) => ({
    id: newId(),
    teamId: team.id,
    firstName,
    lastInitial,
    jersey,
    positions,
    active: true,
    createdAt: team.createdAt + i
  }));
  const pid = (name: string) => players.find((p) => p.firstName === name)!.id;
  const events: TeamEvent[] = [];
  const attendance: Attendance[] = [];
  const stints: Stint[] = [];
  const ratings: Rating[] = [];
  const drillUses: DrillUse[] = [];
  const history = new Map<string, PlayerHistory>(players.map((p) => [p.id, { totalMs: 0, byRole: new Map() }]));
  const roleOf = (pos: string) => sport.positions.find((x) => x.id === pos)!.role;

  // Week by week, oldest first: training (Tue), game (Sat). Four trainings and three games.
  const plan: { kind: 'training' | 'game'; ago: number; away?: string[]; late?: string[]; game?: Partial<TeamEvent> }[] = [
    { kind: 'training', ago: 25, away: ['Priya'] },
    {
      kind: 'game',
      ago: 21,
      away: ['Ruby'],
      game: { opponent: 'Northside Kestrels', venue: 'home', gameType: 'friendly', scoreFor: 2, scoreAgainst: 2 }
    },
    { kind: 'training', ago: 18, late: ['Noah'] },
    { kind: 'game', ago: 14, game: { opponent: 'Eastbrook United', venue: 'away', gameType: 'competition', scoreFor: 1, scoreAgainst: 3 } },
    { kind: 'training', ago: 11, away: ['Hamish', 'Ava'] },
    {
      kind: 'game',
      ago: 7,
      late: ['Ava'],
      away: ['Hamish'],
      game: { opponent: 'Hillcrest Rovers', venue: 'home', gameType: 'competition', scoreFor: 4, scoreAgainst: 1 }
    },
    { kind: 'training', ago: 4 }
  ];
  const trainingDrills = drillsFor('soccer', 'U11');

  for (const [n, w] of plan.entries()) {
    const date = daysAgo(w.ago);
    const ev: TeamEvent = {
      id: newId(),
      teamId: team.id,
      kind: w.kind,
      date,
      openedAt: at(date, w.kind === 'game' ? 9 : 17),
      ...(w.game ?? {})
    };
    ev.closedAt = ev.openedAt + (w.kind === 'game' ? 75 : 60) * 60000;
    const away = new Set((w.away ?? []).map(pid));
    const late = new Set((w.late ?? []).map(pid));
    for (const p of players)
      attendance.push({
        id: newId(),
        eventId: ev.id,
        teamId: team.id,
        playerId: p.id,
        status: away.has(p.id) ? 'away' : late.has(p.id) ? 'late' : 'here'
      });
    const present = players.filter((p) => !away.has(p.id));

    if (w.kind === 'game') {
      // Four blocks of 12.5 minutes (subs at half-time and halfway through each half).
      const block = 12.5 * 60000;
      const done = [2 * block, 2 * block];
      for (let b = 0; b < 4; b++) {
        // A late arrival misses the first block.
        const avail = present.filter((p) => !(b === 0 && late.has(p.id)));
        const lineup = fairRotation({
          players: avail.map((p) => ({ id: p.id, preferred: p.positions })),
          slots: sport.positions,
          history,
          rnd,
          jitter: 0.05
        });
        if (b === 0) ev.lineup = lineup;
        for (const [positionId, playerId] of Object.entries(lineup)) {
          stints.push({
            id: newId(),
            eventId: ev.id,
            teamId: team.id,
            playerId,
            positionId,
            period: b < 2 ? 0 : 1,
            start: b * block,
            end: (b + 1) * block
          });
          const h = history.get(playerId)!;
          h.totalMs += block;
          h.byRole.set(roleOf(positionId), (h.byRole.get(roleOf(positionId)) ?? 0) + block);
        }
      }
      ev.clock = { period: 2, done, elapsed: 0, runningSince: null, finished: true };
    } else {
      const picks = [
        trainingDrills[(n * 3) % trainingDrills.length],
        trainingDrills[(n * 3 + 1) % trainingDrills.length],
        trainingDrills[(n * 3 + 2) % trainingDrills.length]
      ];
      ev.drillIds = picks.map((d) => d.id);
      for (const d of picks)
        drillUses.push({
          id: newId(),
          eventId: ev.id,
          teamId: team.id,
          drillId: d.id,
          at: ev.closedAt,
          result: rnd() < 0.7 ? 'worked' : rnd() < 0.6 ? 'didnt' : undefined
        });
    }

    // Ratings for most players who came (a coach rarely gets to everyone).
    for (const p of present) {
      if (rnd() < 0.2) continue;
      const scores: Rating['scores'] = {};
      for (const a of RATING_AREAS) {
        const r = rnd();
        if (r < 0.15) continue; // skipped
        scores[a.id] = r < 0.65 ? 1 : -1;
      }
      const note =
        p.firstName === 'Noah' && n === 3
          ? 'Great talk to the back line'
          : p.firstName === 'Zara' && n === 4
            ? 'Work on left foot passing'
            : undefined;
      ratings.push({ id: newId(), eventId: ev.id, teamId: team.id, playerId: p.id, scores, note, at: ev.closedAt });
    }
    events.push(ev);
  }

  await db.transaction(
    'rw',
    [db.teams, db.players, db.events, db.attendance, db.stints, db.ratings, db.drillUses, db.settings],
    async () => {
      await db.teams.add(team);
      await db.players.bulkAdd(players);
      await db.events.bulkAdd(events);
      await db.attendance.bulkAdd(attendance);
      await db.stints.bulkAdd(stints);
      await db.ratings.bulkAdd(ratings);
      await db.drillUses.bulkAdd(drillUses);
      await saveSettings({ lastTeamId: team.id, coachName: 'Demo coach' });
    }
  );
  return team;
}
