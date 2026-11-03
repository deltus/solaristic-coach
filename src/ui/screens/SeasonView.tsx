// Season view: minutes and positions per player across all closed games, attendance, and who
// needs attention, so the coach can see at a glance whether everyone is getting a fair go.

import { useState } from 'preact/hooks';
import { needsAttention, seasonStats, type PlayerSeason } from '../../logic/season';
import { minutes, playerName } from '../../lib/format';
import * as svc from '../../services';
import { Card, Empty, Page, Segmented } from '../components';
import { useLive } from '../hooks';

type Sort = 'minutes' | 'share' | 'name';

const ROLE_COLOURS = ['#2350d8', '#2a6b5c', '#9a6a12', '#7a1f3d', '#656b7a'];

export function SeasonView({ teamId }: { teamId: string }) {
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const season = useLive(() => svc.loadSeason(teamId), [teamId]);
  const [sort, setSort] = useState<Sort>('minutes');
  if (!team || !season) return null;
  const sport = svc.sportOf(team);
  const stats = seasonStats(season, sport).filter((s) => s.player.active || s.minutesMs > 0);
  const games = season.events.filter((e) => e.kind === 'game' && e.closedAt).length;
  const attention = new Map(needsAttention(stats, season, sport).map((a) => [a.playerId, a]));
  const cmp: Record<Sort, (a: PlayerSeason, b: PlayerSeason) => number> = {
    minutes: (a, b) => a.minutesMs - b.minutesMs,
    share: (a, b) => a.shareOfAvailable - b.shareOfAvailable,
    name: (a, b) => a.player.firstName.localeCompare(b.player.firstName)
  };
  const rows = [...stats].sort(cmp[sort]);
  const max = Math.max(1, ...rows.map((r) => r.minutesMs));
  const roles = sport.roles;

  return (
    <Page title="Season minutes" eyebrow={`${team.name} · ${games} game${games === 1 ? '' : 's'}`} back={`team/${teamId}`}>
      {games === 0 && <Empty>No finished games yet. Minutes appear here after your first game.</Empty>}
      {games > 0 && (
        <>
          <Segmented
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'minutes', label: 'Fewest minutes' },
              { id: 'share', label: 'Fair share' },
              { id: 'name', label: 'Name' }
            ]}
          />
          {roles.length > 1 && (
            <div class="legend">
              {roles.map((r, i) => (
                <span>
                  <i style={{ background: ROLE_COLOURS[i % ROLE_COLOURS.length] }} />
                  {r.label}
                </span>
              ))}
            </div>
          )}
          <Card>
            {rows.map((s) => (
              <div class="season-row">
                <div class="row-head">
                  <strong>
                    {playerName(s.player)}
                    {attention.has(s.player.id) && (
                      <span class="flag" title={attention.get(s.player.id)!.reasons.join(' · ')}>
                        {' '}
                        ⚑
                      </span>
                    )}
                  </strong>
                  <span class="small">
                    {minutes(s.minutesMs)}m · {Math.round(s.shareOfAvailable * 100)}%
                  </span>
                </div>
                <div class="stack" style={{ width: `${(s.minutesMs / max) * 100}%` }}>
                  {roles.map((r, i) => {
                    const ms = s.byRole.get(r.id) ?? 0;
                    return ms ? (
                      <span title={`${r.label}: ${minutes(ms)}m`} style={{ flex: ms, background: ROLE_COLOURS[i % ROLE_COLOURS.length] }} />
                    ) : null;
                  })}
                </div>
                <span class="tiny muted">
                  {s.games} games · {s.trainings} trainings · {s.away} away{s.late ? ` · ${s.late} late` : ''}
                  {attention.has(s.player.id) && ` · ${attention.get(s.player.id)!.reasons[0]}`}
                </span>
              </div>
            ))}
          </Card>
          <p class="tiny muted">% = share of the game time they could have played (games they came to). Friendlies count too.</p>
        </>
      )}
      <a class="btn" href={`#/team/${teamId}/summary`}>
        Printable season summary
      </a>
    </Page>
  );
}
