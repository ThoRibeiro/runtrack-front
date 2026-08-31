import { RunTrackError } from '@runtrack/core';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aRuntime, aSession, renderWithRuntime } from '../../testing/harness';
import { SignInScreen } from './SignInScreen';

const noop = (): void => undefined;

describe('SignInScreen', () => {
  it('annonce son titre à l’arrivée', async () => {
    // §5 : dans une application à page unique, sans titre annoncé, le lecteur
    // d'écran ne dit rien du tout quand on navigue.
    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      aRuntime(),
    );

    expect(screen.getByRole('header', { name: 'Content de vous revoir' })).toBeOnTheScreen();
  });

  it('refuse d’envoyer une adresse vide et le dit', async () => {
    const harness = aRuntime();
    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    await userEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(screen.getByLabelText('Indiquez votre adresse e-mail')).toBeOnTheScreen();
    expect(harness.auth.logInCalls).toHaveLength(0);
  });

  it('signale une adresse qui n’en est pas une', async () => {
    const harness = aRuntime();
    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    await userEvent.type(screen.getByTestId('sign-in-email'), 'thomas');
    await userEvent.type(screen.getByTestId('sign-in-password'), 'motdepasse1234');
    await userEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(
      screen.getByLabelText('Cette adresse ne ressemble pas à une adresse e-mail'),
    ).toBeOnTheScreen();
    expect(harness.auth.logInCalls).toHaveLength(0);
  });

  it('n’affiche pas d’erreur avant la première tentative', async () => {
    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      aRuntime(),
    );

    expect(screen.queryByLabelText('Indiquez votre adresse e-mail')).not.toBeOnTheScreen();
  });

  it('connecte, retient la session et prévient l’appelant', async () => {
    const harness = aRuntime();
    const session = aSession({ refreshToken: 'r-neuf' });
    harness.auth.onLogIn = () => Promise.resolve(session);
    const onSignedIn = jest.fn();

    await renderWithRuntime(
      <SignInScreen onSignedIn={onSignedIn} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    await userEvent.type(screen.getByTestId('sign-in-email'), 'thomas@exemple.fr');
    await userEvent.type(screen.getByTestId('sign-in-password'), 'motdepasse1234');
    await userEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledTimes(1);
    });
    expect(harness.auth.logInCalls[0]).toEqual({
      email: 'thomas@exemple.fr',
      password: 'motdepasse1234',
    });
    // La session est écrite dans le stockage sécurisé avant que l'écran ne
    // change : un plantage entre les deux ne laisse pas d'écran connecté
    // sans rien de persisté derrière.
    expect(await harness.store.read()).toEqual(session);
  });

  it('dit ce que le serveur a refusé, pas « une erreur est survenue »', async () => {
    // §15 : jamais un catch qui affiche un message générique sans regarder le
    // champ `code`.
    const harness = aRuntime();
    harness.auth.onLogIn = () =>
      Promise.reject(
        new RunTrackError({
          code: 'BAD_CREDENTIALS',
          message: 'Identifiants refusés',
          correlationId: 'c-77',
        }),
      );

    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    await userEvent.type(screen.getByTestId('sign-in-email'), 'thomas@exemple.fr');
    await userEvent.type(screen.getByTestId('sign-in-password'), 'mauvais-mot-de-passe');
    await userEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('Adresse ou mot de passe incorrect');
    // §11 : la référence que l'utilisateur citera s'il signale le problème.
    expect(screen.getByText('Référence : c-77', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('distingue une panne réseau d’un refus du serveur', async () => {
    const harness = aRuntime();
    harness.auth.onLogIn = () => Promise.reject(new TypeError('Network request failed'));

    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    await userEvent.type(screen.getByTestId('sign-in-email'), 'thomas@exemple.fr');
    await userEvent.type(screen.getByTestId('sign-in-password'), 'motdepasse1234');
    await userEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('Pas de réseau');
  });

  it('mène à l’oubli de mot de passe et à la création de compte', async () => {
    const onForgotPassword = jest.fn();
    const onSignUp = jest.fn();
    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={onForgotPassword} onSignUp={onSignUp} />,
      aRuntime(),
    );

    await userEvent.press(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));
    await userEvent.press(
      screen.getByRole('button', { name: 'Pas encore de compte ? Créer un compte' }),
    );

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });
});
