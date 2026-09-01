import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { DeepLink, PushRegistry, RegisteredDevice } from '@runtrack/core';
import { deviceToken, notificationId, quietHours } from '@runtrack/core';
import { aNotification } from '../testing/fakes';
import { aRuntime, renderWithRuntime, aSession, type Harness } from '../testing/harness';
import { InboxScreen } from './screens/InboxScreen';
import { PreferencesScreen } from './screens/PreferencesScreen';
import { NotificationStreamProvider } from './NotificationStreamProvider';

const noop = (): void => undefined;
const PARIS = 'Europe/Paris';

function signedIn(): Harness {
  return aRuntime({ session: aSession() });
}

describe('la boîte de réception', () => {
  it('lit chaque ligne d’un bloc : le fait, quand, et si elle est lue', async () => {
    const harness = signedIn();
    harness.notifications.page = {
      items: [aNotification({ type: 'ACTIVITY_LIKED', aggregateCount: 4, createdAt: Date.now() })],
    };

    await renderWithRuntime(<InboxScreen onOpen={noop} onOpenPreferences={noop} />, harness);

    // §5 : une phrase, pas quatre fragments. Et l'état ne tient pas à la seule
    // couleur de la pastille (§15).
    expect(
      await screen.findByLabelText(/4 personnes ont aimé votre course.*non lue/),
    ).toBeOnTheScreen();
  });

  it('résume un agrégat plutôt que de répéter la même ligne', async () => {
    const harness = signedIn();
    harness.notifications.page = { items: [aNotification({ aggregateCount: 1 })] };

    await renderWithRuntime(<InboxScreen onOpen={noop} onOpenPreferences={noop} />, harness);

    expect(await screen.findByLabelText(/Votre course a été aimée/)).toBeOnTheScreen();
  });

  it('marque lue et ouvre la destination quand on touche une ligne', async () => {
    const harness = signedIn();
    const opened: DeepLink[] = [];
    harness.notifications.page = {
      items: [aNotification({ deepLink: '/activities/a1/live' })],
    };
    await renderWithRuntime(
      <InboxScreen onOpen={(link) => opened.push(link)} onOpenPreferences={noop} />,
      harness,
    );

    await userEvent.press(await screen.findByTestId('inbox-item-n1'));

    expect(opened).toEqual([{ route: 'activity-live', activityId: 'a1' }]);
    await waitFor(() => {
      expect(harness.notifications.markedRead).toEqual([notificationId('n1')]);
    });
  });

  it('n’ouvre rien pour une destination que ce build ne connaît pas', async () => {
    const harness = signedIn();
    const opened: DeepLink[] = [];
    harness.notifications.page = { items: [aNotification({ deepLink: '/badges/gold' })] };
    await renderWithRuntime(
      <InboxScreen onOpen={(link) => opened.push(link)} onOpenPreferences={noop} />,
      harness,
    );

    await userEvent.press(await screen.findByTestId('inbox-item-n1'));

    // §11 : ouvrir le mauvais écran est pire que n'en ouvrir aucun. La lecture,
    // elle, a bien eu lieu.
    expect(opened).toEqual([]);
    await waitFor(() => {
      expect(harness.notifications.markedRead).toHaveLength(1);
    });
  });

  it('ne marque pas relue une notification déjà lue', async () => {
    const harness = signedIn();
    harness.notifications.page = {
      items: [aNotification({ unread: false, readAt: Date.now() })],
    };
    await renderWithRuntime(<InboxScreen onOpen={noop} onOpenPreferences={noop} />, harness);

    await userEvent.press(await screen.findByTestId('inbox-item-n1'));

    expect(harness.notifications.markedRead).toEqual([]);
  });

  it('marque tout lu d’un geste', async () => {
    const harness = signedIn();
    await renderWithRuntime(<InboxScreen onOpen={noop} onOpenPreferences={noop} />, harness);

    // §5 : « Tout marquer lu » seul ne dit pas de quoi — le design system
    // accole la section.
    await userEvent.press(await screen.findByLabelText('Tout marquer lu : Notifications'));

    await waitFor(() => {
      expect(harness.notifications.markedAll).toBe(1);
    });
  });

  it('dit ce qu’il n’y a pas plutôt que d’afficher une liste vide', async () => {
    const harness = signedIn();
    harness.notifications.page = { items: [] };

    await renderWithRuntime(<InboxScreen onOpen={noop} onOpenPreferences={noop} />, harness);

    expect(await screen.findByLabelText(/Aucune notification/)).toBeOnTheScreen();
  });
});

