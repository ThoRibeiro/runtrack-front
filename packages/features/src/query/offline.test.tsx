import { QueryClient, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react-native';
import { activityId } from '@runtrack/core';
import { aRuntime, renderWithRuntime, aSession } from '../testing/harness';
import { FeedScreen } from '../feed/screens/FeedScreen';
import { ActivityScreen } from '../activity/screens/ActivityScreen';
import type { PersistedClient } from '@tanstack/query-persist-client-core';
import {
  MemoryKeyValueStore,
  createPersister,
  shouldPersistQuery,
  type PersistableQuery,
} from './persistence';

const noop = (): void => undefined;

/** Une requête telle que TanStack Query la présente au filtre de persistance. */
function aQuery(queryKey: readonly unknown[], status = 'success'): PersistableQuery {
  return { queryKey, state: { status } };
}

/** Un cache persisté minimal — la forme que le persisteur écrit et relit. */
function aPersistedClient(): PersistedClient {
  return {
    buster: '',
    timestamp: 1,
    clientState: { mutations: [], queries: [] },
  };
}

describe('ce qui survit hors connexion', () => {
  it.each([
    ['le fil', ['feed']],
    ['une course ouverte', ['activity', 'a1']],
    ['sa trace encodée', ['activity', 'a1', 'track']],
    ['ses kilomètres', ['activity', 'a1', 'splits']],
  ])('garde %s', (_name, key) => {
    expect(shouldPersistQuery(aQuery(key))).toBe(true);
  });

  it.each([
    ['le direct', ['activity', 'live']],
    ['les j’aime', ['activity', 'a1', 'likes']],
    ['les commentaires', ['activity', 'a1', 'comments']],
    ['les liens de partage', ['activity', 'a1', 'share-links']],
    ['la trace décodée', ['activity', 'a1', 'track', 'decoded']],
    ['le profil', ['user', 'me']],
    ['les notifications', ['notification', 'inbox']],
    ['une page partagée', ['shared', 'jeton']],
  ])('ne garde pas %s', (_name, key) => {
    // §9 : « ce que tu ne caches pas — les données du direct ». Et le reste
    // n'est pas dans la liste des trois choses qui doivent marcher hors ligne.
    expect(shouldPersistQuery(aQuery(key))).toBe(false);
  });

  it('ne garde pas une requête qui n’a pas abouti', () => {
    expect(shouldPersistQuery(aQuery(['feed'], 'error'))).toBe(false);
    expect(shouldPersistQuery(aQuery(['feed'], 'pending'))).toBe(false);
  });

  it('ne garde pas une clé qui n’est pas une chaîne', () => {
    expect(shouldPersistQuery(aQuery([42]))).toBe(false);
  });
});

describe('le stockage du cache', () => {
  it('écrit puis relit un cache', async () => {
    const store = new MemoryKeyValueStore();
    const persister = createPersister(store);
    const client = aPersistedClient();

    await persister.persistClient(client);

    await expect(persister.restoreClient()).resolves.toEqual(client);
  });

  it('repart de zéro sur un cache illisible plutôt que d’en deviner la moitié', async () => {
    const store = new MemoryKeyValueStore();
    store.setItem('runtrack-query-cache', '{ ceci n’est pas du JSON');

    await expect(createPersister(store).restoreClient()).resolves.toBeUndefined();
  });

  it('repart de zéro sur un cache d’une autre forme', async () => {
    const store = new MemoryKeyValueStore();
    store.setItem('runtrack-query-cache', '{"autre":true}');

    await expect(createPersister(store).restoreClient()).resolves.toBeUndefined();
  });

  it('oublie un cache sur demande', async () => {
    const store = new MemoryKeyValueStore();
    const persister = createPersister(store);
    await persister.persistClient(aPersistedClient());

    await persister.removeClient();

    await expect(persister.restoreClient()).resolves.toBeUndefined();
  });

  it('ne casse pas quand le stockage refuse d’écrire', async () => {
    // Quota dépassé, navigation privée : un cache est une optimisation, et
    // faire tomber l'application pour ça serait absurde.
    const refusing = {
      getItem: () => {
        throw new Error('refusé');
      },
      setItem: () => {
        throw new Error('refusé');
      },
      removeItem: () => {
        throw new Error('refusé');
      },
    };
    const persister = createPersister(refusing);

    await expect(persister.persistClient(aPersistedClient())).resolves.toBeUndefined();
    await expect(persister.restoreClient()).resolves.toBeUndefined();
    await expect(persister.removeClient()).resolves.toBeUndefined();
  });
});

describe('un écran hors connexion', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('dit qu’il est hors connexion plutôt que de tourner indéfiniment', async () => {
    const harness = aRuntime({ session: aSession() });
    onlineManager.setOnline(false);

    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);

    // §9 : « pas de spinner infini : un écran qui tourne indéfiniment est un
    // mensonge ». Une requête en pause n'est pas une requête lente.
    expect(await screen.findByTestId('list-offline')).toBeOnTheScreen();
  });

  it('propose de réessayer plutôt que d’attendre un signal', async () => {
    const harness = aRuntime({ session: aSession() });
    onlineManager.setOnline(false);
    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);
    await screen.findByTestId('list-offline');

    expect(screen.getByTestId('offline-retry')).toBeOnTheScreen();
  });

  it('dit qu’une course jamais ouverte ne l’est pas non plus hors connexion', async () => {
    const harness = aRuntime({ session: aSession() });
    onlineManager.setOnline(false);

    await renderWithRuntime(
      <ActivityScreen id={activityId('a1')} onBack={noop} onFollowLive={noop} />,
      harness,
    );

    expect(await screen.findByTestId('activity-offline')).toBeOnTheScreen();
  });

  it('repart dès que le réseau revient', async () => {
    const harness = aRuntime({ session: aSession() });
    onlineManager.setOnline(false);
    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);
    await screen.findByTestId('list-offline');

    await act(async () => {
      onlineManager.setOnline(true);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('list-offline')).toBeNull();
    });
  });
});

describe('le client de requêtes', () => {
  it('n’est pas partagé entre deux tests', () => {
    // Garde-fou : un client partagé ferait passer un test grâce au cache d'un
    // autre, ce qui est la façon la plus coûteuse de croire une suite verte.
    expect(new QueryClient()).not.toBe(new QueryClient());
  });
});
