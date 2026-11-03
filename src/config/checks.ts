// The post-session check: what each swipe means, and the note chips the coach can tick after a
// swipe right (or with "Log now" during a session). Edit the lists here; ids are stored, so keep
// an id once it has been used (change the label instead).
//   tone: 'good' = green, 'amber' = worth watching, 'red' = a concern. Used for colours and,
//   later, the season dots and patterns.
//   safety: shows the "tell your club's child safety officer" prompt when ticked.
//   pickPlayer: asks which other player was involved.

export type ChipTone = 'good' | 'amber' | 'red';

export interface CheckChip {
  id: string;
  label: string;
  tone: ChipTone;
  safety?: boolean;
  pickPlayer?: boolean;
}

export interface ChipGroup {
  id: string;
  label: string;
  chips: CheckChip[];
}

export const CHIP_GROUPS: ChipGroup[] = [
  {
    id: 'effort',
    label: 'Effort',
    chips: [
      { id: 'low-energy', label: 'Low energy', tone: 'amber' },
      { id: 'switched-off', label: 'Switched off', tone: 'amber' },
      { id: 'standout-effort', label: 'Standout effort', tone: 'good' }
    ]
  },
  {
    id: 'behaviour',
    label: 'Behaviour',
    chips: [
      { id: 'talking-over', label: 'Talking over coach', tone: 'amber' },
      { id: 'rough-play', label: 'Rough play', tone: 'red' },
      { id: 'mucking-around', label: 'Mucking around', tone: 'amber' },
      { id: 'argued', label: 'Argued with ref or teammate', tone: 'red' },
      { id: 'left-early', label: 'Left early', tone: 'amber' }
    ]
  },
  {
    id: 'skill',
    label: 'Skill',
    chips: [
      { id: 'struggled-drill', label: 'Struggled with drill', tone: 'amber' },
      { id: 'nailed-drill', label: 'Nailed drill', tone: 'good' }
    ]
  },
  {
    id: 'wellbeing',
    label: 'Wellbeing',
    chips: [
      { id: 'upset', label: 'Seemed upset', tone: 'red', safety: true },
      { id: 'knock', label: 'Knock or injury', tone: 'red', safety: true }
    ]
  },
  {
    id: 'social',
    label: 'Social',
    chips: [
      { id: 'helped', label: 'Helped a teammate', tone: 'good' },
      { id: 'left-out', label: 'Left out', tone: 'amber' },
      { id: 'conflict', label: 'Conflict with…', tone: 'red', pickPlayer: true }
    ]
  }
];

export const ALL_CHIPS: CheckChip[] = CHIP_GROUPS.flatMap((g) => g.chips);
export const chipById = (id: string): CheckChip | undefined => ALL_CHIPS.find((c) => c.id === id);

/** The swipe directions on the check card. */
export const CHECK_SWIPES = { good: 'left', note: 'right', star: 'up' } as const;

export const SAFETY_PROMPT = "Report this to your club's child safety officer.";

/** Voice notes stop recording after this long. */
export const VOICE_MAX_SECONDS = 30;
