// Small formatting helpers: dates, minutes, names.

import type { Player } from '../types';

/** Local date as YYYY-MM-DD. */
export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Sat 14 Jun" from YYYY-MM-DD. */
export function niceDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** ms → "12:05" (minutes:seconds). */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** ms → whole minutes, rounded. */
export const minutes = (ms: number): number => Math.round(ms / 60000);

export const playerName = (p: Pick<Player, 'firstName' | 'lastInitial'>): string =>
  p.lastInitial ? `${p.firstName} ${p.lastInitial}.` : p.firstName;

/** Trims a typed first name and keeps only the first letter of whatever was typed as the surname. */
export function cleanName(first: string, last: string): { firstName: string; lastInitial: string } {
  return { firstName: first.trim().split(/\s+/)[0] ?? '', lastInitial: (last.trim()[0] ?? '').toUpperCase() };
}

export const initials = (p: Pick<Player, 'firstName' | 'lastInitial'>): string =>
  (p.firstName[0] ?? '?').toUpperCase() + (p.lastInitial ?? '');

export const byName = <T extends Pick<Player, 'firstName' | 'lastInitial'>>(a: T, b: T): number =>
  a.firstName.localeCompare(b.firstName) || a.lastInitial.localeCompare(b.lastInitial);
