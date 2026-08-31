import { RunTrackError } from '@runtrack/core';
import { describe, expect, it } from 'vitest';
import { NOW, aHarness, aSession } from '../testing/harness';

/**
 * §11 : « Il faut donc un seul refresh en vol : le premier 401 déclenche le
 * renouvellement, les autres attendent son résultat et rejouent leur requête.
 * Écris ce test-là. » Le voici, sous ses quatre formes.
 */
describe('un seul refresh en vol', () => {
  it('dix requêtes parallèles au lancement ne déclenchent qu’un renouvellement', async () => {
    // Le cas exact du §11 : le jeton d'accès est expiré, l'application lance dix
    // requêtes d'un coup. Si chacune renouvelait, neuf rejoueraient un jeton
    // déjà consommé et l'utilisateur serait déconnecté sans avoir rien fait.
    const harness = aHarness({ session: aSession({ accessTokenExpiresAt: NOW - 1 }) });
    harness.transport.answerWith(() => ({ body: { ok: true } }));

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        harness.client.request(`/race/v1/a${String(index)}`),
      ),
    );

    expect(harness.refreshCount()).toBe(1);
    expect(responses).toHaveLength(10);
  });

  it('dix 401 simultanés ne déclenchent qu’un renouvellement', async () => {
    // Variante : le client croyait son jeton valable, le serveur dit non.
    const harness = aHarness();
    // Le serveur refuse l'ancien jeton et accepte le nouveau — c'est tout ce
    // qu'il faut pour que les dix requêtes prennent le chemin du 401.
    harness.transport.answerWith((request) =>
      request.headers['authorization'] === 'Bearer access-1'
        ? { status: 401, body: { code: 'AUTHENTICATION_REQUIRED', detail: 'expiré' } }
        : { body: { ok: true } },
    );

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        harness.client.request(`/race/v1/a${String(index)}`),
      ),
    );

    expect(harness.refreshCount()).toBe(1);
    // Dix requêtes refusées, dix rejouées, plus rien : chaque requête n'est
    // rejouée qu'une fois.
    expect(harness.transport.sent).toHaveLength(20);
  });

  it('rejoue chaque requête avec le nouveau jeton, une seule fois', async () => {
    const harness = aHarness({ session: aSession({ accessTokenExpiresAt: NOW - 1 }) });
    harness.transport.answerWith(() => ({ body: { ok: true } }));

    await Promise.all([
      harness.client.request('/race/v1/a1'),
      harness.client.request('/race/v1/a2'),
    ]);

    const tokens = harness.transport.sent.map((request) => request.headers['authorization']);
    expect(tokens).toEqual(['Bearer access-after-refresh-1', 'Bearer access-after-refresh-1']);
  });

  it('ne renouvelle pas une deuxième fois pour un 401 arrivé après coup', async () => {
    // Le piège plus subtil : une requête dont le 401 arrive *après* qu'un
    // renouvellement se soit terminé repartirait avec le jeton tout juste
    // consommé. C'est le même rejeu, simplement plus tard.
    const harness = aHarness();
    await harness.holder.load();

    await harness.coordinator.refresh('refresh-1');
    expect(harness.refreshCount()).toBe(1);

    // Un appelant retardataire présente encore l'ancien jeton.
    const session = await harness.coordinator.refresh('refresh-1');

    expect(harness.refreshCount()).toBe(1);
    expect(session.refreshToken).toBe('rotated-refresh-1');
  });

  it('déconnecte proprement quand le serveur signale un rejeu', async () => {
    const harness = aHarness({
      refresher: () =>
        Promise.reject(
          new RunTrackError({ code: 'REFRESH_TOKEN_REUSED', message: 'famille invalidée' }),
        ),
    });
    await harness.holder.load();

    await expect(harness.coordinator.refresh('refresh-1')).rejects.toThrow(RunTrackError);

    // La famille est morte : garder la session ferait échouer toutes les
    // requêtes suivantes de la même façon, en silence.
    expect(harness.store.clears).toBe(1);
    expect(harness.holder.current()).toBeUndefined();
  });

  it('garde la session quand le renouvellement échoue pour une autre raison', async () => {
    const harness = aHarness({
      refresher: () => Promise.reject(new RunTrackError({ code: 'UNKNOWN', message: 'réseau' })),
    });
    await harness.holder.load();

    await expect(harness.coordinator.refresh('refresh-1')).rejects.toThrow(RunTrackError);

    // Une coupure réseau n'invalide rien : redemander un mot de passe serait
    // une déconnexion gratuite.
    expect(harness.store.clears).toBe(0);
  });

  it('repart proprement après un échec : le renouvellement suivant est tenté', async () => {
    let attempt = 0;
    const harness = aHarness({
      refresher: (token) => {
        attempt += 1;
        if (attempt === 1) {
          return Promise.reject(new RunTrackError({ code: 'UNKNOWN', message: 'réseau' }));
        }
        return Promise.resolve(aSession({ refreshToken: `rotated-${token}` }));
      },
    });
    await harness.holder.load();

    await expect(harness.coordinator.refresh('refresh-1')).rejects.toThrow();
    const session = await harness.coordinator.refresh('refresh-1');

    expect(session.refreshToken).toBe('rotated-refresh-1');
    expect(harness.refreshCount()).toBe(2);
  });
});
