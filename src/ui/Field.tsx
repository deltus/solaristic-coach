// The field drawing (pitch, oval, court, netball court, cricket ground) with a tappable spot for
// each position. Used by the line-up editor and the live game screen. Spots carry data-slot so a
// dragged player can be dropped on them (see useDragDrop in LineupScreen).

import type { ComponentChildren } from 'preact';
import type { FieldShape, Sport } from '../config/sports';
import { initials } from '../lib/format';
import type { Player } from '../types';

function Lines({ shape }: { shape: FieldShape }) {
  const line = { fill: 'none', stroke: 'rgba(255,255,255,0.75)', 'stroke-width': 0.8 };
  switch (shape) {
    case 'oval':
      return (
        <g {...line}>
          <ellipse cx="50" cy="70" rx="47" ry="67" />
          <rect x="42" y="62" width="16" height="16" />
          <circle cx="50" cy="70" r="5" />
          <path d="M 28 10 A 22 22 0 0 0 72 10" />
          <path d="M 28 130 A 22 22 0 0 1 72 130" />
        </g>
      );
    case 'court':
      return (
        <g {...line}>
          <rect x="4" y="4" width="92" height="132" />
          <line x1="4" y1="70" x2="96" y2="70" />
          <circle cx="50" cy="70" r="9" />
          <rect x="35" y="4" width="30" height="30" />
          <path d="M 12 4 L 12 18 A 38 38 0 0 0 88 18 L 88 4" />
          <rect x="35" y="106" width="30" height="30" />
        </g>
      );
    case 'netball':
      return (
        <g {...line}>
          <rect x="4" y="4" width="92" height="132" />
          <line x1="4" y1="48" x2="96" y2="48" />
          <line x1="4" y1="92" x2="96" y2="92" />
          <circle cx="50" cy="70" r="4" />
          <path d="M 30 4 A 20 20 0 0 0 70 4" />
          <path d="M 30 136 A 20 20 0 0 1 70 136" />
        </g>
      );
    case 'cricket':
      return (
        <g {...line}>
          <ellipse cx="50" cy="70" rx="47" ry="66" />
          <ellipse cx="50" cy="70" rx="24" ry="34" stroke-dasharray="2 2" />
          <rect x="46" y="56" width="8" height="28" fill="rgba(222,200,150,0.7)" />
        </g>
      );
    default:
      return (
        <g {...line}>
          <rect x="4" y="4" width="92" height="132" />
          <line x1="4" y1="70" x2="96" y2="70" />
          <circle cx="50" cy="70" r="10" />
          <rect x="26" y="4" width="48" height="18" />
          <rect x="38" y="4" width="24" height="7" />
          <rect x="26" y="118" width="48" height="18" />
          <rect x="38" y="129" width="24" height="7" />
        </g>
      );
  }
}

export function FieldDrawing({ shape }: { shape: FieldShape }) {
  const grass = shape === 'court' ? '#b9774a' : shape === 'netball' ? '#3d6f8f' : '#3f8a5c';
  return (
    <svg class="field-svg" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="100" height="140" rx="4" fill={grass} />
      <Lines shape={shape} />
    </svg>
  );
}

export function Field({
  sport,
  assigned,
  players,
  selected,
  onSlot,
  note,
  children
}: {
  sport: Sport;
  /** position id → player id */
  assigned: Record<string, string>;
  players: Map<string, Player>;
  selected?: string | null;
  onSlot?: (positionId: string) => void;
  /** Extra line under a placed player (e.g. minutes played). */
  note?: (playerId: string) => string | undefined;
  children?: ComponentChildren;
}) {
  return (
    <div class={`field shape-${sport.field}`}>
      <FieldDrawing shape={sport.field} />
      {sport.positions.map((pos) => {
        const p = players.get(assigned[pos.id] ?? '');
        const extra = p && note?.(p.id);
        return (
          <button
            type="button"
            class={`slot ${p ? 'filled' : ''} ${selected === pos.id || (p && selected === p.id) ? 'selected' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            data-slot={pos.id}
            onClick={() => onSlot?.(pos.id)}
            aria-label={`${pos.label}: ${p ? p.firstName : 'empty'}`}
          >
            <span class="slot-dot">{p ? (p.jersey ?? initials(p)) : pos.short}</span>
            <span class="slot-name">{p ? p.firstName : pos.short}</span>
            {extra && <span class="slot-note">{extra}</span>}
          </button>
        );
      })}
      {children}
    </div>
  );
}
