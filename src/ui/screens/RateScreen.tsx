// Quick player ratings after a session or game, Radar-style swipe cards: right = great,
// left = needs work, up = skip. One card per player per area (effort, skills, teamwork from
// config), with an optional one-line note. Coach only: never shown to players or parents.

import { useRef, useState } from 'preact/hooks';
import { RATING_AREAS } from '../../config/coaching';
import { byName, playerName } from '../../lib/format';
import * as svc from '../../services';
import type { Player, Rating } from '../../types';
import { Avatar, Card, Page } from '../components';
import { useLive } from '../hooks';
import { SwipeCard, type SwipeAction, type SwipeControl } from '../Swipe';
import { availablePlayers } from './LineupScreen';

function NoteField({ eventId, player, rating }: { eventId: string; player: Player; rating?: Rating }) {
  const [text, setText] = useState(rating?.note ?? '');
  return (
    <input
      class="note-input"
      key={player.id}
      value={text}
      maxLength={200}
      placeholder={`Note about ${player.firstName} (optional)`}
      onInput={(e) => setText(e.currentTarget.value)}
      onBlur={() => text !== (rating?.note ?? '') && svc.setRatingNote(eventId, player.id, text)}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}

export function RateScreen({ eventId }: { eventId: string }) {
  const ev = useLive(() => svc.getEvent(eventId), [eventId]);
  const players = useLive(async () => (ev ? svc.listPlayers(ev.teamId) : undefined), [ev?.teamId]);
  const att = useLive(() => svc.attendanceFor(eventId), [eventId]);
  const ratings = useLive(() => svc.ratingsFor(eventId), [eventId]);
  const [i, setI] = useState(0);
  const control = useRef<SwipeControl | null>(null);
  if (!ev || !players || !att || !ratings) return null;

  const who = availablePlayers(players, att).sort(byName);
  const cards = who.flatMap((p) => RATING_AREAS.map((a) => ({ player: p, area: a })));
  const card = cards[i];
  const ratingOf = (pid: string) => ratings.find((r) => r.playerId === pid);
  const back = `event/${eventId}`;

  function onSwipe(a: SwipeAction) {
    const c = cards[i];
    void svc.rate(eventId, c.player.id, c.area.id, a === 'good' ? 1 : a === 'issue' ? -1 : null);
    setI(i + 1);
  }

  if (!cards.length)
    return (
      <Page title="Rate players" back={back}>
        <Card>
          <p>Nobody was marked here or late.</p>
        </Card>
      </Page>
    );

  if (!card) {
    const great = ratings.reduce((a, r) => a + Object.values(r.scores).filter((v) => v === 1).length, 0);
    const work = ratings.reduce((a, r) => a + Object.values(r.scores).filter((v) => v === -1).length, 0);
    return (
      <Page title="All rated" back={back}>
        <Card>
          <p>
            {great} great · {work} needs work. These are for you only and never shown to players or parents.
          </p>
          <div class="two">
            <button class="btn ghost" onClick={() => setI(Math.max(0, cards.length - 1))}>
              ← Previous
            </button>
            <a class="btn primary" href={`#/team/${ev.teamId}`}>
              Done
            </a>
          </div>
        </Card>
      </Page>
    );
  }

  const prev = ratingOf(card.player.id)?.scores[card.area.id];
  const isLastArea = card.area.id === RATING_AREAS[RATING_AREAS.length - 1].id;

  return (
    <Page title="Rate players" eyebrow={`${i + 1} of ${cards.length} · coach only`} back={back}>
      <div class="progress">
        <span style={{ width: `${(i / cards.length) * 100}%` }} />
      </div>
      <SwipeCard
        key={`${card.player.id}-${card.area.id}`}
        onSwipe={onSwipe}
        control={control}
        labels={{ good: 'Great', issue: 'Needs work', up: 'Skip' }}
        class="rate-card"
      >
        <div class="rate-head">
          <Avatar player={card.player} size="lg" />
          <div>
            <h2 class="card-name">{playerName(card.player)}</h2>
            <span class="eyebrow">{card.area.label}</span>
          </div>
        </div>
        <p class="muted small">
          Swipe right for great, left for needs work, up to skip.
          {prev !== undefined && ` Already rated: ${prev === 1 ? 'great' : 'needs work'}.`}
        </p>
        {isLastArea && <NoteField eventId={eventId} player={card.player} rating={ratingOf(card.player.id)} />}
      </SwipeCard>
      <div class="swipe-buttons three">
        <button class="btn big issue-btn" onClick={() => control.current?.fling('issue')}>
          ← Needs work
        </button>
        <button class="btn big" onClick={() => control.current?.fling('up')}>
          Skip
        </button>
        <button class="btn big good-btn" onClick={() => control.current?.fling('good')}>
          Great →
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
