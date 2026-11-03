// Team builder for scrims and training games: split the squad into 2–4 balanced teams using
// ratings and preferred positions. Shuffle for a different split; tap two players to swap them,
// or a player then a team name to move them. Simple maths on the device, no AI.

import { useState } from 'preact/hooks';
import { TEAM_COUNTS } from '../../config/coaching';
import { seeded } from '../../logic/random';
import { balanceTeams, movePlayer, strengthFrom, swapPlayers, TEAM_NAMES } from '../../logic/teamBuilder';
import { byName } from '../../lib/format';
import { shareText } from '../../files';
import * as svc from '../../services';
import { Card, Page, Segmented } from '../components';
import { useLive } from '../hooks';

export function TeamBuilder({ teamId }: { teamId: string }) {
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const season = useLive(() => svc.loadSeason(teamId), [teamId]);
  const open = useLive(async () => (await svc.openEvents()).find((e) => e.teamId === teamId), [teamId]);
  const att = useLive(async () => (open ? svc.attendanceFor(open.id) : []), [open?.id]);
  const [count, setCount] = useState(2);
  const [out, setOut] = useState<Set<string> | null>(null);
  const [teams, setTeams] = useState<string[][] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);
  const [msg, setMsg] = useState('');
  if (!team || !season || !att) return null;

  const sport = svc.sportOf(team);
  const players = season.players.filter((p) => p.active).sort(byName);
  const byId = new Map(players.map((p) => [p.id, p]));
  // Who's sitting out: the coach's choice, or whoever is marked away at an open session.
  const sitting = out ?? new Set(att.filter((a) => a.status === 'away').map((a) => a.playerId));
  const playing = players.filter((p) => !sitting.has(p.id));
  const roleOf = (posId?: string) => sport.positions.find((p) => p.id === posId)?.role ?? 'any';

  function build(nextSeed = seed, k = count) {
    const pool = playing.map((p) => ({
      id: p.id,
      strength: strengthFrom(season!.ratings.filter((r) => r.playerId === p.id)),
      role: roleOf(p.positions[0])
    }));
    setTeams(balanceTeams(pool, k, seeded(nextSeed), nextSeed === 1 ? 0 : 0.4).map((t) => t.map((p) => p.id)));
    setSel(null);
  }

  function tapPlayer(id: string) {
    if (!teams) return;
    if (sel && sel !== id) {
      setTeams(swapPlayers(teams, sel, id));
      return setSel(null);
    }
    setSel(sel === id ? null : id);
  }

  async function share() {
    if (!teams) return;
    const text = teams.map((t, i) => `${TEAM_NAMES[i]}: ${t.map((id) => byId.get(id)?.firstName).join(', ')}`).join('\n');
    const r = await shareText(text, 'Teams');
    setMsg(r === 'copied' ? 'Teams copied.' : '');
  }

  return (
    <Page title="Team builder" eyebrow={team.name} back={`team/${teamId}`}>
      <Card>
        <h3>Who’s playing ({playing.length})</h3>
        <div class="chips">
          {players.map((p) => (
            <button
              type="button"
              class={`chip ${sitting.has(p.id) ? '' : 'on'}`}
              onClick={() => {
                const next = new Set(sitting);
                if (next.has(p.id)) next.delete(p.id);
                else next.add(p.id);
                setOut(next);
                setTeams(null);
              }}
            >
              {p.firstName}
            </button>
          ))}
        </div>
        <Segmented
          label="How many teams"
          value={String(count)}
          options={TEAM_COUNTS.map((n) => ({ id: String(n), label: `${n} teams` }))}
          onChange={(v) => {
            setCount(Number(v));
            if (teams) build(seed, Number(v));
          }}
        />
        <div class="two">
          <button class="btn primary" onClick={() => build()} disabled={playing.length < count}>
            Make teams
          </button>
          <button
            class="btn ghost"
            disabled={!teams}
            onClick={() => {
              const s = seed + 1;
              setSeed(s);
              build(s);
            }}
          >
            🔀 Shuffle
          </button>
        </div>
        <p class="tiny muted">Balanced on your recent ratings and players’ preferred positions. Ratings are never shown here.</p>
      </Card>

      {teams && (
        <>
          <p class="small muted center">
            {sel
              ? `Tap another player to swap with ${byId.get(sel)?.firstName}, or a team name to move them.`
              : 'Tap two players to swap them.'}
          </p>
          <div class={`teams teams-${teams.length}`}>
            {teams.map((t, i) => (
              <Card class="team-col">
                <button
                  type="button"
                  class="team-name"
                  onClick={() => {
                    if (!sel) return;
                    setTeams(movePlayer(teams, sel, i));
                    setSel(null);
                  }}
                >
                  {TEAM_NAMES[i]} ({t.length})
                </button>
                {t.map((id) => (
                  <button type="button" class={`player-chip block ${sel === id ? 'selected' : ''}`} onClick={() => tapPlayer(id)}>
                    {byId.get(id)?.firstName}
                  </button>
                ))}
              </Card>
            ))}
          </div>
          <button class="btn ghost" onClick={share}>
            Share teams
          </button>
          {msg && <p class="small muted center">{msg}</p>}
        </>
      )}
    </Page>
  );
}
