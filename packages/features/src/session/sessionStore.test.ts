import { RunTrackError } from '@runtrack/core';
import { aRuntime, aSession } from '../testing/harness';
import { createSessionStore } from './sessionStore';

describe('store de session', () => {
  it('part de « on n’a pas encore regardé », pas de « pas connecté »', async () => {
    // Confondre les deux renvoie vers l'écran de connexion pendant une fraction
    // de seconde à chaque démarrage à froid, ce qui se lit comme un bug.
    const store = createSessionStore(aRuntime().runtime);

    expect(store.getState().status).toBe('restoring');

    await store.getState().restore();
  });

  it('retrouve une session persistée', async () => {
    const session = aSession();
    const store = createSessionStore(aRuntime({ session }).runtime);

    await store.getState().restore();

    expect(store.getState().status).toBe('authenticated');
    expect(store.getState().session).toEqual(session);
  });

  it('conclut à « anonyme » quand le stockage est vide', async () => {
    const store = createSessionStore(aRuntime().runtime);

    await store.getState().restore();

    expect(store.getState().status).toBe('anonymous');
    expect(store.getState().session).toBeUndefined();
  });

  it('adopte une session et l’écrit dans le stockage sécurisé', async () => {
    const harness = aRuntime();
    const store = createSessionStore(harness.runtime);
    const session = aSession({ refreshToken: 'r-neuf' });

    await store.getState().adopt(session);

    expect(store.getState().status).toBe('authenticated');
    expect(await harness.store.read()).toEqual(session);
  });

  it('déconnecte côté serveur puis efface localement', async () => {
    const harness = aRuntime({ session: aSession() });
    const store = createSessionStore(harness.runtime);
    await store.getState().restore();

    await store.getState().signOut();

    expect(harness.auth.logOutCalls).toEqual(['refresh']);
    expect(harness.store.cleared).toBe(1);
    expect(store.getState().status).toBe('anonymous');
  });

  it('déconnecte quand même quand le serveur refuse', async () => {
    // Une déconnexion qui échoue sur le réseau reste une déconnexion du point
    // de vue de cet appareil : laisser la session en place serait pire.
    const harness = aRuntime({ session: aSession() });
    harness.auth.onLogOut = () =>
      Promise.reject(new RunTrackError({ code: 'AUTHENTICATION_REQUIRED', message: 'expirée' }));
    const store = createSessionStore(harness.runtime);
    await store.getState().restore();

    await store.getState().signOut();

    expect(harness.store.cleared).toBe(1);
    expect(store.getState().status).toBe('anonymous');
  });

  it('ne prévient pas le serveur quand il n’y a rien à fermer', async () => {
    const harness = aRuntime();
    const store = createSessionStore(harness.runtime);
    await store.getState().restore();

    await store.getState().signOut();

    expect(harness.auth.logOutCalls).toHaveLength(0);
    expect(store.getState().status).toBe('anonymous');
  });
});
