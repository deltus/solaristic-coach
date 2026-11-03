// Drag a player chip onto a field spot (any element with data-slot) or back to the bench
// (data-bench). Uses pointer events so it works with a finger; a press that doesn't move stays a
// tap, so tap-then-tap still works for anyone who finds dragging fiddly.

import { useRef } from 'preact/hooks';

const DRAG_START = 8;

export function useDragDrop(onDrop: (playerId: string, slotId: string | null) => void) {
  const state = useRef<{ id: string; x: number; y: number; ghost: HTMLElement | null; label: string } | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  function start(e: PointerEvent, id: string, label: string) {
    if (e.button !== 0) return;
    state.current = { id, x: e.clientX, y: e.clientY, ghost: null, label };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
  }

  function move(e: PointerEvent) {
    const s = state.current;
    if (!s) return;
    if (!s.ghost) {
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_START) return;
      s.ghost = document.createElement('div');
      s.ghost.className = 'drag-ghost';
      s.ghost.textContent = s.label;
      document.body.appendChild(s.ghost);
    }
    e.preventDefault();
    s.ghost.style.transform = `translate(${e.clientX - 30}px, ${e.clientY - 22}px)`;
    document.querySelectorAll('.slot.drop-over').forEach((el) => el.classList.remove('drop-over'));
    (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-slot]')?.classList.add('drop-over');
  }

  function cleanup() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', cancel);
    document.querySelectorAll('.slot.drop-over').forEach((el) => el.classList.remove('drop-over'));
    state.current?.ghost?.remove();
  }

  function end(e: PointerEvent) {
    const s = state.current;
    cleanup();
    state.current = null;
    if (!s?.ghost) return; // a tap, not a drag: the click handler deals with it
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const slot = el?.closest<HTMLElement>('[data-slot]')?.dataset.slot;
    if (slot) dropRef.current(s.id, slot);
    else if (el?.closest('[data-bench]')) dropRef.current(s.id, null);
    // Swallow the click that follows a drag.
    window.addEventListener('click', (c) => c.stopPropagation(), { capture: true, once: true });
  }

  function cancel() {
    cleanup();
    state.current = null;
  }

  return { start };
}
