// The post-session check: one card per player who came, Radar-style swipes. Left = all good,
// up = star of the session, right = something to note (opens big chips; see ChipSheet). Game
// cards show the minutes and positions recorded by the game clock. Built for 15 kids in under
// 90 seconds, one-handed: big buttons sit at the bottom under the thumb. Coach only.

import { useRef, useState } from 'preact/hooks';
import { chipById, SAFETY_PROMPT } from '../../config/checks';
import { byName, minutes, playerName } from '../../lib/format';
import { minutesByPlayer, positionsByPlayer } from '../../logic/gameTime';
import { summariseChecks } from '../../logic/checks';
import * as svc from '../../services';
import type { Check, Player, Stint } from '../../types';
import { ChipSheet } from '../ChipSheet';
import { Avatar, Card, Page } from '../components';
import { useLive } from '../hooks';
import { SwipeCard, type SwipeAction, type SwipeControl } from '../Swipe';
import { VoiceNote } from '../VoiceNote';
import { availablePlayers } from './LineupScreen';

const VERDICT_LABEL = { good: 'All good', star: '★ Star', note: 'Note' };

/** "Rough play · Conflict with Sam" */
export const chipText = (c: Pick<Check, 'chips' | 'conflictWith'>, nameOf: (id: string) => string) =>
  c.chips
    .map((id) =>
      id === 'conflict' && c.conflictWith?.length ? `Conflict with ${c.conflictWith.map(nameOf).join(', ')}` : (chipById(id)?.label ?? id)
    )
    .join(' · ');

/** "38 min · Midfield, Attack" for a game card, from what the game clock recorded. */
function gameLine(stints: Stint[], playerId: string, roleLabel: (posId: string) => string): string | null {
  if (!stints.length) return null;
  const mine = stints.filter((s) => s.playerId === playerId);
  if (!mine.length) return 'Didn’t get on the field';
  const ms = minutesByPlayer(mine, 0).get(playerId) ?? 0;
  const roles = [...(positionsByPlayer(mine, 0, roleLabel).get(playerId) ?? new Map<string, number>()).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([r]) => r);
  return `${minutes(ms)} min · ${roles.join(', ')}`;
}

function Summary({
  who,
  checks,
  nameOf,
  onBack,
  teamId
}: {
  who: Player[];
  checks: Check[];
  nameOf: (id: string) => string;
  onBack: () => void;
  teamId: string;
}) {
  const mine = checks.filter((c) => who.some((p) => p.id === c.playerId));
  const sum = summariseChecks(mine);
  const flagged = mine.filter((c) => c.verdict !== 'good').sort((a, b) => nameOf(a.playerId).localeCompare(nameOf(b.playerId)));
  return (
    <Card>
      <p>
        {sum.good} all good · {sum.star} star{sum.star === 1 ? '' : 's'} · {sum.note} to note
        {mine.length < who.length && ` · ${who.length - mine.length} not checked`}
      </p>
      {flagged.map((c) => (
        <div class="row">
          <span class="grow">
            <strong>{nameOf(c.playerId)}</strong>
            {c.verdict === 'star' && ' ★'}
            {c.chips.length > 0 && <span class="small muted"> {chipText(c, nameOf)}</span>}
          </span>
        </div>
      ))}
      {sum.safety.length > 0 && (
        <p class="safety" role="note">
          ⚠ {sum.safety.map(nameOf).join(', ')}: {SAFETY_PROMPT}
        </p>
      )}
      <p class="tiny muted">These are for you only and never shown to players or parents.</p>
      <div class="two">
        <button class="btn ghost" onClick={onBack}>
          ← Previous
        </button>
        <a class="btn primary" href={`#/team/${teamId}`}>
          Done
        </a>
      </div>
    </Card>
  );
}

