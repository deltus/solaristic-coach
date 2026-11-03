// A training session or game: one-tap attendance, game details and score, drills used (training),
// and closing it when it's done (then straight on to quick ratings), like Radar's lessons.

import { useState } from 'preact/hooks';
import { ATTENDANCE } from '../../config/coaching';
import { DRILLS } from '../../config/drills';
import { niceDate, byName } from '../../lib/format';
import * as svc from '../../services';
import type { AttendanceStatus, TeamEvent } from '../../types';
import { Card, Page, PlayerLine, Segmented, sure } from '../components';
import { go, useLive } from '../hooks';

function GameDetails({ ev }: { ev: TeamEvent }) {
  const [opp, setOpp] = useState(ev.opponent ?? '');
  const score = (f: number, a: number) => svc.setScore(ev.id, f, a);
  return (
    <Card>
      <label class="field-label">
        Opponent
        <input
          value={opp}
          placeholder="Who are you playing?"
          maxLength={40}
          onInput={(e) => setOpp(e.currentTarget.value)}
          onBlur={() => svc.updateEvent(ev.id, { opponent: opp.trim() || undefined })}
        />
      </label>
      <div class="two">
        <Segmented
          label="Home or away"
          value={ev.venue ?? 'home'}
          options={[
            { id: 'home', label: 'Home' },
            { id: 'away', label: 'Away' }
          ]}
          onChange={(venue) => svc.updateEvent(ev.id, { venue })}
        />
        <Segmented
          label="Game type"
          value={ev.gameType ?? 'competition'}
          options={[
            { id: 'competition', label: 'Competition' },
            { id: 'friendly', label: 'Friendly' }
          ]}
          onChange={(gameType) => svc.updateEvent(ev.id, { gameType })}
        />
      </div>
      <div class="scoreboard">
        {(['us', 'them'] as const).map((side) => {
          const f = ev.scoreFor ?? 0,
            a = ev.scoreAgainst ?? 0;
          const v = side === 'us' ? f : a;
          const set = (n: number) => (side === 'us' ? score(n, a) : score(f, n));
          return (
            <div class="score-side">
              <span class="small muted">{side === 'us' ? 'Us' : ev.opponent || 'Them'}</span>
              <div class="score-ctl">
                <button class="icon-btn" onClick={() => set(v - 1)} aria-label="Minus one">
                  −
                </button>
                <span class="score-num">{v}</span>
                <button class="icon-btn" onClick={() => set(v + 1)} aria-label="Plus one">
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Drills({ ev }: { ev: TeamEvent }) {
  const uses = useLive(() => svc.drillsUsedIn(ev.id), [ev.id]);
  if (!uses) return null;
  const name = (id: string) => DRILLS.find((d) => d.id === id)?.name ?? id;
  return (
    <Card>
      <h3>Drills</h3>
      {uses.length === 0 && <p class="small muted">Add drills from the library as you use them.</p>}
      {uses.map((u) => (
        <div class="row">
          <span class="grow">{name(u.drillId)}</span>
          <button
            class={`chip ${u.result === 'worked' ? 'on good' : ''}`}
            onClick={() => svc.setDrillResult(u.id, u.result === 'worked' ? undefined : 'worked')}
          >
            Worked well
          </button>
          <button
            class={`chip ${u.result === 'didnt' ? 'on bad' : ''}`}
            onClick={() => svc.setDrillResult(u.id, u.result === 'didnt' ? undefined : 'didnt')}
          >
            Didn’t work
          </button>
        </div>
      ))}
      <a class="btn ghost" href={`#/team/${ev.teamId}/drills/${ev.id}`}>
        + Add a drill
      </a>
    </Card>
  );
}

export function EventScreen({ eventId }: { eventId: string }) {
  const ev = useLive(() => svc.getEvent(eventId), [eventId]);
  const players = useLive(async () => (ev ? svc.listPlayers(ev.teamId) : []), [ev?.teamId]);
  const att = useLive(() => svc.attendanceFor(eventId), [eventId]);
  if (!ev || !players || !att) return null;
  const status = new Map(att.map((a) => [a.playerId, a.status]));
  const sorted = [...players].sort(byName);
  const counts = { here: 0, late: 0, away: 0 };
  for (const a of att) counts[a.status]++;
  const game = ev.kind === 'game';
  const closed = !!ev.closedAt;

  const tap = (playerId: string, s: AttendanceStatus) => svc.setAttendance(eventId, playerId, status.get(playerId) === s ? null : s);

  async function close() {
    if (game && ev!.clock && !ev!.clock.finished && !sure('The game clock is still going. End the game and close it?')) return;
    await svc.closeEvent(eventId);
    go(`event/${eventId}/rate`);
  }

  async function remove() {
    if (!sure('Delete this session and everything recorded in it?')) return;
    await svc.deleteEvent(eventId);
    go(`team/${ev!.teamId}`);
  }

  return (
    <Page
      title={game ? `v ${ev.opponent || 'Opponent'}` : 'Training'}
      eyebrow={`${niceDate(ev.date)}${closed ? ' · closed' : ''}`}
      back={`team/${ev.teamId}`}
    >
      {game && (
        <div class="two">
          <a class="btn big" href={`#/event/${eventId}/lineup`}>
            Line-up
          </a>
          <a class="btn primary big" href={`#/event/${eventId}/live`}>
            {ev.clock ? (ev.clock.finished ? 'Game time' : 'Back to game') : 'Game time'}
          </a>
        </div>
      )}
      {game && <GameDetails ev={ev} />}

      <Card>
        <div class="row-head">
          <h3>Attendance</h3>
          <span class="small muted">
            {counts.here} here · {counts.late} late · {counts.away} away
          </span>
        </div>
        {sorted.map((p) => (
          <PlayerLine player={p}>
            <div class="att">
              {ATTENDANCE.map((a) => (
                <button
                  class={`att-btn ${a.id} ${status.get(p.id) === a.id ? 'on' : ''}`}
                  onClick={() => tap(p.id, a.id)}
                  aria-pressed={status.get(p.id) === a.id}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </PlayerLine>
        ))}
        {att.length < players.length && (
          <button
            class="btn ghost"
            onClick={() =>
              svc.markRestHere(
                eventId,
                players.map((p) => p.id)
              )
            }
          >
            Mark everyone else here
          </button>
        )}
      </Card>

      {!game && <Drills ev={ev} />}

      {closed ? (
        <>
          <a class="btn primary big" href={`#/event/${eventId}/rate`}>
            Rate players
          </a>
          <button class="btn ghost" onClick={() => svc.reopenEvent(eventId)}>
            Reopen
          </button>
        </>
      ) : (
        <button class="btn primary big" onClick={close}>
          Close {game ? 'game' : 'session'}
        </button>
      )}
      <button class="btn danger-ghost" onClick={remove}>
        Delete
      </button>
    </Page>
  );
}
