// The drills library: warm-ups, skills drills and games, by sport and age band. Edit freely.
// `sports: 'all'` works for any team sport. Descriptions are short on purpose: read at the ground.

import type { AgeBand } from './coaching';

export type DrillKind = 'warm-up' | 'skills' | 'game';

export interface Drill {
  id: string;
  name: string;
  kind: DrillKind;
  sports: 'all' | string[];
  ages: AgeBand[];
  minutes: number;
  /** What you need. */
  setup: string;
  how: string;
}

const ALL: AgeBand[] = ['U6-U8', 'U9-U12', 'U13+'];
const YOUNG: AgeBand[] = ['U6-U8', 'U9-U12'];
const OLDER: AgeBand[] = ['U9-U12', 'U13+'];

export const DRILL_KINDS: { id: DrillKind; label: string }[] = [
  { id: 'warm-up', label: 'Warm-ups' },
  { id: 'skills', label: 'Skills' },
  { id: 'game', label: 'Games' }
];

export const DRILLS: Drill[] = [
  // Warm-ups for any sport
  {
    id: 'traffic-lights',
    name: 'Traffic lights',
    kind: 'warm-up',
    sports: 'all',
    ages: YOUNG,
    minutes: 5,
    setup: 'A marked square.',
    how: 'Players jog around. Green = run, amber = walk, red = freeze. Add "roundabout" (spin) and "speed hump" (jump).'
  },
  {
    id: 'dynamic-lines',
    name: 'Dynamic lines',
    kind: 'warm-up',
    sports: 'all',
    ages: OLDER,
    minutes: 8,
    setup: 'Two cones 20 m apart.',
    how: 'Up and back: high knees, heel flicks, side steps, carioca, lunges, then two run-throughs at 70% and 90%.'
  },
  {
    id: 'tag-tails',
    name: 'Tails tag',
    kind: 'warm-up',
    sports: 'all',
    ages: YOUNG,
    minutes: 6,
    setup: 'A bib tucked in each waistband.',
    how: 'Grab as many tails as you can while keeping your own. Anyone without a tail keeps playing and tries to win one back.'
  },
  {
    id: 'mirror',
    name: 'Mirror me',
    kind: 'warm-up',
    sports: 'all',
    ages: ALL,
    minutes: 4,
    setup: 'Pairs facing each other.',
    how: 'One leads with side steps, drops and jumps; the partner mirrors. Swap every 30 seconds.'
  },
  {
    id: 'ball-tag',
    name: 'Ball tag',
    kind: 'warm-up',
    sports: 'all',
    ages: ALL,
    minutes: 6,
    setup: 'Square, 2–3 balls.',
    how: 'Taggers can only tag while holding a ball and must pass to move it around. Swap taggers each minute.'
  },
  // Games for any sport
  {
    id: 'end-zone',
    name: 'End zone',
    kind: 'game',
    sports: 'all',
    ages: ALL,
    minutes: 12,
    setup: 'Rectangle with a zone at each end, bibs.',
    how: 'Score by catching or controlling the ball in the end zone. No running with it in hand for older groups.'
  },
  {
    id: 'numbers-game',
    name: 'Numbers game',
    kind: 'game',
    sports: 'all',
    ages: ALL,
    minutes: 10,
    setup: 'Two teams numbered off at each end.',
    how: 'Call numbers (1, 2 or 3 at once). Those players race on to play a quick contest. Mix up the numbers so everyone gets a go.'
  },
  {
    id: 'keepings-off',
    name: 'Keepings off',
    kind: 'game',
    sports: 'all',
    ages: ALL,
    minutes: 8,
    setup: 'Square, bibs, one ball.',
    how: 'Team in possession counts passes out loud. Five in a row = a point. Add a neutral player who always attacks for younger groups.'
  },
  // Soccer
  {
    id: 'gates',
    name: 'Dribble the gates',
    kind: 'skills',
    sports: ['soccer', 'futsal', 'hockey'],
    ages: YOUNG,
    minutes: 8,
    setup: 'Lots of cone gates, a ball each.',
    how: 'Dribble through as many gates as you can in 60 seconds. Then left foot only, then a partner tries to steal.'
  },
  {
    id: 'rondo',
    name: 'Rondo 4v1',
    kind: 'skills',
    sports: ['soccer', 'futsal', 'hockey'],
    ages: OLDER,
    minutes: 10,
    setup: 'Square 8 × 8 m.',
    how: 'Four on the outside keep the ball from one in the middle. Defender wins it = swap with the player who lost it.'
  },
  {
    id: 'sharks-minnows',
    name: 'Sharks and minnows',
    kind: 'game',
    sports: ['soccer', 'futsal', 'hockey', 'basketball'],
    ages: YOUNG,
    minutes: 8,
    setup: 'A ball each for minnows.',
    how: 'Minnows dribble from one end to the other; sharks knock balls out. Lose your ball and you become a shark.'
  },
  {
    id: 'first-touch',
    name: 'First touch pairs',
    kind: 'skills',
    sports: ['soccer', 'futsal'],
    ages: OLDER,
    minutes: 8,
    setup: 'Pairs 10 m apart.',
    how: 'Receive across your body, out of your feet, then pass back. Count clean first touches out of ten.'
  },
  {
    id: 'small-sided',
    name: '4v4 to small goals',
    kind: 'game',
    sports: ['soccer', 'futsal', 'hockey'],
    ages: ALL,
    minutes: 15,
    setup: 'Four small goals, bibs.',
    how: 'Two goals each to attack. No keepers. Rotate teams every three minutes so everyone plays each team.'
  },
  // Australian rules football
  {
    id: 'handball-circle',
    name: 'Handball circle',
    kind: 'skills',
    sports: ['afl'],
    ages: ALL,
    minutes: 6,
    setup: 'Circle of 6–8, one ball.',
    how: 'Call a name, handball to them, follow your ball. Add a second ball when it flows.'
  },
  {
    id: 'kick-lines',
    name: 'Kick to the leader',
    kind: 'skills',
    sports: ['afl'],
    ages: OLDER,
    minutes: 10,
    setup: 'Two lines 20 m apart.',
    how: 'Lead out on an angle, call for it, mark on the chest. Kicker follows to the back of the other line.'
  },
  {
    id: 'ground-balls',
    name: 'Ground ball pick-ups',
    kind: 'skills',
    sports: ['afl'],
    ages: YOUNG,
    minutes: 6,
    setup: 'Balls spread on the ground.',
    how: 'Run through, bend low, one hand behind, the other in front. Pick up and handball to the coach.'
  },
  {
    id: 'kick-tennis',
    name: 'Kick tennis',
    kind: 'game',
    sports: ['afl', 'soccer'],
    ages: OLDER,
    minutes: 10,
    setup: 'A line of cones as the net.',
    how: 'Kick over the net into the other side. A mark or a controlled trap keeps the rally going.'
  },
  // Netball
  {
    id: 'netball-pivot',
    name: 'Land and pivot',
    kind: 'skills',
    sports: ['netball'],
    ages: YOUNG,
    minutes: 6,
    setup: 'Pairs, one ball.',
    how: 'Catch, land on one foot, pivot to face your partner, pass. Count clean landings.'
  },
  {
    id: 'netball-dodge',
    name: 'Dodge and drive',
    kind: 'skills',
    sports: ['netball', 'basketball'],
    ages: OLDER,
    minutes: 8,
    setup: 'Threes: feeder, worker, defender.',
    how: 'Worker dodges one way, drives the other to receive. Defender goes 50% then 100%.'
  },
  {
    id: 'netball-shoot',
    name: 'Around the world',
    kind: 'skills',
    sports: ['netball'],
    ages: ALL,
    minutes: 8,
    setup: 'Five spots around the circle.',
    how: 'Shoot from each spot; move on when you score. Shooters rotate every round so everyone tries.'
  },
  // Basketball
  {
    id: 'dribble-knock',
    name: 'Dribble knockout',
    kind: 'game',
    sports: ['basketball'],
    ages: ALL,
    minutes: 6,
    setup: 'A ball each, inside the key or half court.',
    how: 'Keep dribbling and knock others’ balls away. Knocked out? Do five dribble moves on the side and come back in.'
  },
  {
    id: 'layup-lines',
    name: 'Lay-up lines',
    kind: 'skills',
    sports: ['basketball'],
    ages: OLDER,
    minutes: 10,
    setup: 'Two lines at the elbows.',
    how: 'Right-hand lay-ups from the right side, rebounder passes out. Switch to the left side after a minute.'
  },
  // Cricket
  {
    id: 'catching-pairs',
    name: 'Catching pairs',
    kind: 'skills',
    sports: ['cricket'],
    ages: ALL,
    minutes: 8,
    setup: 'Pairs, tennis balls.',
    how: 'Soft hands, fingers up above the chest, down below. Ten in a row, then take a step back.'
  },
  {
    id: 'target-bowling',
    name: 'Target bowling',
    kind: 'skills',
    sports: ['cricket'],
    ages: YOUNG,
    minutes: 10,
    setup: 'Stumps and a hoop on a good length.',
    how: 'Bowl at the stumps. Bounce in the hoop = 1 point, hit the stumps = 3.'
  },
  {
    id: 'continuous-cricket',
    name: 'Continuous cricket',
    kind: 'game',
    sports: ['cricket'],
    ages: ALL,
    minutes: 15,
    setup: 'Stumps, a cone out square.',
    how: 'Hit it and you must run around the cone. The bowler can bowl as soon as the ball is back. Everyone bats for three balls.'
  },
  // Hockey
  {
    id: 'push-pass',
    name: 'Push pass pairs',
    kind: 'skills',
    sports: ['hockey'],
    ages: ALL,
    minutes: 8,
    setup: 'Pairs 8 m apart.',
    how: 'Low hands, push through the ball, stick stays on the ground. Receive on the open side and pass back.'
  }
];

/** Track record scores (like Radar's brain breaks): what a "worked well" and "didn't work" add. */
export const DRILL_SCORE = { worked: 1, didnt: -1 };
