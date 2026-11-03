// Generates the app icons (navy square, white circle, a green pitch with a centre line). Run: npm run icons
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

function svg(size, { circleRatio = 0.78, radius = 0 } = {}) {
  const c = size / 2;
  const r = (size * circleRatio) / 2;
  const w = r * 1.05;
  const h = r * 1.4;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#0E1A3A"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#fff"/>
    <rect x="${c - w / 2}" y="${c - h / 2}" width="${w}" height="${h}" rx="${w * 0.12}" fill="#2A6B5C"/>
    <g fill="none" stroke="#fff" stroke-width="${size * 0.018}">
      <rect x="${c - w / 2 + w * 0.08}" y="${c - h / 2 + w * 0.08}" width="${w * 0.84}" height="${h - w * 0.16}" rx="${w * 0.05}"/>
      <line x1="${c - w / 2 + w * 0.08}" y1="${c}" x2="${c + w / 2 - w * 0.08}" y2="${c}"/>
      <circle cx="${c}" cy="${c}" r="${w * 0.17}"/>
    </g>
  </svg>`);
}

const out = (size, opts, file) => sharp(svg(size, opts)).png().toFile(`public/icons/${file}`);
await out(192, { radius: 36 }, 'icon-192.png');
await out(512, { radius: 96 }, 'icon-512.png');
await out(512, { circleRatio: 0.62 }, 'maskable-512.png');
await out(180, { circleRatio: 0.8 }, 'apple-touch-icon.png');
await out(64, { radius: 14, circleRatio: 0.86 }, 'favicon-64.png');
console.log('Icons written to public/icons');
