// Sport templates: how many play on the field, the positions (with a spot on the field drawing),
// the field shape and the usual junior game length. Coaches can override the numbers per team.
// Positions have a `role` (e.g. defence, midfield) so fair rotation can balance the kinds of
// positions a player gets, not just the exact spot. x/y are percentages across/down the drawing,
// with the team attacking towards the top.

export type FieldShape = 'pitch' | 'oval' | 'court' | 'netball' | 'cricket';

export interface Role {
  id: string;
  label: string;
}

export interface Position {
  id: string;
  label: string;
  short: string;
  role: string;
  x: number;
  y: number;
}

export interface Sport {
  id: string;
  name: string;
  field: FieldShape;
  /** Players on the field at once (the full-size game). */
  onField: number;
  /** Smaller junior formats: player count → which positions are used. */
  formats?: Record<number, string[]>;
  roles: Role[];
  positions: Position[];
  periods: number;
  periodName: string;
  /** Usual junior period length in minutes. */
  periodMinutes: number;
}

const p = (id: string, label: string, short: string, role: string, x: number, y: number): Position => ({ id, label, short, role, x, y });

export const SPORTS: Sport[] = [
  {
    id: 'afl',
    name: 'Australian rules football',
    field: 'oval',
    onField: 18,
    roles: [
      { id: 'back', label: 'Back' },
      { id: 'mid', label: 'Midfield' },
      { id: 'fwd', label: 'Forward' }
    ],
    positions: [
      p('ff', 'Full forward', 'FF', 'fwd', 50, 10),
      p('fpl', 'Forward pocket left', 'FPL', 'fwd', 25, 15),
      p('fpr', 'Forward pocket right', 'FPR', 'fwd', 75, 15),
      p('chf', 'Centre half-forward', 'CHF', 'fwd', 50, 27),
      p('hfl', 'Half-forward left', 'HFL', 'fwd', 20, 30),
      p('hfr', 'Half-forward right', 'HFR', 'fwd', 80, 30),
      p('ruck', 'Ruck', 'RK', 'mid', 50, 44),
      p('rov', 'Rover', 'RV', 'mid', 40, 52),
      p('rr', 'Ruck rover', 'RR', 'mid', 60, 52),
      p('c', 'Centre', 'C', 'mid', 50, 58),
      p('wl', 'Wing left', 'WL', 'mid', 12, 50),
      p('wr', 'Wing right', 'WR', 'mid', 88, 50),
      p('chb', 'Centre half-back', 'CHB', 'back', 50, 72),
      p('hbl', 'Half-back left', 'HBL', 'back', 20, 70),
      p('hbr', 'Half-back right', 'HBR', 'back', 80, 70),
      p('fb', 'Full back', 'FB', 'back', 50, 89),
      p('bpl', 'Back pocket left', 'BPL', 'back', 25, 85),
      p('bpr', 'Back pocket right', 'BPR', 'back', 75, 85)
    ],
    formats: {
      12: ['ff', 'fpl', 'fpr', 'chf', 'ruck', 'rov', 'c', 'rr', 'chb', 'fb', 'bpl', 'bpr'],
      15: ['ff', 'fpl', 'fpr', 'chf', 'hfl', 'hfr', 'ruck', 'rov', 'c', 'chb', 'hbl', 'hbr', 'fb', 'bpl', 'bpr']
    },
    periods: 4,
    periodName: 'Quarter',
    periodMinutes: 12
  },
  {
    id: 'soccer',
    name: 'Soccer',
    field: 'pitch',
    onField: 11,
    roles: [
      { id: 'gk', label: 'Goalkeeper' },
      { id: 'def', label: 'Defence' },
      { id: 'mid', label: 'Midfield' },
      { id: 'fwd', label: 'Attack' }
    ],
    positions: [
      p('st', 'Striker', 'ST', 'fwd', 50, 14),
      p('lw', 'Left wing', 'LW', 'fwd', 18, 22),
      p('rw', 'Right wing', 'RW', 'fwd', 82, 22),
      p('cm', 'Centre mid', 'CM', 'mid', 50, 44),
      p('lm', 'Left mid', 'LM', 'mid', 26, 48),
      p('rm', 'Right mid', 'RM', 'mid', 74, 48),
      p('lb', 'Left back', 'LB', 'def', 16, 72),
      p('lcb', 'Left centre back', 'LCB', 'def', 38, 76),
      p('rcb', 'Right centre back', 'RCB', 'def', 62, 76),
      p('rb', 'Right back', 'RB', 'def', 84, 72),
      p('gk', 'Goalkeeper', 'GK', 'gk', 50, 92)
    ],
    formats: {
      4: ['st', 'lm', 'rm', 'lcb'],
      5: ['st', 'lm', 'rm', 'lcb', 'gk'],
      7: ['st', 'lm', 'cm', 'rm', 'lcb', 'rcb', 'gk'],
      9: ['st', 'lw', 'rw', 'cm', 'lb', 'lcb', 'rcb', 'rb', 'gk']
    },
    periods: 2,
    periodName: 'Half',
    periodMinutes: 25
  },
  {
    id: 'netball',
    name: 'Netball',
    field: 'netball',
    onField: 7,
    roles: [
      { id: 'shoot', label: 'Shooting' },
      { id: 'centre', label: 'Centre court' },
      { id: 'defend', label: 'Defending' }
    ],
    positions: [
      p('gs', 'Goal shooter', 'GS', 'shoot', 50, 10),
      p('ga', 'Goal attack', 'GA', 'shoot', 35, 26),
      p('wa', 'Wing attack', 'WA', 'centre', 70, 38),
      p('c', 'Centre', 'C', 'centre', 50, 50),
      p('wd', 'Wing defence', 'WD', 'centre', 30, 62),
      p('gd', 'Goal defence', 'GD', 'defend', 65, 74),
      p('gk', 'Goal keeper', 'GK', 'defend', 50, 90)
    ],
    formats: { 5: ['gs', 'wa', 'c', 'wd', 'gk'] },
    periods: 4,
    periodName: 'Quarter',
    periodMinutes: 10
  },
  {
    id: 'basketball',
    name: 'Basketball',
    field: 'court',
    onField: 5,
    roles: [
      { id: 'guard', label: 'Guard' },
      { id: 'forward', label: 'Forward' },
      { id: 'centre', label: 'Centre' }
    ],
    positions: [
      p('pg', 'Point guard', 'PG', 'guard', 50, 70),
      p('sg', 'Shooting guard', 'SG', 'guard', 22, 58),
      p('sf', 'Small forward', 'SF', 'forward', 78, 58),
      p('pf', 'Power forward', 'PF', 'forward', 32, 30),
      p('ce', 'Centre', 'C', 'centre', 62, 22)
    ],
    formats: { 4: ['pg', 'sg', 'sf', 'ce'] },
    periods: 4,
    periodName: 'Quarter',
    periodMinutes: 8
  },
  {
    id: 'cricket',
    name: 'Cricket',
    field: 'cricket',
    onField: 11,
    roles: [
      { id: 'bowl', label: 'Bowling' },
      { id: 'keep', label: 'Keeping' },
      { id: 'close', label: 'Close field' },
      { id: 'deep', label: 'Deep field' }
    ],
    positions: [
      p('bowler', 'Bowler', 'BWL', 'bowl', 50, 62),
      p('wk', 'Wicket keeper', 'WK', 'keep', 50, 30),
      p('slip', 'Slip', 'SLP', 'close', 60, 27),
      p('point', 'Point', 'PT', 'close', 30, 42),
      p('cover', 'Cover', 'CV', 'close', 28, 55),
      p('midoff', 'Mid-off', 'MO', 'close', 40, 72),
      p('midon', 'Mid-on', 'MN', 'close', 60, 72),
      p('midwkt', 'Mid-wicket', 'MW', 'close', 74, 52),
      p('sqleg', 'Square leg', 'SQ', 'deep', 82, 40),
      p('fineleg', 'Fine leg', 'FL', 'deep', 72, 14),
      p('longon', 'Long-on', 'LO', 'deep', 64, 88)
    ],
    formats: { 8: ['bowler', 'wk', 'slip', 'point', 'cover', 'midoff', 'midon', 'sqleg'] },
    periods: 2,
    periodName: 'Innings',
    periodMinutes: 60
  },
  {
    id: 'hockey',
    name: 'Hockey',
    field: 'pitch',
    onField: 11,
    roles: [
      { id: 'gk', label: 'Goalkeeper' },
      { id: 'def', label: 'Defence' },
      { id: 'mid', label: 'Midfield' },
      { id: 'fwd', label: 'Attack' }
    ],
    positions: [
      p('cf', 'Centre forward', 'CF', 'fwd', 50, 14),
      p('lf', 'Left forward', 'LF', 'fwd', 22, 20),
      p('rf', 'Right forward', 'RF', 'fwd', 78, 20),
      p('lh', 'Left half', 'LH', 'mid', 22, 46),
      p('ch', 'Centre half', 'CH', 'mid', 50, 44),
      p('rh', 'Right half', 'RH', 'mid', 78, 46),
      p('ib', 'Inside back', 'IB', 'mid', 50, 60),
      p('lb', 'Left back', 'LB', 'def', 30, 74),
      p('rb', 'Right back', 'RB', 'def', 70, 74),
      p('sw', 'Sweeper', 'SW', 'def', 50, 80),
      p('gk', 'Goalkeeper', 'GK', 'gk', 50, 93)
    ],
    formats: {
      7: ['cf', 'lf', 'rf', 'ch', 'lb', 'rb', 'gk'],
      9: ['cf', 'lf', 'rf', 'lh', 'ch', 'rh', 'lb', 'rb', 'gk']
    },
    periods: 4,
    periodName: 'Quarter',
    periodMinutes: 12
  }
];

