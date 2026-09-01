import { expect, test } from '@playwright/test';
import { stubApi } from './api';

/**
 * §13: the main journeys, end to end, in a real browser against the production
 * export.
 *
 * They are deliberately shallow. The screens' logic is tested in
 * `packages/features` with a runtime double, far faster and far more precisely
 * than a browser can; what only a browser proves is that the export **boots**,
 * that the router resolves, that fonts and styles arrive, and that a person can
 * get from one screen to the next.
 */
test('la page de connexion se charge et demande ce qu’il faut', async ({ page }) => {
  await stubApi(page);
  await page.goto('/sign-in');

  await expect(page.getByLabel(/Adresse e-mail/)).toBeVisible();
  await expect(page.getByLabel(/Mot de passe/, { exact: false }).first()).toBeVisible();
});

test('on passe de la connexion à l’inscription et retour', async ({ page }) => {
  await stubApi(page);
  await page.goto('/sign-in');

  await page.getByRole('button', { name: /Créer un compte/ }).click();

  await expect(page).toHaveURL(/sign-up/);
});

test('un lien de partage invalide le dit, sans laisser tourner un spinner', async ({ page }) => {
  await stubApi(page);
  await page.route('**/shared/v1/**', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      body: JSON.stringify({ code: 'SHARE_LINK_NOT_FOUND', detail: 'Lien inconnu' }),
    }),
  );

  await page.goto('/shared/jeton-invalide');

  await expect(page.getByText(/Ce lien n’est plus valable/)).toBeVisible({ timeout: 15_000 });
});

test('une route inconnue ne casse pas l’application', async ({ page }) => {
  await stubApi(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/cette-route-n-existe-pas');
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
});
