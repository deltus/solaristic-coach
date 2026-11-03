// Printable season summary per player: games, minutes, positions, attendance (with reasons),
// post-session checks, round 1 ratings and coach notes. Marked "coach only"; it's for the coach's
// own records (print or save as PDF), not for sharing with parents. Wellbeing and injury chips are
// left out on purpose, because a printout can travel.

import { chipById } from '../../config/checks';
import { RATING_AREAS, ROLL_CHOICES } from '../../config/coaching';
import { record, seasonStats } from '../../logic/season';
import { minutes, niceDate, playerName } from '../../lib/format';
import * as svc from '../../services';
import { useLive } from '../hooks';

export function SeasonSummary({ teamId }: { teamId: string }) {
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const season = useLive(() => svc.loadSeason(teamId), [teamId]);
  if (!team || !season) return null;
  const sport = svc.sportOf(team);
  const stats = seasonStats(season, sport).filter((s) => s.player.active || s.minutesMs > 0 || s.games > 0);
  const rec = record(season.events);
  const short = (id: string) => sport.positions.find((p) => p.id === id)?.short ?? id;
  const role = (id: string) => sport.roles.find((r) => r.id === id)?.label ?? id;
  const trainings = season.events.filter((e) => e.kind === 'training' && e.closedAt).length;

  return (
    <main class="summary">
      <div class="no-print summary-bar">
        <a class="btn ghost" href={`#/team/${teamId}`}>
          ‹ Back
        </a>
        <button class="btn primary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
      <header>
        <span class="eyebrow">Season summary · coach only</span>
        <h1>{team.name}</h1>
        <p>
          {team.ageGroup} {sport.name} · {team.season} · {rec.played} games (won {rec.won}, drawn {rec.drawn}, lost {rec.lost}) ·{' '}
          {trainings} trainings
        </p>
      </header>
      {stats.map((s) => (
        <section class="summary-player">
          <h2>
            {s.player.jersey !== undefined && <span class="muted">#{s.player.jersey} </span>}
            {playerName(s.player)}
          </h2>
          <table>
            <tbody>
              <tr>
                <th>Games</th>
                <td>{s.games}</td>
                <th>Minutes</th>
                <td>
                  {minutes(s.minutesMs)} ({Math.round(s.shareOfAvailable * 100)}% of available)
                </td>
              </tr>
              <tr>
                <th>Trainings</th>
                <td>{s.trainings}</td>
                <th>Attendance</th>
                <td>
                  {Math.round(s.attendanceRate * 100)}% · {s.late} late · {s.away} missed
                  {s.away > 0 && (
                    <span class="muted">
                      {' '}
                      (
                      {Object.entries(s.absentFor)
                        .map(([r, n]) => `${n} ${ROLL_CHOICES.find((c) => c.id === r)?.label.toLowerCase() ?? r}`)
                        .join(', ')}
                      )
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <th>Positions</th>
                <td colSpan={3}>
                  {[...s.byPosition.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, ms]) => `${short(id)} ${minutes(ms)}m`)
                    .join(', ') || '—'}
                  {s.byRole.size > 0 && sport.roles.length > 1 && (
                    <span class="muted">
                      {' '}
                      (
                      {[...s.byRole.entries()]
                        .map(([r, ms]) => `${role(r)} ${Math.round((ms / Math.max(1, s.minutesMs)) * 100)}%`)
                        .join(', ')}
                      )
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <th>Checks</th>
                <td colSpan={3}>
                  {s.checks.good} all good · {s.checks.star} star{s.checks.star === 1 ? '' : 's'} · {s.checks.note} noted
                  {s.checks.chips.size > 0 && (
                    <span class="muted">
                      {' '}
                      (
                      {[...s.checks.chips.entries()]
                        .filter(([id]) => !chipById(id)?.safety)
                        .sort((a, b) => b[1] - a[1])
                        .map(([id, n]) => `${(chipById(id)?.label ?? id).replace(/…$/, '')} ×${n}`)
                        .join(', ')}
                      )
                    </span>
                  )}
                </td>
              </tr>
              {s.ratings.size > 0 && (
                <tr>
                  <th>Ratings</th>
                  <td colSpan={3}>
                    {RATING_AREAS.map((a) => {
                      const [g, w] = s.ratings.get(a.id) ?? [0, 0];
                      return `${a.label}: ${g} great, ${w} needs work`;
                    }).join(' · ')}
                  </td>
                </tr>
              )}
              {s.notes.length > 0 && (
                <tr>
                  <th>Notes</th>
                  <td colSpan={3}>
                    {s.notes.map((n) => (
                      <div>
                        {n.date && <span class="muted">{niceDate(n.date)}: </span>}
                        {n.note}
                      </div>
                    ))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ))}
      <p class="tiny muted">
        Made with Solaristic Coach on the coach’s own device. Checks, ratings and notes are the coach’s private notes. Wellbeing and injury
        notes are never printed.
      </p>
    </main>
  );
}
