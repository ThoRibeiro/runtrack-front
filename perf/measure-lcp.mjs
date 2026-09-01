// Mesure le LCP de l'export de production, en 4G simulée (§14).
//
//   pnpm --filter @runtrack/web build
//   (cd apps/web && pnpm exec serve dist --single --listen 4173 &)
//   node perf/measure-lcp.mjs
//
// Trois passages bridés puis un sans bridage : c'est l'écart entre les deux qui
// dit si le temps part dans le transfert ou dans le rendu.
import { chromium } from '@playwright/test';

const URL = process.env.LCP_URL ?? 'http://127.0.0.1:4173/sign-in';

async function measure(throttled) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Aucun back-end : la mesure porte sur le chargement, pas sur les données.
  await page.route('**/localhost:8080/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  if (throttled) {
    const session = await page.context().newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150,
    });
  }

  await page.goto(URL, { waitUntil: 'load' });
  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]?.startTime ?? 0);
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(0), 8000);
      }),
  );
  await browser.close();
  return Math.round(lcp);
}

const throttled = [];
for (let run = 0; run < 3; run += 1) throttled.push(await measure(true));
const unthrottled = await measure(false);

console.log(`4G simulée : ${throttled.join(' / ')} ms`);
console.log(`sans bridage : ${unthrottled} ms`);
console.log('§14 vise 2 500 ms ; voir perf/budget.json pour l’écart et sa raison.');
