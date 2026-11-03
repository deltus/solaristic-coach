// Drills library filters and the "worked well / didn't work" track record, adapted from Radar's
// brain break track record (src/logic/brainBreaks.ts there).

import { ageBand } from '../config/coaching';
import { DRILL_SCORE, DRILLS, type Drill, type DrillKind } from '../config/drills';
import type { DrillUse } from '../types';

/** Drills for this sport and age group. */
export function drillsFor(sportId: string, ageGroup: string, kind?: DrillKind, all: Drill[] = DRILLS): Drill[] {
  const band = ageBand(ageGroup);
  return all.filter((d) => (d.sports === 'all' || d.sports.includes(sportId)) && d.ages.includes(band) && (!kind || d.kind === kind));
}

export interface TrackRecord {
  worked: number;
  didnt: number;
  uses: number;
  score: number;
  lastUsed?: number;
}

/** Per drill: how often it was used and how it went. */
export function trackRecords(uses: DrillUse[]): Map<string, TrackRecord> {
  const out = new Map<string, TrackRecord>();
  for (const u of uses) {
    const r = out.get(u.drillId) ?? { worked: 0, didnt: 0, uses: 0, score: 0 };
    r.uses++;
    if (u.result === 'worked') r.worked++;
    if (u.result === 'didnt') r.didnt++;
    r.score = r.worked * DRILL_SCORE.worked + r.didnt * DRILL_SCORE.didnt;
    r.lastUsed = Math.max(r.lastUsed ?? 0, u.at);
    out.set(u.drillId, r);
  }
  return out;
}

/** Best first: proven drills, then untried ones, then ones that didn't work. Name breaks ties. */
export function sortByRecord(drills: Drill[], records: Map<string, TrackRecord>): Drill[] {
  return [...drills].sort((a, b) => (records.get(b.id)?.score ?? 0) - (records.get(a.id)?.score ?? 0) || a.name.localeCompare(b.name));
}

/** A short label for a drill's record, e.g. "Worked 3 · Didn't 1". */
export function recordLabel(r?: TrackRecord): string {
  if (!r || !r.uses) return 'Not tried yet';
  const parts = [`Used ${r.uses}`];
  if (r.worked) parts.push(`worked ${r.worked}`);
  if (r.didnt) parts.push(`didn’t ${r.didnt}`);
  return parts.join(' · ');
}
