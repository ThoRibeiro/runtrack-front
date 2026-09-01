/**
 * Renders the app icons from the same path the `Logo` component draws.
 *
 * The point is that there is one source: a designer's exported PNG drifts from
 * the component the first time either is touched, and nothing catches it. Run
 * with `pnpm logo` after changing the mark.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Kept in step with packages/ui/src/components/Logo.tsx by logo.assets.test.ts.
const TRACE = 'M13 44 L24 30 L32 36 L45 18';
const HEAD = { x: 45, y: 18, r: 6.6 };
const ACCENT = '#2563EB';

const svg = ({ fill, stroke, corner, pad = 0, bleed = false }) => {
  const g = 64;
  const box = g + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}" viewBox="${-pad} ${-pad} ${box} ${box}">
  ${fill ? `<rect x="${-pad}" y="${-pad}" width="${box}" height="${box}" rx="${bleed ? 0 : corner}" fill="${fill}"/>` : ''}
  <path d="${TRACE}" stroke="${stroke}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="${HEAD.x}" cy="${HEAD.y}" r="${HEAD.r}" fill="${stroke}"/>
</svg>`;
};

/** Rounded on iOS is wrong — the platform masks it itself, so the tile bleeds to the edge. */
const ICON = svg({ fill: ACCENT, stroke: '#FFFFFF', corner: 15, bleed: true });
/** Android masks an adaptive foreground to its own shape, so the mark needs margin. */
const ADAPTIVE = svg({ fill: null, stroke: '#FFFFFF', corner: 0, pad: 20 });
const FAVICON = svg({ fill: ACCENT, stroke: '#FFFFFF', corner: 15 });
const SPLASH = svg({ fill: null, stroke: '#FFFFFF', corner: 0, pad: 10 });

const TARGETS = [
  { file: 'apps/mobile/assets/icon.png', source: ICON, size: 1024 },
  { file: 'apps/mobile/assets/adaptive-icon.png', source: ADAPTIVE, size: 1024 },
  { file: 'apps/mobile/assets/splash-icon.png', source: SPLASH, size: 512 },
  { file: 'apps/web/public/favicon.png', source: FAVICON, size: 256 },
  { file: 'apps/web/public/apple-touch-icon.png', source: ICON, size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, source, size } of TARGETS) {
  const target = join(ROOT, file);
  await mkdir(dirname(target), { recursive: true });
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">${source.replace('<svg ', `<svg style="display:block;width:${size}px;height:${size}px" `)}</body>`,
  );
  await page.screenshot({ path: target, omitBackground: true });
  console.log(`${file}  ${size}×${size}`);
}
await browser.close();

await writeFile(join(ROOT, 'apps/web/public/favicon.svg'), `${FAVICON}\n`, 'utf8');
console.log('apps/web/public/favicon.svg');
