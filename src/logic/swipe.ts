// Swipe decisions, kept apart from the screen so they can be tested. Copied from Radar's
// src/logic/swipe.ts (the issue-screen part dropped).

/** A long enough drag, or a short quick flick, counts as a swipe. */
export const SWIPE_DISTANCE = 80;
export const FLICK_DISTANCE = 30;
/** px per millisecond. */
export const FLICK_SPEED = 0.45;

/** Which way a drag went, if it counts as a swipe. `ms` is how long the finger was down. */
export function decideSwipe(dx: number, dy: number, ms: number): 'left' | 'right' | 'up' | null {
  const fast = (d: number) => Math.abs(d) >= FLICK_DISTANCE && Math.abs(d) / Math.max(ms, 1) >= FLICK_SPEED;
  if (dy < 0 && -dy > Math.abs(dx) && (-dy >= SWIPE_DISTANCE || fast(dy))) return 'up';
  if (Math.abs(dx) >= Math.abs(dy) && (Math.abs(dx) >= SWIPE_DISTANCE || fast(dx))) return dx > 0 ? 'right' : 'left';
  return null;
}

export type FlyStyle = 'fly' | 'fade';
export interface FlyPlan {
  style: FlyStyle;
  ms: number;
  dx: number;
  dy: number;
  rotate: number;
  wash: 'good' | 'issue' | 'up';
}

export const FLY_MS = 250;
export const FADE_MS = 100;

/** How a swiped card leaves: flies off with about an 8° tilt, or a quick cross-fade for reduced motion. */
export function flyPlan(
  action: 'good' | 'issue' | 'up',
  side: 'left' | 'right' | null,
  opts: { animate: boolean; reduceMotion: boolean }
): FlyPlan {
  if (!opts.animate || opts.reduceMotion) return { style: 'fade', ms: FADE_MS, dx: 0, dy: 0, rotate: 0, wash: action };
  if (action === 'up') return { style: 'fly', ms: FLY_MS, dx: 0, dy: -1, rotate: 0, wash: action };
  const dir = side === 'left' ? -1 : 1;
  return { style: 'fly', ms: FLY_MS, dx: dir, dy: 0, rotate: 8 * dir, wash: action };
}