export function CheckScreen({ eventId }: { eventId: string }) {
  const ev = useLive(() => svc.getEvent(eventId), [eventId]);
  const team = useLive(async () => (ev ? svc.getTeam(ev.teamId) : undefined), [ev?.teamId]);
  const players = useLive(async () => (ev ? svc.listPlayers(ev.teamId, true) : undefined), [ev?.teamId]);
  const att = useLive(() => svc.attendanceFor(eventId), [eventId]);
  const checks = useLive(() => svc.checksFor(eventId), [eventId]);
  const stints = useLive(() => svc.stintsFor(eventId), [eventId]);
  const [i, setI] = useState(0);
  const [noting, setNoting] = useState(false);
  const control = useRef<SwipeControl | null>(null);
  if (!ev || !team || !players || !att || !checks || !stints) return null;

  const sport = svc.sportOf(team);
  const roleLabel = (pos: string) => {
    const role = sport.positions.find((p) => p.id === pos)?.role;
    return sport.roles.find((r) => r.id === role)?.label ?? pos;
  };
  // Inactive players still get a card if they were at this session.
  const who = availablePlayers(
    players.filter((p) => p.active || att.some((a) => a.playerId === p.id)),
    att
  ).sort(byName);
  const player: Player | undefined = who[i];
  const nameOf = (id: string) => players.find((p) => p.id === id)?.firstName ?? '?';
  const back = `event/${eventId}`;
  const eyebrow = `${i + 1} of ${who.length} · coach only`;

  function onSwipe(a: SwipeAction) {
    if (!player) return;
    if (a === 'issue') return setNoting(true);
    void svc.saveCheck(eventId, player.id, { verdict: a === 'up' ? 'star' : 'good' });
    setI(i + 1);
  }

  if (!who.length)
    return (
      <Page title="Check players" back={back}>
        <Card>
          <p>Nobody was marked here or late.</p>
        </Card>
      </Page>
    );

  if (!player)
    return (
      <Page title="All checked" eyebrow="Coach only" back={back}>
        <Summary who={who} checks={checks} nameOf={nameOf} teamId={ev.teamId} onBack={() => setI(who.length - 1)} />
      </Page>
    );

  const existing = checks.find((c) => c.playerId === player.id);
  if (noting)
    return (
      <Page title="Check players" eyebrow={eyebrow} back={back}>
        <ChipSheet
          key={player.id}
          eventId={eventId}
          player={player}
          others={who.filter((p) => p.id !== player.id)}
          chips={existing?.chips}
          conflictWith={existing?.conflictWith}
          onCancel={() => setNoting(false)}
          onSave={(chips, conflictWith) => {
            void svc.saveCheck(eventId, player.id, { verdict: existing?.verdict === 'star' ? 'star' : 'note', chips, conflictWith });
            setNoting(false);
            setI(i + 1);
          }}
        />
      </Page>
    );

  const line = ev.kind === 'game' ? gameLine(stints, player.id, roleLabel) : null;
  return (
    <Page title="Check players" eyebrow={eyebrow} back={back}>
      <div class="progress">
        <span style={{ width: `${(i / who.length) * 100}%` }} />
      </div>
      <SwipeCard
        key={player.id}
        onSwipe={onSwipe}
        control={control}
        labels={{ good: 'All good', issue: 'Note', up: 'Star' }}
        class="rate-card"
      >
        <div class="rate-head">
          <Avatar player={player} size="lg" />
          <div>
            <h2 class="card-name">{playerName(player)}</h2>
            {line && <span class="eyebrow">{line}</span>}
          </div>
        </div>
        {existing?.logged && <p class="logged">Logged during the session: {chipText(existing, nameOf)}</p>}
        {existing && !existing.logged && (
          <p class="small muted">
            Already: {VERDICT_LABEL[existing.verdict]}
            {existing.chips.length ? ` (${chipText(existing, nameOf)})` : ''}
          </p>
        )}
        <p class="muted small">← all good · ↑ star · note →</p>
        <VoiceNote eventId={eventId} playerId={player.id} />
      </SwipeCard>
      <div class="swipe-buttons three thumb">
        <button class="btn big good-btn" onClick={() => control.current?.fling('good')}>
          ← All good
        </button>
        <button class="btn big star-btn" onClick={() => control.current?.fling('up')}>
          ★ Star
        </button>
        <button class="btn big issue-btn" onClick={() => setNoting(true)}>
          Note →
        </button>
      </div>
      {i > 0 && (
        <button class="btn ghost small" onClick={() => setI(i - 1)}>
          ← Previous
        </button>
      )}
    </Page>
  );
}
