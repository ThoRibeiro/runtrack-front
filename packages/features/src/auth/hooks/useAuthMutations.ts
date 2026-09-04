import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type { Credentials, Session, SignUpCommand } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { useSessionActions } from '../../session/SessionProvider';

/**
 * §1: no `useEffect` that goes and fetches. Everything that talks to the server
 * goes through TanStack Query — here, mutations, because signing in is not a
 * read and must not be cached, deduplicated or replayed.
 */
export function useSignIn(): UseMutationResult<Session, unknown, Credentials> {
  const runtime = useRuntime();
  const { adopt } = useSessionActions();

  return useMutation({
    mutationFn: (credentials: Credentials) => runtime.auth.logIn(credentials),
    // The session is written to the secure store *before* any screen learns it
    // exists, so a crash between the two cannot leave a signed-in screen with
    // nothing persisted behind it.
    onSuccess: (session) => adopt(session),
  });
}

/**
 * La connexion déléguée : un navigateur s'ouvre sur le fournisseur, et la
 * session arrive au retour.
 *
 * Rend `undefined` quand la personne referme le navigateur sans se connecter.
 * Ce n'est pas un échec, donc `onSuccess` n'adopte rien et l'écran ne bouge
 * pas — une bannière d'erreur pour « j'ai changé d'avis » serait du bruit.
 */
export function useSignInWithProvider(): UseMutationResult<Session | undefined, unknown, void> {
  const runtime = useRuntime();
  const { adopt } = useSessionActions();

  return useMutation({
    mutationFn: () => {
      const identity = runtime.identity;
      if (identity === undefined) {
        return Promise.reject(
          new Error('Aucun fournisseur d’identité configuré sur cette application'),
        );
      }
      return identity.logIn();
    },
    onSuccess: async (session) => {
      if (session !== undefined) await adopt(session);
    },
  });
}

export function useSignUp(): UseMutationResult<void, unknown, SignUpCommand> {
  const runtime = useRuntime();
  return useMutation({ mutationFn: (command: SignUpCommand) => runtime.auth.signUp(command) });
}

export function useRequestPasswordReset(): UseMutationResult<void, unknown, string> {
  const runtime = useRuntime();
  return useMutation({ mutationFn: (email: string) => runtime.auth.requestPasswordReset(email) });
}

export function useResetPassword(): UseMutationResult<
  void,
  unknown,
  { token: string; password: string }
> {
  const runtime = useRuntime();
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      runtime.auth.resetPassword(token, password),
  });
}
