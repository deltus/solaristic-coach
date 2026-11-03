// "Log now": note something about a player during a session or game (a knock, rough play, a great
// bit of help) without waiting for the post-session check. Pick the player, tick chips, save. The
// chips show up on that player's card when you check players after the session.

import { useState } from 'preact/hooks';
import { byName } from '../../lib/format';
import * as svc from '../../services';
import { ChipSheet } from '../ChipSheet';
import { Avatar, Card, Page } from '../components';
import { go, useLive } from '../hooks';
import { availablePlayers } from './LineupScreen';

export function LogNow({ eventId, from }: { eventId: string; from?: string }) {
  const ev = useLive(() => svc.getEvent(eventId), [eventId]);
  const players = useLive(async () => (ev ? svc.listPlayers(ev.teamId) : undefined), [ev?.teamId]);
  const att = useLive(() => svc.attendanceFor(eventId), [eventId]);
  const [pick, setPick] = useState<string | null>(null);
  if (!ev || !players || !att) return null;
  const back = from === 'live' ? `event/${eventId}/live` : `event/${eventId}`;
  const who = availablePlayers(players, att).sort(byName);
  const player = who.find((p) => p.id === pick);

  if (player)
    return (
      <Page title="Log now" eyebrow="Coach only" back={back}>
        <ChipSheet
          key={player.id}
          eventId={eventId}
          player={player}
          others={who.filter((p) => p.id !== player.id)}
          saveLabel="Log it"
          onCancel={() => setPick(null)}
          onSave={async (chips, conflictWith) => {
            await svc.logIncident(eventId, player.id, chips, conflictWith);
            go(back);
          }}
        />
      </Page>
    );

  return (
    <Page title="Log now" eyebrow="Who is it about?" back={back}>
      <Card>
        <div class="pick-grid">
          {who.map((p) => (
            <button type="button" class="pick-btn" onClick={() => setPick(p.id)}>
              <Avatar player={p} />
              <span>{p.firstName}</span>
            </button>
          ))}
        </div>
      </Card>
    </Page>
  );
}
