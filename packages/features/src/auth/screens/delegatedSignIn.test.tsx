import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { SignInScreen } from './SignInScreen';

const noop = (): void => undefined;

describe('signing in through an identity provider', () => {
  /**
   * The whole point of the switch: no password field is rendered when accounts
   * are held elsewhere. A form asking for one would be exactly the shape a
   * password manager is taught to distrust.
   */
  it('offers a single button instead of a password form', async () => {
    const harness = aRuntime({ delegatedIdentity: true });

    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    expect(screen.getByTestId('sign-in-submit')).toBeTruthy();
    expect(screen.queryByTestId('sign-in-password')).toBeNull();
    expect(screen.queryByTestId('sign-in-email')).toBeNull();
  });

  it('keeps the password form when no provider is configured', async () => {
    const harness = aRuntime();

    await renderWithRuntime(
      <SignInScreen onSignedIn={noop} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );

    expect(screen.getByTestId('sign-in-password')).toBeTruthy();
  });

  it('moves on once the provider hands back a session', async () => {
    const harness = aRuntime({ delegatedIdentity: true });
    let signedIn = false;

    await renderWithRuntime(
      <SignInScreen onSignedIn={() => {
        signedIn = true;
      }} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );
    await userEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => {
      expect(signedIn).toBe(true);
    });
  });

  /**
   * Closing the browser is an answer, not a failure: the screen stays where it
   * was, with nothing to apologise for.
   */
  it('stays put when the browser is closed without signing in', async () => {
    const harness = aRuntime({ delegatedIdentity: true });
    const identity = harness.identity;
    if (identity === undefined) throw new Error('harnais sans fournisseur d’identité');
    identity.session = undefined;
    let signedIn = false;

    await renderWithRuntime(
      <SignInScreen onSignedIn={() => {
        signedIn = true;
      }} onForgotPassword={noop} onSignUp={noop} />,
      harness,
    );
    await userEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('sign-in-submit')).toBeTruthy();
    });
    expect(signedIn).toBe(false);
  });
});