describe('le flux de la boîte', () => {
  it('rafraîchit la pastille quand une notification arrive, sans bannière système', async () => {
    const harness = signedIn();
    await renderWithRuntime(
      <NotificationStreamProvider>
        <InboxScreen onOpen={noop} onOpenPreferences={noop} />
      </NotificationStreamProvider>,
      harness,
    );
    await waitFor(() => {
      expect(harness.notificationStream.openCount).toBe(1);
    });

    harness.notifications.page = { items: [aNotification({ id: notificationId('n2') })] };
    await act(async () => {
      harness.notificationStream.deliver({
        id: 'e-1',
        event: 'notification',
        data: { id: 'n2' },
      });
      await Promise.resolve();
    });

    // La liste se recharge ; rien d'autre ne se passe — §12 : pas de bannière
    // au premier plan, la pastille et l'écran concerné suffisent.
    await waitFor(() => {
      expect(screen.getByTestId('inbox-item-n2')).toBeOnTheScreen();
    });
  });

  it('reprend là où il s’est arrêté après une coupure', async () => {
    const harness = signedIn();
    await renderWithRuntime(
      <NotificationStreamProvider>
        <InboxScreen onOpen={noop} onOpenPreferences={noop} />
      </NotificationStreamProvider>,
      harness,
    );
    await waitFor(() => {
      expect(harness.notificationStream.openCount).toBe(1);
    });

    await act(async () => {
      harness.notificationStream.deliver({ id: 'e-7', event: 'heartbeat', data: '"x"' });
      harness.notificationStream.fail(new Error('réseau coupé'));
      harness.scheduler.advanceBy(1_000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(harness.notificationStream.openCount).toBe(2);
    });
    expect(harness.notificationStream.lastEventIds[1]).toBe('e-7');
  });

  it('n’ouvre aucun flux sans session : une boîte appartient à un compte', async () => {
    const harness = aRuntime();
    await renderWithRuntime(
      <NotificationStreamProvider>
        <InboxScreen onOpen={noop} onOpenPreferences={noop} />
      </NotificationStreamProvider>,
      harness,
    );

    expect(harness.notificationStream.openCount).toBe(0);
  });
});

describe('les préférences', () => {
  it('envoie la liste entière des natures coupées, jamais un delta', async () => {
    const harness = signedIn();
    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);
    await screen.findByTestId('preferences-screen');

    await userEvent.press(screen.getByTestId('preferences-kind-ACTIVITY_LIKED'));

    await waitFor(() => {
      expect(harness.notifications.prefs.mutedTypes).toEqual(['ACTIVITY_LIKED']);
    });
  });

  it('énumère les natures que le serveur connaît, pas une liste à elle', async () => {
    const harness = signedIn();
    harness.notifications.prefs = {
      mutedTypes: [],
      quietHours: undefined,
      availableTypes: ['NEW_FOLLOWER'],
    };

    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);

    expect(await screen.findByTestId('preferences-kind-NEW_FOLLOWER')).toBeOnTheScreen();
    expect(screen.queryByTestId('preferences-kind-ACTIVITY_LIKED')).toBeNull();
  });

  it('coupe les heures calmes en envoyant leur absence', async () => {
    const harness = signedIn();
    harness.notifications.prefs = {
      mutedTypes: [],
      quietHours: quietHours(22 * 60, 7 * 60, PARIS),
      availableTypes: ['NEW_FOLLOWER'],
    };
    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);
    await screen.findByTestId('preferences-screen');

    await userEvent.press(screen.getByTestId('preferences-quiet-on'));

    await waitFor(() => {
      expect(harness.notifications.prefs.quietHours).toBeUndefined();
    });
  });

  it('dit le fuseau qui sert de référence', async () => {
    const harness = signedIn();
    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);

    // §12 : « pas avant 7 h » n'a de sens que là où se trouve la personne.
    expect(await screen.findByText(/Europe\/Paris/)).toBeOnTheScreen();
  });
});

describe('le push', () => {
  class FakePushRegistry implements PushRegistry {
    granted = false;
    asked = 0;
    readonly registered: RegisteredDevice[] = [];

    currentToken(): Promise<ReturnType<typeof deviceToken> | undefined> {
      return Promise.resolve(this.granted ? deviceToken('tok-1') : undefined);
    }

    requestPermission(): Promise<boolean> {
      this.asked += 1;
      this.granted = true;
      return Promise.resolve(true);
    }

    register(device: RegisteredDevice): Promise<void> {
      this.registered.push(device);
      return Promise.resolve();
    }

    unregister(): Promise<void> {
      return Promise.resolve();
    }
  }

  it('ne demande jamais la permission au lancement', async () => {
    const harness = signedIn();
    const push = new FakePushRegistry();
    harness.runtime.push = push;

    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);
    await screen.findByTestId('preferences-screen');

    // §12 : la boîte système est à un coup. Elle se demande après avoir montré
    // ce qu'elle apporte, pas avant.
    expect(push.asked).toBe(0);
    expect(await screen.findByTestId('preferences-push')).toBeOnTheScreen();
  });

  it('demande la permission au geste, puis enregistre l’appareil', async () => {
    const harness = signedIn();
    const push = new FakePushRegistry();
    harness.runtime.push = push;
    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);

    await userEvent.press(await screen.findByTestId('preferences-enable-push'));

    await waitFor(() => {
      expect(push.registered).toHaveLength(1);
    });
    expect(push.asked).toBe(1);
  });

  it('réenregistre le jeton au lancement quand la permission existe déjà', async () => {
    const harness = signedIn();
    const push = new FakePushRegistry();
    push.granted = true;
    harness.runtime.push = push;

    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);

    // §12 : le jeton change tout seul, et le serveur traite un doublon comme
    // une non-opération. Rien n'est demandé à personne.
    await waitFor(() => {
      expect(push.registered).toHaveLength(1);
    });
    expect(push.asked).toBe(0);
  });

  it('ne propose rien sur une plateforme sans push', async () => {
    const harness = signedIn();

    await renderWithRuntime(<PreferencesScreen timeZone={PARIS} />, harness);
    await screen.findByTestId('preferences-screen');

    expect(screen.queryByTestId('preferences-push')).toBeNull();
  });
});
