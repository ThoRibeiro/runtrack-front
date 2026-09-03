import { RunTrackError } from '@runtrack/core';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { SignUpScreen } from './SignUpScreen';
import { VerifyEmailScreen } from './VerifyEmailScreen';

const noop = (): void => undefined;

describe('SignUpScreen', () => {
  const fill = async (): Promise<void> => {
    await userEvent.type(screen.getByTestId('sign-up-handle'), 'thomas');
    await userEvent.type(screen.getByTestId('sign-up-display-name'), 'Thomas');
    await userEvent.type(screen.getByTestId('sign-up-email'), 'thomas@exemple.fr');
    await userEvent.type(screen.getByTestId('sign-up-password'), 'motdepasse1234');
  };

  it('refuse un pseudonyme trop court avant d’appeler le serveur', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<SignUpScreen onSignIn={noop} />, harness);

    await userEvent.type(screen.getByTestId('sign-up-handle'), 'th');
    await userEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(screen.getByLabelText('Trois caractères au minimum')).toBeOnTheScreen();
    expect(harness.auth.signUpCalls).toHaveLength(0);
  });

  it('refuse un mot de passe trop court, sans attendre l’aller-retour', async () => {
    // Pour une règle de mot de passe, c'est la différence entre un formulaire
    // qui aide et un formulaire qui punit.
    const harness = aRuntime();
    await renderWithRuntime(<SignUpScreen onSignIn={noop} />, harness);

    await userEvent.type(screen.getByTestId('sign-up-password'), 'court');
    await userEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(screen.getByLabelText('Douze caractères au minimum')).toBeOnTheScreen();
    expect(harness.auth.signUpCalls).toHaveLength(0);
  });

  it('crée le compte et n’envoie pas vers un refus', async () => {
    // Le serveur exige une adresse confirmée : renvoyer vers le formulaire de
    // connexion enverrait vers un échec.
    const harness = aRuntime();
    await renderWithRuntime(<SignUpScreen onSignIn={noop} />, harness);

    await fill();
    await userEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByTestId('sign-up-done')).toBeOnTheScreen();
    });
    expect(harness.auth.signUpCalls[0]).toEqual({
      handle: 'thomas',
      displayName: 'Thomas',
      email: 'thomas@exemple.fr',
      password: 'motdepasse1234',
    });
    expect(screen.getByLabelText(/thomas@exemple\.fr/)).toBeOnTheScreen();
  });

  it('envoie et réaffiche l’adresse dans la forme que le serveur enregistre', async () => {
    // Le serveur normalise en minuscules : réafficher la saisie telle quelle
    // nommerait une adresse qui n’est celle d’aucun compte.
    const harness = aRuntime();
    await renderWithRuntime(<SignUpScreen onSignIn={noop} />, harness);

    await userEvent.type(screen.getByTestId('sign-up-handle'), 'thomas');
    await userEvent.type(screen.getByTestId('sign-up-display-name'), 'Thomas');
    await userEvent.type(screen.getByTestId('sign-up-email'), 'Thomas@Exemple.FR');
    await userEvent.type(screen.getByTestId('sign-up-password'), 'motdepasse1234');
    await userEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(screen.getByTestId('sign-up-done')).toBeOnTheScreen();
    });
    expect(harness.auth.signUpCalls[0]).toEqual({
      handle: 'thomas',
      displayName: 'Thomas',
      email: 'thomas@exemple.fr',
      password: 'motdepasse1234',
    });
    expect(screen.getByLabelText(/thomas@exemple\.fr/)).toBeOnTheScreen();
  });

  it('dit que le pseudonyme est déjà pris, avec sa propre phrase', async () => {
    const harness = aRuntime();
    harness.auth.onSignUp = () =>
      Promise.reject(new RunTrackError({ code: 'HANDLE_TAKEN', message: 'thomas est déjà pris' }));

    await renderWithRuntime(<SignUpScreen onSignIn={noop} />, harness);
    await fill();
    await userEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));

    const alert = await screen.findByRole('alert');
    // La phrase montrée vient du dictionnaire, pas du serveur : le pseudonyme
    // refusé est déjà sous les yeux, dans le champ.
    expect(alert.props['accessibilityLabel']).toContain('Ce pseudonyme est déjà pris');
    expect(alert.props['accessibilityLabel']).not.toContain('thomas est déjà pris');
  });
});

