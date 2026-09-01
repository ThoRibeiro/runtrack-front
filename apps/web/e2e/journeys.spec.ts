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
  await page.route('**/shared/v1/**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      body: JSON.stringify({ code: 'SHARE_LINK_NOT_FOUND', detail: 'Lien inconnu' }),
    });
  });

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

test('une installation neuve voit la présentation, et une seule fois', async ({ page }) => {
  // Pas de `stubApi` ici : c'est justement l'absence de préférence enregistrée
  // qui doit déclencher l'écran.
  await page.route('**/localhost:8080/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/');

  await expect(page.getByText(/Écran verrouillé, trace intacte/)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Passer' }).click();

  // Elle ne revient pas : la préférence est écrite avant de partir.
  await page.goto('/');
  await expect(page.getByText(/Écran verrouillé, trace intacte/)).toBeHidden();
});

test('un lien de partage n’est jamais détourné par la présentation', async ({ page }) => {
  // Quelqu'un qui reçoit un lien n'a pas l'application : lui montrer un
  // diaporama à la place de ce qu'on lui a envoyé casse le partage.
  await page.route('**/localhost:8080/**', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/shared/un-jeton');

  await expect(page.getByText(/Écran verrouillé, trace intacte/)).toBeHidden();
});
