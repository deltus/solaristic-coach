// "Something to note" about one player: big chips to tick (from src/config/checks.ts), a player
// picker for "Conflict with…", the child-safety prompt for wellbeing chips, and an optional voice
// note. Used after a swipe right on the check card and by "Log now". No typing.

import { useState } from 'preact/hooks';
import { CHIP_GROUPS, SAFETY_PROMPT } from '../config/checks';
import { playerName } from '../lib/format';
import { needsSafetyPrompt } from '../logic/checks';
import type { Player } from '../types';
import { Avatar } from './components';
import { VoiceNote } from './VoiceNote';

export function ChipSheet({
  eventId,
  player,
  others,
  chips: initial = [],
  conflictWith: initialWith = [],
  saveLabel = 'Save note',
  onSave,
  onCancel
}: {
  eventId: string;
  player: Player;
  /** Other players at the session, for "Conflict with…". */
  others: Player[];
  chips?: string[];
  conflictWith?: string[];
  saveLabel?: string;
  onSave: (chips: string[], conflictWith: string[]) => void;
  onCancel: () => void;
}) {
  const [chips, setChips] = useState<string[]>(initial);
  const [withIds, setWithIds] = useState<string[]>(initialWith);
  const [picking, setPicking] = useState(false);
  const toggle = (id: string) => setChips((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleWith = (id: string) => {
    const next = withIds.includes(id) ? withIds.filter((x) => x !== id) : [...withIds, id];
    setWithIds(next);
    setChips((c) => (next.length ? [...new Set([...c, 'conflict'])] : c.filter((x) => x !== 'conflict')));
  };
  const nameOf = (id: string) => others.find((p) => p.id === id)?.firstName ?? '?';

  return (
    <div class="chip-sheet card-enter">
      <div class="rate-head">
        <Avatar player={player} size="lg" />
        <div>
          <span class="eyebrow">Something to note</span>
          <h2 class="card-name">{playerName(player)}</h2>
        </div>
      </div>
      {CHIP_GROUPS.map((g) => (
        <div class="chip-group">
          <span class="field-label">{g.label}</span>
          <div class="chips big-chips">
            {g.chips.map((c) => {
              const on = chips.includes(c.id);
              const label = c.pickPlayer && withIds.length ? `Conflict with ${withIds.map(nameOf).join(', ')}` : c.label;
              return (
                <button
                  type="button"
                  class={`chip ${on ? `on tone-${c.tone}` : ''}`}
                  aria-pressed={on}
                  onClick={() => (c.pickPlayer ? setPicking(!picking) : toggle(c.id))}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {g.chips.some((c) => c.pickPlayer) && picking && (
            <div class="picker">
              <span class="tiny muted">Who with?</span>
              <div class="chips big-chips">
                {others.map((o) => (
                  <button type="button" class={`chip ${withIds.includes(o.id) ? 'on tone-red' : ''}`} onClick={() => toggleWith(o.id)}>
                    {o.firstName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {needsSafetyPrompt(chips) && (
        <p class="safety" role="note">
          ⚠ {SAFETY_PROMPT}
        </p>
      )}
      <VoiceNote eventId={eventId} playerId={player.id} />
      <div class="two sheet-actions">
        <button type="button" class="btn big" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" class="btn primary big" disabled={!chips.length} onClick={() => onSave(chips, withIds)}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
