// Fictional demo data: an under-11 soccer team of 12 players (9 a side, two 25-minute halves) with
// five weeks played: 5 trainings (each with a focus) and 4 games (one a friendly), including the
// roll with absence reasons, minutes and positions, and a post-session check for every player who
// came. Names are made up. Seeded, so it comes out the same every time.

import { db, newId, saveSettings } from './db';
import { drillsFor } from './logic/drills';
import { fairRotation, type PlayerHistory } from './logic/lineup';
import { seeded } from './logic/random';
import { today } from './lib/format';
import { sportOf } from './services/teams';
import type { AbsentReason, Attendance, Check, DrillUse, Player, Stint, Team, TeamEvent } from './types';

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
    createdAt: Date.now() - 40 * 86400000
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
  const checks: Check[] = [];
  const drillUses: DrillUse[] = [];
  const history = new Map<string, PlayerHistory>(players.map((p) => [p.id, { totalMs: 0, byRole: new Map() }]));
  const roleOf = (pos: string) => sport.positions.find((x) => x.id === pos)!.role;

  // Five weeks, oldest first: a training then a game each week. Five trainings and four games.
  // Absences have reasons; a few players have patterns the coach should notice later
  // (Jack's rough play, Zara left out, Mia's attendance dropping, Oliver's knock).
  type Week = {
    kind: 'training' | 'game';
    ago: number;
    focus?: string;
    absent?: [string, AbsentReason][];
    late?: string[];
    game?: Partial<TeamEvent>;
  };
  const plan: Week[] = [
    { kind: 'training', ago: 32, focus: 'passing', absent: [['Priya', 'away']] },
    {
      kind: 'game',
      ago: 28,
      absent: [['Ruby', 'sick']],
      game: { opponent: 'Northside Kestrels', venue: 'home', gameType: 'friendly', scoreFor: 2, scoreAgainst: 2 }
    },
    { kind: 'training', ago: 25, focus: 'first-touch', late: ['Noah'] },
    { kind: 'game', ago: 21, game: { opponent: 'Eastbrook United', venue: 'away', gameType: 'competition', scoreFor: 1, scoreAgainst: 3 } },
    {
      kind: 'training',
      ago: 18,
      focus: 'dribbling',
      absent: [
        ['Hamish', 'away'],
        ['Ava', 'sick']
      ]
    },
    {
      kind: 'game',
      ago: 14,
      late: ['Ava'],
      absent: [['Hamish', 'noshow']],
      game: { opponent: 'Hillcrest Rovers', venue: 'home', gameType: 'competition', scoreFor: 4, scoreAgainst: 1 }
    },
    {
      kind: 'training',
      ago: 11,
      focus: 'shooting',
      absent: [
        ['Mia', 'sick'],
        ['Oliver', 'injured']
      ]
    },
    {
      kind: 'game',
      ago: 7,
      absent: [
        ['Mia', 'away'],
        ['Oliver', 'injured']
      ],
      game: { opponent: 'Westgate Wanderers', venue: 'away', gameType: 'competition', scoreFor: 3, scoreAgainst: 3 }
    },
    { kind: 'training', ago: 4, focus: 'defending', absent: [['Mia', 'noshow']] }
  ];

  // What the coach noted (by session number above). Everyone else is mostly "all good".
  type Note = { v?: 'star' | 'note'; chips?: string[]; with?: string; logged?: true };
  const NOTES: Record<number, Record<string, Note>> = {
    0: { Isla: { chips: ['nailed-drill'] }, Hamish: { chips: ['struggled-drill'] } },
    1: { Noah: { v: 'star' } },
    2: { Jack: { chips: ['mucking-around'] }, Hamish: { chips: ['low-energy'] }, Priya: { chips: ['helped'] } },
    3: { Zara: { chips: ['left-out'] }, Noah: { chips: ['helped'] }, Sam: { v: 'star' } },
    4: {
      Jack: { chips: ['rough-play', 'conflict'], with: 'Leo' },
      Leo: { chips: ['conflict'], with: 'Jack' },
      Isla: { chips: ['standout-effort', 'nailed-drill'] }
    },
    5: {
      Jack: { chips: ['rough-play'] },
      Zara: { chips: ['left-out', 'upset'] },
      Noah: { v: 'star' },
      Oliver: { chips: ['knock'], logged: true }
    },
    6: { Isla: { v: 'star', chips: ['nailed-drill'] }, Priya: { chips: ['mucking-around'] } },
    7: { Jack: { chips: ['rough-play'] }, Noah: { v: 'star' } },
    8: { Jack: { chips: ['argued'] }, Zara: { chips: ['left-out'] }, Hamish: { chips: ['struggled-drill', 'switched-off'] } }
  };
  const MILD_TRAINING = ['helped', 'nailed-drill', 'struggled-drill', 'low-energy'];
  const MILD_GAME = ['helped', 'standout-effort', 'low-energy'];
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
    if (w.focus) ev.focus = w.focus;
    const absent = new Map((w.absent ?? []).map(([name, reason]) => [pid(name), reason]));
    const late = new Set((w.late ?? []).map(pid));
    for (const p of players) {
      const reason = absent.get(p.id);
      attendance.push({
        id: newId(),
        eventId: ev.id,
        teamId: team.id,
        playerId: p.id,
        ...(reason ? { status: 'absent' as const, reason } : { status: late.has(p.id) ? ('late' as const) : ('here' as const) })
      });
    }
    const away = new Set(absent.keys());
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

    // The post-session check: every player who came gets one.
    for (const p of present) {
      const scripted = NOTES[n]?.[p.firstName];
      let verdict: Check['verdict'] = 'good';
      let chips: string[] = [];
      if (scripted) {
        chips = scripted.chips ?? [];
        verdict = scripted.v ?? (chips.length ? 'note' : 'good');
      } else {
        const r = rnd();
        if (r < 0.07) verdict = 'star';
        else if (r < 0.17) {
          const mild = w.kind === 'game' ? MILD_GAME : MILD_TRAINING;
          chips = [mild[Math.floor(rnd() * mild.length)]];
          verdict = 'note';
        }
      }
      checks.push({
        id: newId(),
        eventId: ev.id,
        teamId: team.id,
        playerId: p.id,
        verdict,
        chips,
        conflictWith: scripted?.with ? [pid(scripted.with)] : undefined,
        logged: scripted?.logged,
        at: ev.closedAt + 60000
      });
    }
    events.push(ev);
  }

  await db.transaction(
    'rw',
    [db.teams, db.players, db.events, db.attendance, db.stints, db.checks, db.drillUses, db.settings],
    async () => {
      await db.teams.add(team);
      await db.players.bulkAdd(players);
      await db.events.bulkAdd(events);
      await db.attendance.bulkAdd(attendance);
      await db.stints.bulkAdd(stints);
      await db.checks.bulkAdd(checks);
      await db.drillUses.bulkAdd(drillUses);
      await saveSettings({ lastTeamId: team.id, coachName: 'Demo coach' });
    }
  );
  return team;
}
