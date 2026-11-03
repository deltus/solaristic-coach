// Settings: encrypted backup and restore, swipe animations, delete everything, and the privacy promise.

import { useState } from 'preact/hooks';
import { saveSettings } from '../../db';
import { download } from '../../files';
import { MIN_PASSPHRASE } from '../../logic/backupCrypto';
import * as svc from '../../services';
import { PREVIEW } from '../../preview';
import { Card, Page, sure } from '../components';
import { go, useSettings } from '../hooks';

function Backup() {
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function save(e: Event) {
    e.preventDefault();
    if (pass.length < MIN_PASSPHRASE) return setMsg(`Use at least ${MIN_PASSPHRASE} characters.`);
    if (pass !== again) return setMsg('The two passphrases don’t match.');
    setBusy(true);
    try {
      const file = await svc.createBackup(pass);
      download(new Blob([JSON.stringify(file)], { type: 'application/json' }), svc.backupFileName());
      setMsg('Backup saved to your Downloads. Keep the passphrase somewhere safe: without it the file can’t be opened.');
      setPass('');
      setAgain('');
    } catch (err) {
      setMsg((err as Error).message);
    }
    setBusy(false);
  }
  return (
    <form class="card" onSubmit={save}>
      <h3>Back up</h3>
      <p class="small muted">Saves everything to one file, locked with a passphrase you choose.</p>
      <input
        type="password"
        placeholder="Choose a passphrase"
        value={pass}
        onInput={(e) => setPass(e.currentTarget.value)}
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="Type it again"
        value={again}
        onInput={(e) => setAgain(e.currentTarget.value)}
        autoComplete="new-password"
      />
      <button class="btn primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save backup file'}
      </button>
      {msg && <p class="small">{msg}</p>}
    </form>
  );
}

function Restore() {
  const [file, setFile] = useState<File | null>(null);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  async function restore(e: Event) {
    e.preventDefault();
    if (!file) return setMsg('Pick a backup file first.');
    if (!sure('Restoring replaces everything on this phone with the backup. Continue?')) return;
    try {
      await svc.restoreBackup(JSON.parse(await file.text()), pass);
      setMsg('Restored.');
      go('home');
    } catch (err) {
      setMsg(err instanceof SyntaxError ? 'This file is not a Solaristic Coach backup.' : (err as Error).message);
    }
  }
  return (
    <form class="card" onSubmit={restore}>
      <h3>Restore</h3>
      <input type="file" accept=".coachbackup,application/json" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
      <input
        type="password"
        placeholder="Passphrase"
        value={pass}
        onInput={(e) => setPass(e.currentTarget.value)}
        autoComplete="current-password"
      />
      <button class="btn">Restore from backup</button>
      {msg && <p class="small">{msg}</p>}
    </form>
  );
}

export function SettingsScreen() {
  const settings = useSettings();
  if (!settings) return null;
  async function wipe() {
    if (!sure('Delete every team, player and session on this phone? Make a backup first if you might need it.')) return;
    if (!sure('Really delete everything? This can’t be undone.')) return;
    await svc.deleteAllData();
    go('home');
  }
  return (
    <Page title="Settings">
      <Card>
        <h3>Your data</h3>
        <p class="small">
          Everything is saved on this phone only. There are no accounts and nothing is sent anywhere unless you share or export it. Players
          are kept as a first name and last initial, and your ratings and notes are for you only.
        </p>
      </Card>
      <Backup />
      <Restore />
      <Card>
        <label class="toggle">
          <input
            type="checkbox"
            checked={settings.swipeAnimations}
            onChange={(e) => saveSettings({ swipeAnimations: e.currentTarget.checked })}
          />
          Swipe card animations
        </label>
      </Card>
      <button class="btn danger-ghost" onClick={wipe}>
        Delete everything on this phone
      </button>
      <p class="tiny muted center">
        Solaristic Coach {__APP_VERSION__}
        {PREVIEW ? ` · preview ${PREVIEW}` : ''}
      </p>
    </Page>
  );
}
