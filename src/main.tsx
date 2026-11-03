// Entry point: render the app, the preview banner (previews only) and the offline service worker
// (live web build only, never in previews). Same shape as Radar's src/main.tsx without sync.
import { render } from 'preact';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/base.css';
import './styles/controls.css';
import './styles/screens.css';
import './styles/game.css';
import { App } from './ui/App';
import { PREVIEW } from './preview';
import { PreviewBanner } from './ui/PreviewBanner';

render(<App />, document.getElementById('app')!);

if (PREVIEW) {
  const strip = document.createElement('div');
  document.body.prepend(strip);
  render(<PreviewBanner />, strip);
}

if (!PREVIEW && 'serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() {
        if (confirm('A new version of Solaristic Coach is available. Update now? (Your data is not affected.)')) update(true);
      }
    });
  });
}
