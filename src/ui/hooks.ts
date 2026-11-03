// Shared hooks: live Dexie queries, settings, the hash router and a ticking clock. Copied from Radar.

import { useEffect, useState } from 'preact/hooks';
import { liveQuery } from 'dexie';
import { getSettings } from '../db';
import type { Settings } from '../types';

/** Re-runs a read-only Dexie query whenever the data it touches changes. */
export function useLive<T>(query: () => Promise<T> | T, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: (e) => console.error(e) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export function useSettings(): Settings | undefined {
  return useLive(() => getSettings(), []);
}

function parseHash(): string[] {
  const h = location.hash.replace(/^#\/?/, '');
  return h ? h.split('/').map(decodeURIComponent) : ['home'];
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string) {
  location.hash = `#/${path}`;
}

/** Re-renders every `ms` (for the game clock). Pass 0 to stop ticking. */
export function useTick(ms: number): number {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    if (!ms) return;
    const id = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/** Keeps the screen awake during a game where the browser supports it (Wake Lock API). */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } };
    let lock: Lock | null = null;
    const get = () =>
      nav.wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => {});
    get();
    const vis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      lock?.release().catch(() => {});
    };
  }, [on]);
}