describe('ForgotPasswordScreen', () => {
  it('ne révèle pas si un compte existe', async () => {
    // Dire « adresse inconnue » transformerait ce formulaire en oracle
    // d'énumération de comptes. Le serveur répond pareil dans les deux cas ;
    // l'écran aussi.
    const harness = aRuntime();
    await renderWithRuntime(<ForgotPasswordScreen onBack={noop} />, harness);

    await userEvent.type(screen.getByTestId('forgot-password-email'), 'inconnu@exemple.fr');
    await userEvent.press(screen.getByRole('button', { name: 'Envoyer le lien' }));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-done')).toBeOnTheScreen();
    });
    expect(screen.getByLabelText(/Si un compte existe/)).toBeOnTheScreen();
  });

  it('valide l’adresse avant d’envoyer', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<ForgotPasswordScreen onBack={noop} />, harness);

    await userEvent.press(screen.getByRole('button', { name: 'Envoyer le lien' }));

    expect(harness.auth.forgotCalls).toHaveLength(0);
  });
});

describe('ResetPasswordScreen', () => {
  it('refuse deux mots de passe différents', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<ResetPasswordScreen token="t-1" onSignIn={noop} />, harness);

    await userEvent.type(screen.getByTestId('reset-password-password'), 'motdepasse1234');
    await userEvent.type(screen.getByTestId('reset-password-confirmation'), 'motdepasse5678');
    await userEvent.press(screen.getByRole('button', { name: 'Changer le mot de passe' }));

    expect(
      screen.getByLabelText('Les deux mots de passe ne sont pas identiques'),
    ).toBeOnTheScreen();
    expect(harness.auth.resetCalls).toHaveLength(0);
  });

  it('change le mot de passe et propose de se connecter', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<ResetPasswordScreen token="t-1" onSignIn={noop} />, harness);

    await userEvent.type(screen.getByTestId('reset-password-password'), 'motdepasse1234');
    await userEvent.type(screen.getByTestId('reset-password-confirmation'), 'motdepasse1234');
    await userEvent.press(screen.getByRole('button', { name: 'Changer le mot de passe' }));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-done')).toBeOnTheScreen();
    });
    expect(harness.auth.resetCalls[0]).toEqual({ token: 't-1', password: 'motdepasse1234' });
  });

  it('explique un lien incomplet plutôt que d’afficher un formulaire inutile', async () => {
    await renderWithRuntime(<ResetPasswordScreen token={undefined} onSignIn={noop} />, aRuntime());

    expect(screen.getByTestId('reset-password-no-token')).toBeOnTheScreen();
    expect(screen.queryByTestId('reset-password-password')).not.toBeOnTheScreen();
  });

  it('dit qu’un lien a expiré', async () => {
    const harness = aRuntime();
    harness.auth.onReset = () =>
      Promise.reject(new RunTrackError({ code: 'TOKEN_EXPIRED', message: 'lien périmé' }));

    await renderWithRuntime(<ResetPasswordScreen token="t-1" onSignIn={noop} />, harness);
    await userEvent.type(screen.getByTestId('reset-password-password'), 'motdepasse1234');
    await userEvent.type(screen.getByTestId('reset-password-confirmation'), 'motdepasse1234');
    await userEvent.press(screen.getByRole('button', { name: 'Changer le mot de passe' }));

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('Ce lien a expiré');
  });
});

describe('VerifyEmailScreen', () => {
  it('confirme l’adresse et invite à se connecter', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<VerifyEmailScreen token="t-1" onSignIn={noop} />, harness);

    await waitFor(() => {
      expect(screen.getByTestId('verify-email-done')).toBeOnTheScreen();
    });
    expect(harness.auth.verifyCalls).toEqual(['t-1']);
  });

  it('n’appelle rien sans jeton et explique le lien', async () => {
    const harness = aRuntime();
    await renderWithRuntime(<VerifyEmailScreen token={undefined} onSignIn={noop} />, harness);

    expect(screen.getByTestId('verify-email-no-token')).toBeOnTheScreen();
    expect(harness.auth.verifyCalls).toHaveLength(0);
  });

  it('dit qu’un lien a déjà servi, sans réessayer', async () => {
    // Réessayer transformerait un message clair en trois.
    const harness = aRuntime();
    let attempts = 0;
    harness.auth.onVerify = () => {
      attempts += 1;
      return Promise.reject(
        new RunTrackError({ code: 'TOKEN_ALREADY_USED', message: 'déjà utilisé' }),
      );
    };

    await renderWithRuntime(<VerifyEmailScreen token="t-1" onSignIn={noop} />, harness);

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('Ce lien a déjà servi');
    expect(attempts).toBe(1);
  });

  it('attend en disant ce qu’il attend', async () => {
    const harness = aRuntime();
    harness.auth.onVerify = () => new Promise(() => undefined);

    await renderWithRuntime(<VerifyEmailScreen token="t-1" onSignIn={noop} />, harness);

    expect(
      screen.getByRole('progressbar', { name: 'Confirmation de votre adresse' }),
    ).toBeOnTheScreen();
  });
});
