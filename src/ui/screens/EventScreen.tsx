// A training session or game: the roll, game details and score, the training focus and drills,
// a "Log now" button for things that happen during the session, and closing it when it's done
// (then straight on to the post-session check), like Radar's lessons.

import { useState } from 'preact/hooks';
import { DRILLS } from '../../config/drills';
import { niceDate } from '../../lib/format';
import * as svc from '../../services';
import type { TeamEvent } from '../../types';
import { Card, Page, Segmented, sure } from '../components';
import { go, useLive } from '../hooks';
import { Roll } from '../Roll';

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

/** Training only: one skill from the sport's list to focus on today (optional). */
function Focus({ ev }: { ev: TeamEvent }) {
  const team = useLive(() => svc.getTeam(ev.teamId), [ev.teamId]);
  if (!team) return null;
  const skills = svc.sportOf(team).skills;
  return (
    <Card>
      <h3>Today’s focus</h3>
      <p class="tiny muted">Optional. Pick the skill this session works on.</p>
      <div class="chips">
        {skills.map((k) => (
          <button
            type="button"
            class={`chip ${ev.focus === k.id ? 'on' : ''}`}
            aria-pressed={ev.focus === k.id}
            onClick={() => svc.updateEvent(ev.id, { focus: ev.focus === k.id ? undefined : k.id })}
          >
            {k.label}
          </button>
        ))}
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
  const game = ev.kind === 'game';
  const closed = !!ev.closedAt;

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
      {!game && <Focus ev={ev} />}

      <Roll eventId={eventId} players={players} att={att} />

      {!game && <Drills ev={ev} />}

      {closed ? (
        <>
          <a class="btn primary big" href={`#/event/${eventId}/rate`}>
            Check players
          </a>
          <button class="btn ghost" onClick={() => svc.reopenEvent(eventId)}>
            Reopen
          </button>
        </>
      ) : (
        <button class="btn primary big" onClick={close}>
          Close {game ? 'game' : 'session'} and check players
        </button>
      )}
      <button class="btn danger-ghost" onClick={remove}>
        Delete
      </button>
      {!closed && (
        <a class="btn log-now" href={`#/event/${eventId}/log`}>
          ＋ Log now
        </a>
      )}
    </Page>
  );
}
