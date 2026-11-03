// Home: the coach's teams, any session or game still open (with a reminder to close it), and a
// first-run welcome with the privacy promise.

import { OPEN_TOO_LONG_HOURS } from '../../config/coaching';
import { sportById } from '../../config/sports';
import { loadDemoData } from '../../demo';
import { niceDate } from '../../lib/format';
import * as svc from '../../services';
import { Card, Page } from '../components';
import { go, useLive } from '../hooks';

export function Home() {
  const teams = useLive(() => svc.listTeams(), []);
  const open = useLive(() => svc.openEvents(), []);
  if (!teams) return null;
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '';

  async function demo() {
    const t = await loadDemoData();
    go(`team/${t.id}`);
  }

  return (
    <Page title="Solaristic Coach" eyebrow="Your teams">
      {open?.map((e) => {
        const long = Date.now() - e.openedAt > OPEN_TOO_LONG_HOURS * 3600000;
        return (
          <a class={`banner ${long ? 'warn' : ''}`} href={`#/event/${e.id}`}>
            <strong>{e.kind === 'game' ? `Game${e.opponent ? ` v ${e.opponent}` : ''}` : 'Training'} is open</strong>
            <span>
              {teamName(e.teamId)} · {niceDate(e.date)}
              {long ? ' · still open: tap to close it' : ' · tap to continue'}
            </span>
          </a>
        );
      })}

      {teams.length === 0 && (
        <Card class="welcome">
          <h2>Welcome, coach</h2>
          <p>Track attendance, give everyone a fair go on game day, and plan line-ups, all from your phone at the ground.</p>
          <p class="small muted">
            Everything stays on this phone. Players are kept as a first name and last initial only. Nothing is shared unless you share it.
          </p>
          <button class="btn primary big" onClick={() => go('team/new')}>
            Create your team
          </button>
          <button class="btn ghost" onClick={demo}>
            Try it with a demo team (fictional)
          </button>
        </Card>
      )}

      {teams.map((t) => (
        <a class="card team-card tap" href={`#/team/${t.id}`}>
          <span class="eyebrow">
            {t.ageGroup} · {sportById(t.sportId)?.name ?? 'Custom sport'}
          </span>
          <h2>{t.name}</h2>
          <span class="muted small">{t.season}</span>
        </a>
      ))}

      {teams.length > 0 && (
        <button class="btn ghost" onClick={() => go('team/new')}>
          + Add another team
        </button>
      )}
    </Page>
  );
}