/** Settings a coach picks for a custom sport (or to override a template for one team). */
export interface SportOverrides {
  onField?: number;
  periods?: number;
  periodMinutes?: number;
}

export const CUSTOM_SPORT_ID = 'custom';

const periodNameFor = (n: number) => (n === 2 ? 'Half' : n === 3 ? 'Third' : n === 4 ? 'Quarter' : 'Period');
export const MAX_ON_FIELD = 20;

/** A generic sport made from the coach's numbers: positions P1…Pn spread over a plain field. */
export function customSport(onField = 6, periods = 2, periodMinutes = 20): Sport {
  const n = Math.max(1, Math.min(MAX_ON_FIELD, Math.round(onField)));
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const positions = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i % cols;
    return p(`p${i + 1}`, `Position ${i + 1}`, `P${i + 1}`, 'any', ((c + 1) / (inRow + 1)) * 100, ((r + 1) / (rows + 1)) * 100);
  });
  return {
    id: CUSTOM_SPORT_ID,
    name: 'Custom sport',
    field: 'pitch',
    onField: n,
    roles: [{ id: 'any', label: 'Any' }],
    positions,
    periods,
    periodName: periodNameFor(periods),
    periodMinutes
  };
}

export const sportById = (id: string): Sport | undefined => SPORTS.find((s) => s.id === id);

/** The sport as one team plays it: the template (or custom) with that team's own numbers applied. */
export function teamSport(sportId: string, o: SportOverrides = {}): Sport {
  const base = sportById(sportId);
  if (!base) return customSport(o.onField, o.periods, o.periodMinutes);
  const onField = Math.max(1, Math.min(base.positions.length, o.onField ?? base.onField));
  const ids = base.formats?.[onField] ?? base.positions.slice(0, onField).map((x) => x.id);
  return {
    ...base,
    onField,
    positions: ids.map((id) => base.positions.find((x) => x.id === id)!),
    periods: o.periods ?? base.periods,
    periodName: o.periods && o.periods !== base.periods ? periodNameFor(o.periods) : base.periodName,
    periodMinutes: o.periodMinutes ?? base.periodMinutes
  };
}

/** Player counts a team can choose for a sport (its junior formats plus the full game). */
export function onFieldChoices(sportId: string): number[] {
  const s = sportById(sportId);
  if (!s) return Array.from({ length: MAX_ON_FIELD }, (_, i) => i + 1);
  return [...new Set([...Object.keys(s.formats ?? {}).map(Number), s.onField])].sort((a, b) => a - b);
}
