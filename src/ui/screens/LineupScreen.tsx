// Line-up editor: drag players (or tap a player, then a spot) onto positions on the field drawing.
// "Fair rotation" fills the field so everyone gets similar minutes and a mix of positions across
// the season, and shows who could sit out each period. Adapted from Radar's seating plan editor.

import { useRef, useState } from 'preact/hooks';
import { benchPlan, fairRotation, placeInLineup, removeFromLineup } from '../../logic/lineup';
import { historyFrom, seasonStats } from '../../logic/season';
import { byName, minutes } from '../../lib/format';
import * as svc from '../../services';
import type { Player } from '../../types';
import { Card, Page } from '../components';
import { Field } from '../Field';
import { useLive } from '../hooks';
import { useDragDrop } from '../dragDrop';

/** Players who can play: marked here or late, or the whole squad if attendance isn't taken yet. */
export function availablePlayers(players: Player[], att: { playerId: string; status: string }[]): Player[] {
  if (!att.length) return players;
  const ok = new Set(att.filter((a) => a.status !== 'away').map((a) => a.playerId));
  return players.filter((p) => ok.has(p.id));
}

export function LineupScreen({ eventId }: { eventId: string }) {
  const ev = useLive(() => svc.getEvent(eventId), [eventId]);
  const team = useLive(async () => (ev ? svc.getTeam(ev.teamId) : undefined), [ev?.teamId]);
  const season = useLive(async () => (ev ? svc.loadSeason(ev.teamId) : undefined), [ev?.teamId]);
  const att = useLive(() => svc.attendanceFor(eventId), [eventId]);
  const [selected, setSelected] = useState<string | null>(null);
  const shuffles = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const lineup = ev?.lineup ?? {};

  const drop = (playerId: string, slotId: string | null) => {
    void svc.setLineup(eventId, slotId ? placeInLineup(lineup, slotId, playerId) : removeFromLineup(lineup, playerId));
    setSelected(null);
  };
  const drag = useDragDrop(drop);

  if (!ev || !team || !season || !att) return null;
  const sport = svc.sportOf(team);
  const players = season.players.filter((p) => p.active);
  const avail = availablePlayers(players, att).sort(byName);
  const byId = new Map(season.players.map((p) => [p.id, p]));
  const placed = new Set(Object.values(lineup));
  const bench = avail.filter((p) => !placed.has(p.id));
  const started = !!ev.clock;
  const stats = seasonStats(season, sport);
  const seasonMs = new Map(stats.map((s) => [s.player.id, s.minutesMs]));
  const plan =
    avail.length > sport.onField
      ? benchPlan(
          avail.map((p) => p.id),
          sport.onField,
          sport.periods,
          seasonMs
        )
      : [];

  function tapSlot(slotId: string) {
    if (started) return;
    const there = lineup[slotId];
    if (selected && byId.has(selected)) return drop(selected, slotId);
    if (selected && !byId.has(selected)) {
      // A spot was selected first: swap the two spots.
      const a = lineup[selected];
      const next = { ...lineup };
      if (there) next[selected] = there;
      else delete next[selected];
      if (a) next[slotId] = a;
      else delete next[slotId];
      void svc.setLineup(eventId, next);
      return setSelected(null);
    }
    setSelected(there ?? slotId);
  }

  function fair() {
    const jitter = shuffles.current++ ? 0.15 : 0;
    const next = fairRotation({
      players: avail.map((p) => ({ id: p.id, preferred: p.positions })),
      slots: sport.positions,
      history: historyFrom(stats),
      jitter
    });
    void svc.setLineup(eventId, next);
    setSelected(null);
  }

  return (
    <Page title="Line-up" eyebrow={`${team.name} v ${ev.opponent || 'Opponent'}`} back={`event/${eventId}`}>
      {started && <p class="banner">The game has started. Make changes on the Game time screen.</p>}
      {!started && (
        <div class="two">
          <button class="btn primary" onClick={fair} disabled={!avail.length}>
            ⚖ Fair rotation
          </button>
          <button class="btn ghost" onClick={() => svc.setLineup(eventId, {})}>
            Clear
          </button>
        </div>
      )}
      <p class="small muted center">
        {started
          ? ''
          : selected
            ? 'Now tap a spot on the field (or the bench).'
            : 'Drag a player onto a spot, or tap a player then a spot.'}
      </p>
      <div ref={fieldRef}>
        <Field sport={sport} assigned={lineup} players={byId} selected={selected} onSlot={tapSlot} />
      </div>

      <Card class="bench">
        <div class="row-head">
          <h3>Bench</h3>
          <span class="small muted">
            {Object.keys(lineup).length}/{sport.onField} on field
          </span>
        </div>
        <div
          class="chips"
          data-bench="1"
          onClick={(e) => (e.target as HTMLElement).dataset.bench && selected && byId.has(selected) && drop(selected, null)}
        >
          {bench.length === 0 && <span class="small muted">Everyone available is on the field.</span>}
          {bench.map((p) => (
            <button
              type="button"
              class={`player-chip ${selected === p.id ? 'selected' : ''}`}
              data-player={p.id}
              onPointerDown={(e) => !started && drag.start(e, p.id, p.firstName)}
              onClick={() => !started && setSelected(selected === p.id ? null : p.id)}
            >
              {p.jersey !== undefined && <b>{p.jersey}</b>} {p.firstName}
              <span class="tiny muted"> {minutes(seasonMs.get(p.id) ?? 0)}m</span>
            </button>
          ))}
        </div>
        {selected && byId.has(selected) && placed.has(selected) && !started && (
          <button class="btn ghost small" onClick={() => drop(selected, null)}>
            Move {byId.get(selected)!.firstName} to the bench
          </button>
        )}
      </Card>

      {plan.length > 0 && (
        <Card>
          <h3>Who sits out each {sport.periodName.toLowerCase()}</h3>
          <p class="small muted">A suggestion, so the bench time is shared. Players with the most minutes this season sit first.</p>
          {plan.map((sit, i) => (
            <div class="row">
              <span class="kind">{i + 1}</span>
              <span class="grow">{sit.map((id) => byId.get(id)?.firstName).join(', ')}</span>
            </div>
          ))}
        </Card>
      )}
    </Page>
  );
}
