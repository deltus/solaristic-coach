// The squad: add, edit and remove players. Only first name, last initial, jersey number and
// preferred positions are kept, on purpose (players are mostly children).

import { useState } from 'preact/hooks';
import { playerName } from '../../lib/format';
import * as svc from '../../services';
import type { Player } from '../../types';
import { Avatar, Card, Empty, Page, sure } from '../components';
import { useLive } from '../hooks';

function PlayerForm({ teamId, player, onDone }: { teamId: string; player?: Player; onDone: () => void }) {
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const [first, setFirst] = useState(player?.firstName ?? '');
  const [last, setLast] = useState(player?.lastInitial ?? '');
  const [jersey, setJersey] = useState(player?.jersey?.toString() ?? '');
  const [positions, setPositions] = useState<string[]>(player?.positions ?? []);
  const [error, setError] = useState('');
  if (!team) return null;
  const sport = svc.sportOf(team);
  const toggle = (id: string) => setPositions((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save(e: Event) {
    e.preventDefault();
    const input = { firstName: first, lastName: last, jersey: jersey === '' ? undefined : Number(jersey), positions };
    try {
      if (player) await svc.updatePlayer(player.id, input);
      else await svc.addPlayer(teamId, input);
      if (player) onDone();
      else {
        setFirst('');
        setLast('');
        setJersey('');
        setPositions([]);
        setError('');
        (document.getElementById('first-name') as HTMLInputElement | null)?.focus();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form class="card" onSubmit={save}>
      <h3>{player ? `Edit ${player.firstName}` : 'Add a player'}</h3>
      <div class="three">
        <label class="field-label grow">
          First name
          <input id="first-name" value={first} onInput={(e) => setFirst(e.currentTarget.value)} autoComplete="off" maxLength={20} />
        </label>
        <label class="field-label narrow">
          Last initial
          <input value={last} onInput={(e) => setLast(e.currentTarget.value.slice(0, 1))} autoComplete="off" maxLength={1} />
        </label>
        <label class="field-label narrow">
          Jersey
          <input type="number" inputMode="numeric" min={0} max={999} value={jersey} onInput={(e) => setJersey(e.currentTarget.value)} />
        </label>
      </div>
      <span class="field-label">Likes playing (optional)</span>
      <div class="chips">
        {sport.positions.map((p) => (
          <button type="button" class={`chip ${positions.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)} title={p.label}>
            {p.short}
          </button>
        ))}
      </div>
      {error && <p class="error">{error}</p>}
      <div class="two">
        <button class="btn primary" type="submit">
          {player ? 'Save' : 'Add player'}
        </button>
        {player && (
          <button type="button" class="btn ghost" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
      <p class="tiny muted">No birth dates, photos or contact details are stored. Last initial only.</p>
    </form>
  );
}

export function Squad({ teamId }: { teamId: string }) {
  const players = useLive(() => svc.listPlayers(teamId, true), [teamId]);
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const [editing, setEditing] = useState<string | null>(null);
  if (!players || !team) return null;
  const sport = svc.sportOf(team);
  const active = players.filter((p) => p.active);
  const inactive = players.filter((p) => !p.active);
  const short = (id: string) => sport.positions.find((p) => p.id === id)?.short ?? id;

  async function remove(p: Player) {
    if (!sure(`Remove ${playerName(p)} from the squad? Their past minutes stay in the season numbers.`)) return;
    await svc.removePlayer(p.id);
  }

  return (
    <Page title="Squad" eyebrow={team.name} back={`team/${teamId}`}>
      {editing === null && <PlayerForm teamId={teamId} onDone={() => setEditing(null)} />}
      <Card>
        <h3>
          {active.length} player{active.length === 1 ? '' : 's'}
        </h3>
        {active.length === 0 && <Empty>No players yet.</Empty>}
        {active.map((p) =>
          editing === p.id ? (
            <PlayerForm teamId={teamId} player={p} onDone={() => setEditing(null)} />
          ) : (
            <div class="row">
              <Avatar player={p} />
              <span class="grow">
                {playerName(p)}
                {p.positions.length > 0 && <span class="tiny muted block">{p.positions.map(short).join(', ')}</span>}
              </span>
              <button class="icon-btn" onClick={() => setEditing(p.id)} aria-label={`Edit ${p.firstName}`}>
                ✎
              </button>
              <button class="icon-btn" onClick={() => remove(p)} aria-label={`Remove ${p.firstName}`}>
                ✕
              </button>
            </div>
          )
        )}
      </Card>
      {inactive.length > 0 && (
        <Card>
          <h3>Left the squad</h3>
          {inactive.map((p) => (
            <div class="row">
              <span class="grow muted">{playerName(p)}</span>
              <button class="btn small ghost" onClick={() => svc.restorePlayer(p.id)}>
                Bring back
              </button>
            </div>
          ))}
        </Card>
      )}
    </Page>
  );
}
