// Small shared pieces: page header, cards, segmented choice, player avatar, empty state.

import type { ComponentChildren } from 'preact';
import { initials, playerName } from '../lib/format';
import type { Player } from '../types';

export function Page({
  title,
  eyebrow,
  back,
  actions,
  children
}: {
  title: string;
  eyebrow?: string;
  back?: string;
  actions?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <main class="page">
      <header class="page-head">
        {back !== undefined && (
          <a class="back" href={`#/${back}`} aria-label="Back">
            ‹
          </a>
        )}
        <div class="page-title">
          {eyebrow && <span class="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
        </div>
        {actions && <div class="page-actions">{actions}</div>}
      </header>
      {children}
    </main>
  );
}

export function Card({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return <section class={`card ${cls}`}>{children}</section>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.id} class={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({
  player,
  size = 'md'
}: {
  player: Pick<Player, 'firstName' | 'lastInitial' | 'jersey'>;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span class={`avatar ${size}`} aria-hidden="true">
      {player.jersey !== undefined ? player.jersey : initials(player)}
    </span>
  );
}

export function PlayerLine({ player, children, onClick }: { player: Player; children?: ComponentChildren; onClick?: () => void }) {
  const body = (
    <>
      <Avatar player={player} />
      <span class="grow">{playerName(player)}</span>
      {children}
    </>
  );
  return onClick ? (
    <button type="button" class="row tap" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div class="row">{body}</div>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="empty muted">{children}</p>;
}

export function Stat({ label, value }: { label: string; value: ComponentChildren }) {
  return (
    <div class="stat">
      <span class="stat-value">{value}</span>
      <span class="stat-label">{label}</span>
    </div>
  );
}

/** Asks before something that can't be undone. */
export const sure = (msg: string) => confirm(msg);
