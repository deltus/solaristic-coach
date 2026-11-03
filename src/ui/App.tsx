// The app shell: a hash router and the bottom bar. Each screen is in src/ui/screens/.
//   #/home                 teams, open sessions, reminders
//   #/team/new             create a team          #/team/<id>/edit     edit it
//   #/team/<id>            team hub               #/team/<id>/squad    players
//   #/team/<id>/season     minutes and positions  #/team/<id>/summary  printable season summary
//   #/team/<id>/builder    team builder           #/team/<id>/drills   drills library
//   #/event/<id>           a session or game      #/event/<id>/lineup  line-up editor
//   #/event/<id>/live      game time and subs     #/event/<id>/rate    quick ratings
//   #/settings             backup, restore, privacy

import { useRoute } from './hooks';
import { Home } from './screens/Home';
import { TeamForm } from './screens/TeamForm';
import { TeamHub } from './screens/TeamHub';
import { Squad } from './screens/Squad';
import { EventScreen } from './screens/EventScreen';
import { LineupScreen } from './screens/LineupScreen';
import { LiveGame } from './screens/LiveGame';
import { RateScreen } from './screens/RateScreen';
import { SeasonView } from './screens/SeasonView';
import { SeasonSummary } from './screens/SeasonSummary';
import { TeamBuilder } from './screens/TeamBuilder';
import { DrillsLibrary } from './screens/DrillsLibrary';
import { SettingsScreen } from './screens/Settings';

function Screen({ route }: { route: string[] }) {
  const [a, id, sub, extra] = route;
  if (a === 'team' && id === 'new') return <TeamForm />;
  if (a === 'team' && id) {
    if (sub === 'edit') return <TeamForm teamId={id} />;
    if (sub === 'squad') return <Squad teamId={id} />;
    if (sub === 'season') return <SeasonView teamId={id} />;
    if (sub === 'summary') return <SeasonSummary teamId={id} />;
    if (sub === 'builder') return <TeamBuilder teamId={id} />;
    if (sub === 'drills') return <DrillsLibrary teamId={id} eventId={extra} />;
    return <TeamHub teamId={id} />;
  }
  if (a === 'event' && id) {
    if (sub === 'lineup') return <LineupScreen eventId={id} />;
    if (sub === 'live') return <LiveGame eventId={id} />;
    if (sub === 'rate') return <RateScreen eventId={id} />;
    return <EventScreen eventId={id} />;
  }
  if (a === 'settings') return <SettingsScreen />;
  return <Home />;
}

export function App() {
  const route = useRoute();
  const printable = route[0] === 'team' && route[2] === 'summary';
  return (
    <div class={`app ${printable ? 'printable' : ''}`}>
      <Screen route={route} />
      {!printable && (
        <nav class="bottom-bar" aria-label="Main">
          <a href="#/home" class={route[0] === 'home' ? 'on' : ''}>
            <span aria-hidden="true">⌂</span>Teams
          </a>
          <a href="#/settings" class={route[0] === 'settings' ? 'on' : ''}>
            <span aria-hidden="true">⚙</span>Settings
          </a>
        </nav>
      )}
    </div>
  );
}
