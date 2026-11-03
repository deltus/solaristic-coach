// Drills library: warm-ups, skills and games for this team's sport and age group, best track
// record first. Opened from a training session, each drill can be added to it; "Worked well" or
// "Didn't work" is marked on the session screen (like Radar's brain break track record).

import { useState } from 'preact/hooks';
import { DRILL_KINDS, DRILLS, type DrillKind } from '../../config/drills';
import { drillsFor, recordLabel, sortByRecord, trackRecords } from '../../logic/drills';
import * as svc from '../../services';
import { Card, Empty, Page } from '../components';
import { go, useLive } from '../hooks';

export function DrillsLibrary({ teamId, eventId }: { teamId: string; eventId?: string }) {
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const uses = useLive(() => svc.drillUsesForTeam(teamId), [teamId]);
  const [kind, setKind] = useState<DrillKind | 'all'>('all');
  const [everything, setEverything] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  if (!team || !uses) return null;
  const sport = svc.sportOf(team);
  const records = trackRecords(uses);
  const inSession = new Set(uses.filter((u) => u.eventId === eventId).map((u) => u.drillId));
  const base = everything ? DRILLS : drillsFor(team.sportId, team.ageGroup);
  const list = sortByRecord(
    base.filter((d) => kind === 'all' || d.kind === kind),
    records
  );

  async function add(id: string) {
    if (!eventId) return;
    await svc.addDrill(eventId, id);
    go(`event/${eventId}`);
  }

  return (
    <Page
      title="Drills"
      eyebrow={everything ? 'All sports and ages' : `${sport.name} · ${team.ageGroup}`}
      back={eventId ? `event/${eventId}` : `team/${teamId}`}
    >
      <div class="chips">
        <button class={`chip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>
          All
        </button>
        {DRILL_KINDS.map((k) => (
          <button class={`chip ${kind === k.id ? 'on' : ''}`} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      {list.length === 0 && <Empty>No drills for this filter yet.</Empty>}
      {list.map((d) => {
        const r = records.get(d.id);
        return (
          <Card class="drill">
            <button type="button" class="drill-head" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
              <span class="grow">
                <strong>{d.name}</strong>
                <span class="tiny muted block">
                  {DRILL_KINDS.find((k) => k.id === d.kind)?.label} · {d.minutes} min · {recordLabel(r)}
                </span>
              </span>
              {r && r.score > 0 && <span class="badge good">✓ {r.worked}</span>}
              {r && r.score < 0 && <span class="badge bad">✕ {r.didnt}</span>}
            </button>
            {open === d.id && (
              <div class="drill-body">
                <p class="small">
                  <strong>You need:</strong> {d.setup}
                </p>
                <p class="small">{d.how}</p>
              </div>
            )}
            {eventId && (
              <button class="btn small" disabled={inSession.has(d.id)} onClick={() => add(d.id)}>
                {inSession.has(d.id) ? 'Added' : 'Add to this session'}
              </button>
            )}
          </Card>
        );
      })}
      <button class="btn ghost" onClick={() => setEverything(!everything)}>
        {everything ? `Only ${sport.name} · ${team.ageGroup}` : 'Show drills for every sport and age'}
      </button>
    </Page>
  );
}
