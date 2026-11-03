// The roll on a session or game: everyone starts as "here". Tap a player to open big buttons for
// late, sick, injured, away or no-show; tap one and the row closes again. One-handed.

import { useState } from 'preact/hooks';
import { ROLL_CHOICES } from '../config/coaching';
import { byName, playerName } from '../lib/format';
import { isPresent, rollChoiceOf, rollLabel } from '../logic/checks';
import * as svc from '../services';
import type { Attendance, Player } from '../types';
import { Avatar, Card } from './components';
import { haptic } from './Swipe';

export function Roll({ eventId, players, att }: { eventId: string; players: Player[]; att: Attendance[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const byPlayer = new Map(att.map((a) => [a.playerId, a]));
  const sorted = [...players].sort(byName);
  const here = att.filter((a) => a.status === 'here').length;
  const late = att.filter((a) => a.status === 'late').length;
  const absent = att.filter((a) => !isPresent(a)).length;
  const unmarked = players.filter((p) => !byPlayer.has(p.id));

  return (
    <Card>
      <div class="row-head">
        <h3>Roll</h3>
        <span class="small muted">
          {here} here · {late} late · {absent} absent
        </span>
      </div>
      <p class="tiny muted">Everyone starts as here. Tap anyone who’s missing or late.</p>
      {sorted.map((p) => {
        const a = byPlayer.get(p.id);
        const choice = a ? rollChoiceOf(a) : null;
        const isOpen = open === p.id;
        return (
          <div class={`roll-row ${isOpen ? 'open' : ''}`}>
            <button type="button" class="row tap roll-line" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
              <Avatar player={p} />
              <span class="grow">{playerName(p)}</span>
              <span class={`roll-pill ${a ? (isPresent(a) ? a.status : 'absent') : 'unmarked'}`}>{a ? rollLabel(a) : 'Not marked'}</span>
            </button>
            {isOpen && (
              <div class="roll-choices">
                {ROLL_CHOICES.map((c) => (
                  <button
                    type="button"
                    class={`roll-choice ${c.id} ${choice === c.id ? 'on' : ''}`}
                    aria-pressed={choice === c.id}
                    onClick={() => {
                      haptic();
                      void svc.setAttendance(eventId, p.id, c.id);
                      setOpen(null);
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {unmarked.length > 0 && (
        <button
          class="btn ghost"
          onClick={() =>
            svc.markRestHere(
              eventId,
              unmarked.map((p) => p.id)
            )
          }
        >
          Mark {unmarked.length === 1 ? unmarked[0].firstName : `the other ${unmarked.length}`} here
        </button>
      )}
    </Card>
  );
}
