// Bright strip on every screen of a branch preview, so nobody mistakes it for the live app.
// Copied from Radar; the demo button adds the fictional U11 soccer team.
import { useState } from 'preact/hooks';
import { loadDemoData } from '../demo';
import { PREVIEW } from '../preview';

export function PreviewBanner() {
  const [busy, setBusy] = useState(false);
  if (!PREVIEW) return null;
  async function demo() {
    if (!confirm('Add the fictional demo team (Riverside Rockets, U11 soccer) to this preview?')) return;
    setBusy(true);
    const team = await loadDemoData();
    location.hash = `#/team/${team.id}`;
    location.reload();
  }
  return (
    <div class="preview-banner" role="status">
      <span>PREVIEW · {PREVIEW} · not the live app · test data only</span>
      <button onClick={demo} disabled={busy}>
        {busy ? 'Loading…' : 'Load demo team'}
      </button>
    </div>
  );
}
