// Create or edit a team: name, sport, season, age group, and the team's own numbers (players on
// the field, periods, minutes). A custom sport takes all three from the coach.

import { useEffect, useState } from 'preact/hooks';
import { AGE_GROUPS } from '../../config/coaching';
import { CUSTOM_SPORT_ID, onFieldChoices, sportById, SPORTS, teamSport } from '../../config/sports';
import * as svc from '../../services';
import type { Team } from '../../types';
import { Card, Page, sure } from '../components';
import { go } from '../hooks';

function defaultSeason(d = new Date()): string {
  const m = d.getMonth();
  return `${m >= 3 && m <= 8 ? 'Winter' : 'Summer'} ${d.getFullYear()}`;
}

export function TeamForm({ teamId }: { teamId?: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('soccer');
  const [season, setSeason] = useState(defaultSeason());
  const [ageGroup, setAgeGroup] = useState('U10');
  const [onField, setOnField] = useState<number | undefined>(undefined);
  const [periods, setPeriods] = useState<number | undefined>(undefined);
  const [periodMinutes, setPeriodMinutes] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teamId) return;
    svc.getTeam(teamId).then((t) => {
      if (!t) return;
      setTeam(t);
      setName(t.name);
      setSportId(t.sportId);
      setSeason(t.season);
      setAgeGroup(t.ageGroup);
      setOnField(t.overrides.onField);
      setPeriods(t.overrides.periods);
      setPeriodMinutes(t.overrides.periodMinutes);
    });
  }, [teamId]);

  const custom = sportId === CUSTOM_SPORT_ID;
  const base = sportById(sportId);
  const sport = teamSport(sportId, { onField, periods, periodMinutes });
  const choices = onFieldChoices(custom ? CUSTOM_SPORT_ID : sportId);

  async function save(e: Event) {
    e.preventDefault();
    if (!name.trim()) return setError('Give your team a name.');
    const overrides = { onField: sport.onField, periods: sport.periods, periodMinutes: sport.periodMinutes };
    const input = { name: name.trim(), sportId, season: season.trim() || defaultSeason(), ageGroup, overrides };
    if (team) {
      await svc.updateTeam(team.id, input);
      go(`team/${team.id}`);
    } else {
      const t = await svc.createTeam(input);
      go(`team/${t.id}/squad`);
    }
  }

  async function remove() {
    if (!team || !sure(`Delete ${team.name} and everything recorded for it? This can't be undone.`)) return;
    await svc.deleteTeam(team.id);
    go('home');
  }

  return (
    <Page title={team ? 'Edit team' : 'New team'} back={team ? `team/${team.id}` : 'home'}>
      <form onSubmit={save}>
        <Card>
          <label class="field-label">
            Team name
            <input value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="e.g. Riverside Rockets" maxLength={40} />
          </label>
          <label class="field-label">
            Sport
            <select
              value={sportId}
              onChange={(e) => {
                setSportId(e.currentTarget.value);
                setOnField(undefined);
                setPeriods(undefined);
                setPeriodMinutes(undefined);
              }}
            >
              {SPORTS.map((s) => (
                <option value={s.id}>{s.name}</option>
              ))}
              <option value={CUSTOM_SPORT_ID}>Another sport (custom)</option>
            </select>
          </label>
          <div class="two">
            <label class="field-label">
              Season
              <input value={season} onInput={(e) => setSeason(e.currentTarget.value)} placeholder="Winter 2027" maxLength={30} />
            </label>
            <label class="field-label">
              Age group
              <select value={ageGroup} onChange={(e) => setAgeGroup(e.currentTarget.value)}>
                {AGE_GROUPS.map((a) => (
                  <option>{a}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <h3>How your games are played</h3>
          <p class="small muted">
            {custom ? 'Set these for your sport.' : `Usual for ${base?.name}; change them to match your competition.`}
          </p>
          <label class="field-label">
            Players on the field
            <select value={sport.onField} onChange={(e) => setOnField(Number(e.currentTarget.value))}>
              {choices.map((n) => (
                <option value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div class="two">
            <label class="field-label">
              Periods
              <select value={sport.periods} onChange={(e) => setPeriods(Number(e.currentTarget.value))}>
                <option value={1}>1 (one block)</option>
                <option value={2}>2 halves</option>
                <option value={3}>3 thirds</option>
                <option value={4}>4 quarters</option>
              </select>
            </label>
            <label class="field-label">
              Minutes each
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={sport.periodMinutes}
                onInput={(e) => setPeriodMinutes(Math.max(1, Math.min(120, Number(e.currentTarget.value) || 1)))}
              />
            </label>
          </div>
        </Card>

        {error && <p class="error">{error}</p>}
        <button class="btn primary big" type="submit">
          {team ? 'Save' : 'Create team and add players'}
        </button>
        {team && (
          <button type="button" class="btn danger-ghost" onClick={remove}>
            Delete this team
          </button>
        )}
      </form>
    </Page>
  );
}
