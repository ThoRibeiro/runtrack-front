import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { stubApi } from './api';

/**
 * §5's automatic gate: **zero violations, or the build falls over**.
 *
 * The brief is honest about what this is worth — automatic tools cover about a
 * third of the criteria — which is why §13 also asks for a manual VoiceOver
 * pass. This catches the third that can be caught, on every commit, which is
 * the third that regresses silently: a contrast changed by a token edit, a
 * label dropped in a refactor, a heading level skipped.
 */
const PAGES = [
  { path: '/sign-in', name: 'connexion' },
  { path: '/sign-up', name: 'inscription' },
  { path: '/forgot-password', name: 'mot de passe oublié' },
];

for (const target of PAGES) {
  test(`aucune violation d'accessibilité — ${target.name}`, async ({ page }) => {
    await stubApi(page);
    await page.goto(target.path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test('la langue du document est déclarée', async ({ page }) => {
  // §5 : sans elle, un lecteur d'écran lit du français avec une voix anglaise.
  await stubApi(page);
  await page.goto('/sign-in');

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('le focus reste visible au clavier', async ({ page }) => {
  // §5 : `outline: none` sans remplacement est interdit. On vérifie qu'après
  // une tabulation, quelque chose porte le focus et qu'il se voit.
  await stubApi(page);
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  await page.keyboard.press('Tab');

  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    return `${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`;
  });
  expect(outline).not.toBe('none|0px|none');
});

test("l'ordre de tabulation suit l'ordre visuel du formulaire", async ({ page }) => {
  await stubApi(page);
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  const reached: string[] = [];
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('Tab');
    reached.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return active === null ? '' : `${active.tagName}:${active.getAttribute('type') ?? ''}`;
      }),
    );
  }

  // L'adresse avant le mot de passe : l'ordre de la page, pas celui du DOM
  // après un refactor.
  const email = reached.findIndex((entry) => entry.includes('email'));
  const password = reached.findIndex((entry) => entry.includes('password'));
  expect(email).toBeGreaterThanOrEqual(0);
  expect(password).toBeGreaterThan(email);
});
