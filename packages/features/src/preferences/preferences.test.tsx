import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aRuntime, renderWithRuntime, aSession } from '../testing/harness';
import { MemoryKeyValueStore } from '../query/persistence';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  createPreferencesStore,
  parsePreferences,
} from './preferencesStore';

const noop = (): void => undefined;

describe('les préférences stockées', () => {
  it('part des valeurs par défaut quand rien n’a été écrit', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it('relit ce qui a été écrit', () => {
    const stored = JSON.stringify({
      theme: 'dark',
      welcomeSeen: true,
      defaultVisibility: 'PUBLIC',
    });

    expect(parsePreferences(stored)).toEqual({
      theme: 'dark',
      welcomeSeen: true,
      defaultVisibility: 'PUBLIC',
    });
  });

  it.each([
    ['un JSON illisible', '{ pas du JSON'],
    ['autre chose qu’un objet', '"une chaîne"'],
    ['un thème inconnu de ce build', '{"theme":"sepia"}'],
    ['une visibilité inventée', '{"defaultVisibility":"EVERYONE"}'],
  ])('retombe sur les valeurs par défaut pour %s', (_name, stored) => {
    // Une préférence à demi écrite ne doit pas mettre l'application dans un
    // état pour lequel elle n'a pas de code.
    const parsed = parsePreferences(stored);
    expect(parsed.theme).toBe('system');
    expect(parsed.defaultVisibility).toBe('FOLLOWERS');
  });

  it('n’ouvre pas les courses au monde par défaut', () => {
    // Comme toute visibilité de cette application : elle échoue fermée.
    expect(DEFAULT_PREFERENCES.defaultVisibility).toBe('FOLLOWERS');
  });

  it('écrit un choix et le relit après un redémarrage', async () => {
    const storage = new MemoryKeyValueStore();
    const store = createPreferencesStore(storage);
    await store.getState().restore();

    await store.getState().setTheme('dark');

    expect(parsePreferences(storage.getItem(PREFERENCES_KEY)).theme).toBe('dark');
    const afterRestart = createPreferencesStore(storage);
    await afterRestart.getState().restore();
    expect(afterRestart.getState().theme).toBe('dark');
  });

  it('ne casse pas quand le stockage refuse', async () => {
    const refusing = {
      getItem: () => {
        throw new Error('refusé');
      },
      setItem: () => {
        throw new Error('refusé');
      },
      removeItem: () => undefined,
    };
    const store = createPreferencesStore(refusing);

    await store.getState().restore();
    await store.getState().setTheme('light');

    expect(store.getState().theme).toBe('light');
    expect(store.getState().loading).toBe(false);
  });
});

describe('la présentation', () => {
  it('dit ce que l’application fait, un panneau à la fois', async () => {
    await renderWithRuntime(<WelcomeScreen onDone={noop} />, aRuntime());

    expect(await screen.findByTestId('welcome-panel-0')).toBeOnTheScreen();
    // §5 : le panneau se lit d'un bloc, pas en trois morceaux.
    expect(screen.getByLabelText(/Écran verrouillé, trace intacte/)).toBeOnTheScreen();
  });

  it('annonce l’étape par un nombre, pas par une pastille colorée', async () => {
    await renderWithRuntime(<WelcomeScreen onDone={noop} />, aRuntime());

    expect(await screen.findByLabelText('Étape 1 sur 3')).toBeOnTheScreen();
  });

  it('avance jusqu’au dernier panneau, puis termine', async () => {
    const done = jest.fn();
    await renderWithRuntime(<WelcomeScreen onDone={done} />, aRuntime());

    await userEvent.press(await screen.findByTestId('welcome-next'));
    await userEvent.press(screen.getByTestId('welcome-next'));
    expect(await screen.findByTestId('welcome-panel-2')).toBeOnTheScreen();
    // Le dernier panneau ne propose plus de passer : il n'y a plus rien à passer.
    expect(screen.queryByTestId('welcome-skip')).toBeNull();

    await userEvent.press(screen.getByTestId('welcome-next'));

    expect(done).toHaveBeenCalled();
  });

  it('se passe d’un geste', async () => {
    const done = jest.fn();
    await renderWithRuntime(<WelcomeScreen onDone={done} />, aRuntime());

    await userEvent.press(await screen.findByTestId('welcome-skip'));

    expect(done).toHaveBeenCalled();
  });
});

describe('les réglages', () => {
  const settings = () => (
    <SettingsScreen
      version="0.1.0"
      onOpenNotifications={noop}
      onSignedOut={noop}
      onReplayWelcome={noop}
    />
  );

  it('propose les trois thèmes, « selon le système » compris', async () => {
    await renderWithRuntime(settings(), aRuntime({ session: aSession() }));

    expect(await screen.findByLabelText(/Selon le système/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Clair/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Sombre/)).toBeOnTheScreen();
  });

  it('dit que l’écran d’enregistrement garde son thème', async () => {
    await renderWithRuntime(settings(), aRuntime({ session: aSession() }));

    expect(await screen.findByText(/se lit en plein soleil/)).toBeOnTheScreen();
  });

  it('propose la visibilité par défaut d’une course', async () => {
    await renderWithRuntime(settings(), aRuntime({ session: aSession() }));

    expect(await screen.findByLabelText(/Mes abonnés/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Moi seul/)).toBeOnTheScreen();
  });

  it('demande confirmation avant de déconnecter, et dit ce qu’il advient d’une course', async () => {
    const harness = aRuntime({ session: aSession() });
    await renderWithRuntime(settings(), harness);

    await userEvent.press(await screen.findByTestId('settings-sign-out'));

    expect(await screen.findByText('Se déconnecter ?')).toBeOnTheScreen();
    expect(screen.getByText(/reste enregistrée sur ce téléphone/)).toBeOnTheScreen();
  });

  it('déconnecte quand on confirme', async () => {
    const harness = aRuntime({ session: aSession() });
    const signedOut = jest.fn();
    await renderWithRuntime(
      <SettingsScreen
        version="0.1.0"
        onOpenNotifications={noop}
        onSignedOut={signedOut}
        onReplayWelcome={noop}
      />,
      harness,
    );
    await userEvent.press(await screen.findByTestId('settings-sign-out'));

    await userEvent.press(await screen.findByTestId('settings-sign-out-confirm-confirm'));

    await waitFor(() => {
      expect(signedOut).toHaveBeenCalled();
    });
    expect(harness.store.cleared).toBeGreaterThan(0);
  });

  it('affiche la version', async () => {
    await renderWithRuntime(settings(), aRuntime({ session: aSession() }));

    expect(await screen.findByLabelText(/Version 0.1.0/)).toBeOnTheScreen();
  });
});
