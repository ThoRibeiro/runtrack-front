import type { Page } from '@playwright/test';

/**
 * A back-end, stubbed at the network boundary.
 *
 * The suite is about screens, contrast and keyboard order — not about the
 * server, which has its own tests. Intercepting here keeps the run to a few
 * seconds and makes it deterministic, which is what gets a suite actually run.
 *
 * The shapes are the server's own, taken from the OpenAPI description the
 * types are generated from: a stub that drifts from the contract tests nothing.
 */
const NOW = new Date().toISOString();

const ACTIVITY = {
  id: 'a1',
  ownerId: 'u-1',
  type: 'RUN',
  title: 'Sortie du matin',
  visibility: 'FOLLOWERS',
  status: 'Finished',
  startedAt: NOW,
  endedAt: NOW,
  stats: {
    distanceMeters: 12_400,
    elapsedSeconds: 3_862,
    movingTimeSeconds: 3_720,
    averagePaceSecondsPerKm: 300,
    elevationGain: 284,
    elevationLoss: 260,
  },
};

const ROUTES: { pattern: RegExp; body: unknown }[] = [
  {
    pattern: /\/feed\/v1/,
    body: {
      items: [{ ...ACTIVITY, author: { id: 'u-2', handle: 'camille', displayName: 'Camille' } }],
    },
  },
  {
    pattern: /\/race\/v1\/[^/]+\/likes/,
    body: { total: 3, likedByViewer: false, recentUserIds: [] },
  },
  { pattern: /\/race\/v1\/[^/]+\/comments/, body: { items: [], total: 0 } },
  { pattern: /\/race\/v1\/[^/]+\/splits/, body: { items: [] } },
  { pattern: /\/race\/v1\/[^/]+\/track/, body: { polyline: '', pointCount: 0 } },
  { pattern: /\/race\/v1\/[^/]+$/, body: ACTIVITY },
  {
    pattern: /\/user\/v1\/me\/stats/,
    body: {
      distanceMeters: 27_200,
      activityCount: 4,
      movingTimeSeconds: 8_400,
      elevationGain: 412,
    },
  },
  {
    pattern: /\/user\/v1\/me/,
    body: {
      id: 'u-1',
      handle: 'thomas',
      displayName: 'Thomas',
      email: 'thomas@example.test',
      status: 'ACTIVE',
    },
  },
  { pattern: /\/notification\/v1\/unread-count/, body: { unread: 2 } },
  { pattern: /\/notification\/v1/, body: { items: [] } },
];

/**
 * Marque la présentation comme vue.
 *
 * Un navigateur de test est une installation neuve à chaque fois, donc il verrait
 * l'écran de bienvenue — ce qui est le comportement voulu, et testé à part dans
 * `journeys.spec.ts`. Les autres tests posent la préférence pour aller droit à
 * ce qu'ils examinent.
 */
export async function skipWelcome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem(
      'runtrack-preferences',
      JSON.stringify({ theme: 'system', welcomeSeen: true, defaultVisibility: 'FOLLOWERS' }),
    );
  });
}

export async function stubApi(page: Page): Promise<void> {
  await skipWelcome(page);
  await page.route('**/localhost:8080/**', async (route) => {
    const url = route.request().url();
    const matched = ROUTES.find((candidate) => candidate.pattern.test(url));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(matched?.body ?? {}),
    });
  });

  // The map style is fetched from a tile provider; it has no business being
  // reached from a test, and its absence must not fail one.
  await page.route('**/demotiles.maplibre.org/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}
