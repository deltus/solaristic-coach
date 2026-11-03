// Game time: the clock (quarters or halves from the sport), tap-to-sub, minutes and positions played,
// and live suggestions like "Sam has played the least, sub on next".
// Tap a bench player then a spot (or a spot then a bench player) to sub. Tap two spots to swap them.

import { useState } from 'preact/hooks';
import { fairShareMs, gameMs, minutesByPlayer, onFieldNow, periodElapsed, suggestSubs } from '../../logic/gameTime';
import { seasonStats } from '../../logic/season';
import { clockText, minutes, byName } from '../../lib/format';
import * as svc from '../../services';
import { Card, Page, sure } from '../components';
import { Field } from '../Field';
import { go, useLive, useTick, useWakeLock } from '../hooks';
import { haptic } from '../Swipe';
import { availablePlayers } from './LineupScreen';
import { MinutesTable } from './MinutesTable';

export function LiveGame({ eventId }: { eventId: string }) {
  const ev = useLive(() => svc.getEvent(eventId), [eventId]);
  const team = useLive(async () => (ev ? svc.getTeam(ev.teamId) : undefined), [ev?.teamId]);
  const season = useLive(async () => (ev ? svc.loadSeason(ev.teamId) : undefined), [ev?.teamId]);
  const stints = useLive(() => svc.stintsFor(eventId), [eventId]);
  const att = useLive(() => svc.attendanceFor(eventId), [eventId]);
  const [sel, setSel] = useState<string | null>(null);
  const running = ev?.clock?.runningSince != null;
  useTick(running ? 1000 : 0); // re-render every second while the clock runs
  useWakeLock(running);
  if (!ev || !team || !season || !stints || !att) return null;

  const sport = svc.sportOf(team);
  const clock = ev.clock;
  const byId = new Map(season.players.map((p) => [p.id, p]));
  const avail = availablePlayers(
    season.players.filter((p) => p.active),
    att
  ).sort(byName);
  const t = clock ? gameMs(clock, Date.now()) : 0;
  const field = clock ? Object.fromEntries(onFieldNow(stints)) : (ev.lineup ?? {});
  const onIds = new Set(Object.values(field));
  const bench = avail.filter((p) => !onIds.has(p.id));
  const mins = minutesByPlayer(stints, t);
  const seasonMs = new Map(seasonStats(season, sport).map((s) => [s.player.id, s.minutesMs]));
  const tips = clock && !clock.finished ? suggestSubs({ stints, now: t, available: avail.map((p) => p.id), season: seasonMs }) : [];
  const periodMs = sport.periodMinutes * 60000;
  const inPeriod = clock ? periodElapsed(clock, Date.now()) : 0;
  const share = fairShareMs(t, sport.onField, avail.length);
  const isSlot = (id: string) => sport.positions.some((p) => p.id === id);

  async function act(f: () => Promise<unknown>) {
    haptic(8);
    await f();
    setSel(null);
  }

  function tapSlot(slotId: string) {
    if (clock?.finished) return;
    if (!sel) return setSel(slotId);
    if (sel === slotId) return setSel(null);
    if (isSlot(sel)) return act(() => (clock ? svc.swap(eventId, sel, slotId) : svc.setLineup(eventId, swapLineup(field, sel, slotId))));
    return act(() => svc.sub(eventId, slotId, sel));
  }

  function tapBench(playerId: string) {
    if (clock?.finished) return;
    if (sel && isSlot(sel)) return act(() => svc.sub(eventId, sel, playerId));
    setSel(sel === playerId ? null : playerId);
  }

  async function endPeriod() {
    const last = (clock?.period ?? 0) + 1 >= sport.periods;
    if (
      !sure(
        last
          ? 'End the game? Everyone comes off and the minutes are final.'
          : `End ${sport.periodName.toLowerCase()} ${(clock?.period ?? 0) + 1}?`
      )
    )
      return;
    await svc.endCurrentPeriod(eventId, sport.periods);
  }

  const title = `v ${ev.opponent || 'Opponent'}`;
  const selName = sel
    ? isSlot(sel)
      ? byId.get(field[sel] ?? '')?.firstName || sport.positions.find((p) => p.id === sel)?.short
      : byId.get(sel)?.firstName
    : null;

  return (
    <Page title={title} eyebrow={`${team.name} · game time`} back={`event/${eventId}`}>
      {!clock ? (
        <Card class="kickoff">
          <p>
            {Object.keys(field).length}/{sport.onField} on the field. {avail.length} available.
          </p>
          <div class="two">
            <a class="btn" href={`#/event/${eventId}/lineup`}>
              Edit line-up
            </a>
            <button class="btn primary big" onClick={() => svc.kickOff(eventId)} disabled={!Object.keys(field).length}>
              Start the game
            </button>
          </div>
        </Card>
      ) : (
        <div class={`clock-bar ${running ? 'running' : ''} ${inPeriod > periodMs ? 'over' : ''}`}>
          <div>
            <span class="eyebrow light">
              {clock.finished ? 'Full time' : `${sport.periodName} ${clock.period + 1} of ${sport.periods}`}
            </span>
            <span class="clock">{clock.finished ? clockText(t) : clockText(inPeriod)}</span>
            {!clock.finished && <span class="tiny">of {sport.periodMinutes}:00</span>}
          </div>
          {!clock.finished && (
            <div class="clock-btns">
              <button class="btn big" onClick={() => (running ? svc.pauseTime(eventId) : svc.startTime(eventId))}>
                {running ? 'Pause' : inPeriod ? 'Resume' : 'Start'}
              </button>
              <button class="btn ghost light" onClick={endPeriod}>
                End {clock.period + 1 >= sport.periods ? 'game' : sport.periodName.toLowerCase()}
              </button>
            </div>
          )}
          <div class="mini-score">
            <button onClick={() => svc.setScore(eventId, (ev.scoreFor ?? 0) + 1, ev.scoreAgainst ?? 0)} aria-label="We scored">
              Us {ev.scoreFor ?? 0}
            </button>
            <button onClick={() => svc.setScore(eventId, ev.scoreFor ?? 0, (ev.scoreAgainst ?? 0) + 1)} aria-label="They scored">
              Them {ev.scoreAgainst ?? 0}
            </button>
          </div>
        </div>
      )}

      {clock && !clock.finished && !running && clock.done.length > 0 && inPeriod === 0 && (
        <button class="btn ghost small" onClick={() => svc.undoEndPeriod(eventId)}>
          Undo “end {sport.periodName.toLowerCase()}”
        </button>
      )}

      {tips.map((s, i) => (
        <div class="tip">
          <span class="grow">
            <strong>{byId.get(s.on)?.firstName}</strong> {i === 0 ? 'has played the least: sub on next' : 'is due on too'}, for{' '}
            <strong>{byId.get(s.off)?.firstName}</strong> ({sport.positions.find((p) => p.id === s.positionId)?.short}).
          </span>
          <button class="btn small primary" onClick={() => act(() => svc.sub(eventId, s.positionId, s.on))}>
            Sub
          </button>
        </div>
      ))}

      {!clock?.finished && (
        <>
          <p class="small muted center">
            {sel
              ? `${selName} selected: now tap ${isSlot(sel) ? 'a bench player or another spot' : 'a spot on the field'}.`
              : 'Tap a bench player, then a spot.'}
          </p>
          <Field
            sport={sport}
            assigned={field}
            players={byId}
            selected={sel}
            onSlot={tapSlot}
            note={(id) => (clock ? `${minutes(mins.get(id) ?? 0)}m` : undefined)}
          />

          <Card class="bench">
            <h3>Bench</h3>
            <div class="chips">
              {bench.length === 0 && <span class="small muted">Nobody on the bench.</span>}
              {bench.map((p) => (
                <button
                  type="button"
                  class={`player-chip ${sel === p.id ? 'selected' : ''} ${tips.some((s) => s.on === p.id) ? 'due' : ''}`}
                  onClick={() => tapBench(p.id)}
                >
                  {p.jersey !== undefined && <b>{p.jersey}</b>} {p.firstName}
                  <span class="tiny"> {minutes(mins.get(p.id) ?? 0)}m</span>
                </button>
              ))}
            </div>
            {sel && isSlot(sel) && field[sel] && clock && !clock.finished && (
              <button class="btn ghost small" onClick={() => act(() => svc.sub(eventId, sel, null))}>
                Take {byId.get(field[sel])?.firstName} off without a replacement
              </button>
            )}
          </Card>
        </>
      )}

      {clock && <MinutesTable players={avail} stints={stints} now={t} sport={sport} share={share} />}

      {clock?.finished && (
        <button class="btn primary big" onClick={() => svc.closeEvent(eventId).then(() => go(`event/${eventId}/rate`))}>
          Close the game and rate players
        </button>
      )}
    </Page>
  );
}

function swapLineup(l: Record<string, string>, a: string, b: string): Record<string, string> {
  const next = { ...l };
  const pa = l[a],
    pb = l[b];
  delete next[a];
  delete next[b];
  if (pa) next[b] = pa;
  if (pb) next[a] = pb;
  return next;
}
