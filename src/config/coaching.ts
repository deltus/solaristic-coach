// Editable lists for coaching: age groups, rating areas, team builder and fair-time numbers.

export const AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'Open'];

/** Bands used by the drills library. */
export type AgeBand = 'U6-U8' | 'U9-U12' | 'U13+';
export function ageBand(ageGroup: string): AgeBand {
  const n = Number(ageGroup.replace(/\D/g, ''));
  if (!n || n >= 13) return 'U13+';
  return n <= 8 ? 'U6-U8' : 'U9-U12';
}

/** Quick rating areas after a session or game (swipe right = great, left = needs work, up = skip). */
export const RATING_AREAS = [
  { id: 'effort', label: 'Effort' },
  { id: 'skills', label: 'Skills' },
  { id: 'teamwork', label: 'Teamwork' }
];

/** Swipe direction for "great". Same idea as Radar's SWIPE.goodDirection. */
export const SWIPE = { goodDirection: 'right' as 'left' | 'right' };

/** Ratings older than this many sessions are ignored when balancing teams. */
export const RATING_WINDOW = 6;

/** Team builder: how many teams the coach can split into. */
export const TEAM_COUNTS = [2, 3, 4];

/**
 * Fair game time. A bench player is "due on" once they trail the on-field player with the most
 * minutes in this game by at least this many minutes.
 */
export const SUB_GAP_MINUTES = 3;

/** Attendance choices, one tap each. */
export const ATTENDANCE = [
  { id: 'here', label: 'Here' },
  { id: 'late', label: 'Late' },
  { id: 'away', label: 'Away' }
] as const;

/** Close-the-session reminder: an event left open longer than this shows a banner on Home. */
export const OPEN_TOO_LONG_HOURS = 4;
