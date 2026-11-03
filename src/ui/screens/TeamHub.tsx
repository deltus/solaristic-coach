// Team hub: start a training or game, who needs attention, recent sessions, and the team's tools.

import { useState } from 'preact/hooks';
import { needsAttention, record, seasonStats, teamListText } from '../../logic/season';
import { niceDate, playerName } from '../../lib/format';
import { shareText } from '../../files';
import * as svc from '../../services';
import type { EventKind } from '../../types';
import { Card, Empty, Page, Stat } from '../components';
import { go, useLive } from '../hooks';

export function TeamHub({ teamId }: { teamId: string }) {
  const team = useLive(() => svc.getTeam(teamId), [teamId]);
  const season = useLive(() => svc.loadSeason(teamId), [teamId]);
  const [msg, setMsg] = useState('');
  if (!team || !season) return null;
  const sport = svc.sportOf(team);
  const active = season.players.filter((p) => p.active);
  const stats = seasonStats(season, sport);
  const attention = needsAttention(stats, season, sport).slice(0, 3);
  const rec = record(season.events);
  const events = [...season.events].sort((a, b) => b.date.localeCompare(a.date) || b.openedAt - a.openedAt);
  const open = events.find((e) => !e.closedAt);
  const byId = new Map(season.players.map((p) => [p.id, p]));

  async function start(kind: EventKind) {
    const ev = await svc.openEvent(teamId, kind);
    go(`event/${ev.id}`);
  }

  async function share() {
    const r = await shareText(teamListText(team!, active, sport.name), team!.name);
    setMsg(r === 'copied' ? 'Team list copied. Paste it into your group chat.' : r === 'failed' ? 'Sharing isn’t available here.' : '');
  }

  return (
    <Page
      title={team.name}
      eyebrow={`${team.ageGroup} · ${sport.name} · ${team.season}`}
      back="home"
      actions={
        <a class="icon-btn" href={`#/team/${teamId}/edit`} aria-label="Edit team">
          ✎
        </a>
      }
    >
      {open ? (
        <a class="banner" href={`#/event/${open.id}`}>
          <strong>{open.kind === 'game' ? 'Game' : 'Training'} in progress</strong>
          <span>Tap to continue</span>
        </a>
      ) : (
        <div class="two">
          <button class="btn primary big" onClick={() => start('training')} disabled={!active.length}>
            Start training
          </button>
          <button class="btn primary big" onClick={() => start('game')} disabled={!active.length}>
            Start game
          </button>
        </div>
      )}

      {!active.length && (
        <Card>
          <p>Add your players first.</p>
          <a class="btn primary" href={`#/team/${teamId}/squad`}>
            Add players
          </a>
        </Card>
      )}

      {rec.played > 0 && (
        <div class="stats">
          <Stat label="Played" value={rec.played} />
          <Stat label="Won" value={rec.won} />
          <Stat label="Drawn" value={rec.drawn} />
          <Stat label="Lost" value={rec.lost} />
        </div>
      )}

      {attention.length > 0 && (
        <Card>
          <h3>Needs attention</h3>
          {attention.map((a) => (
            <div class="attention">
              <strong>{playerName(byId.get(a.playerId)!)}</strong>
              <span class="small muted">{a.reasons.join(' · ')}</span>
            </div>
          ))}
        </Card>
      )}

      <div class="tool-grid">
        <a href={`#/team/${teamId}/squad`}>
          <span>👥</span>Squad ({active.length})
        </a>
        <a href={`#/team/${teamId}/season`}>
          <span>⏱</span>Season minutes
        </a>
        <a href={`#/team/${teamId}/builder`}>
          <span>⚖</span>Team builder
        </a>
        <a href={`#/team/${teamId}/drills`}>
          <span>📋</span>Drills
        </a>
        <a href={`#/team/${teamId}/summary`}>
          <span>🖨</span>Season summary
        </a>
        <button onClick={share} disabled={!active.length}>
          <span>💬</span>Share team list
        </button>
      </div>
      {msg && <p class="small muted center">{msg}</p>}

      <h2 class="section">Sessions and games</h2>
      {events.length === 0 && <Empty>Nothing yet. Start a training or a game above.</Empty>}
      {events.map((e) => (
        <a class="row tap event-row" href={`#/event/${e.id}`}>
          <span class={`kind ${e.kind}`}>{e.kind === 'game' ? 'G' : 'T'}</span>
          <span class="grow">
            <strong>{e.kind === 'game' ? `v ${e.opponent || 'Opponent'}` : 'Training'}</strong>
            <span class="small muted block">
              {niceDate(e.date)}
              {e.kind === 'game' &&
                ` · ${e.gameType === 'friendly' ? 'Friendly' : 'Competition'} · ${e.venue === 'away' ? 'Away' : 'Home'}`}
              {!e.closedAt && ' · open'}
            </span>
          </span>
          {e.kind === 'game' && e.scoreFor !== undefined && (
            <span class="score">
              {e.scoreFor}–{e.scoreAgainst}
            </span>
          )}
        </a>
      ))}
    </Page>
  );
}
