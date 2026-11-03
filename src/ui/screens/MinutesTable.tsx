// Minutes played this game per player, with a bar against their fair share and the positions
// they've played. Also shows the check that the minutes add up (game time × players on field).

import type { Sport } from '../../config/sports';
import { minutesByPlayer, positionsByPlayer, totalPlayerMs } from '../../logic/gameTime';
import { clockText, minutes } from '../../lib/format';
import type { Player, Stint } from '../../types';
import { Card } from '../components';

export function MinutesTable({
  players,
  stints,
  now,
  sport,
  share
}: {
  players: Player[];
  stints: Stint[];
  now: number;
  sport: Sport;
  share: number;
}) {
  const mins = minutesByPlayer(stints, now);
  const pos = positionsByPlayer(stints, now);
  const short = (id: string) => sport.positions.find((p) => p.id === id)?.short ?? id;
  const rows = [...players].sort((a, b) => (mins.get(a.id) ?? 0) - (mins.get(b.id) ?? 0));
  const max = Math.max(share, ...rows.map((p) => mins.get(p.id) ?? 0), 1);
  const total = totalPlayerMs(stints, now);
  return (
    <Card>
      <div class="row-head">
        <h3>Minutes this game</h3>
        <span class="small muted">fair share ≈ {minutes(share)}m</span>
      </div>
      {rows.map((p) => {
        const m = mins.get(p.id) ?? 0;
        const where = [...(pos.get(p.id)?.entries() ?? [])].filter(([, ms]) => ms >= 30000).map(([id]) => short(id));
        return (
          <div class="minutes-row">
            <span class="name">{p.firstName}</span>
            <span class="bar-wrap">
              <span class={`bar ${m < share * 0.8 ? 'low' : ''}`} style={{ width: `${(m / max) * 100}%` }} />
              <span class="share-mark" style={{ left: `${(share / max) * 100}%` }} />
            </span>
            <span class="mins">{minutes(m)}m</span>
            <span class="tiny muted where">{where.join(' ')}</span>
          </div>
        );
      })}
      <p class="tiny muted">
        Check: {minutes(total)} player-minutes on the field. {clockText(now)} played × {sport.onField} spots ={' '}
        {minutes(now * sport.onField)}
        {Math.abs(total - now * sport.onField) > 60000 ? ' (less, because a spot was empty for a while)' : ' ✓'}
      </p>
    </Card>
  );
}
