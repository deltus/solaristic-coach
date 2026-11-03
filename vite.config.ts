// Build, PWA and test settings. Copied from Radar: previews (VITE_PREVIEW=<branch>) get no service worker.
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the same build works at the site root, under /preview/<branch>/, or inside Android later.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    preact(),
    VitePWA({
      // Preview builds have no service worker, so they never cache or take over pages.
      disable: !!process.env.VITE_PREVIEW,
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Solaristic Coach',
        short_name: 'Coach',
        description: 'Fair game time, line-ups and attendance for junior sport coaches.',
        theme_color: '#0E1A3A',
        background_color: '#F4F0E8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Branch previews live under /preview/ on the same site: the live service worker must leave them alone.
        navigateFallbackDenylist: [/\/preview\//]
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000
  }
});
