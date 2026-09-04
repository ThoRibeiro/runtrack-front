import { AuthRequest, makeRedirectUri, type AuthDiscoveryDocument } from 'expo-auth-session';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import type { AuthorizationFlow } from './expoIdentityGateway';

/**
 * Closes the popup the web build opens for the provider.
 *
 * On the web, the redirect lands in a second window that would otherwise stay
 * open on a blank page while the original tab waits forever. Calling it at
 * module load is what the library expects — it looks for the parameters the
 * redirect carries, and does nothing at all when there are none, which is every
 * launch on iOS and Android.
 */
maybeCompleteAuthSession();

/**
 * L'adresse de retour de la plateforme.
 *
 * Elle doit être **la même** pour la demande d'autorisation et pour l'échange du
 * code : le fournisseur les compare, et deux valeurs différentes se soldent par
 * un `invalid_grant` qui ne dit pas pourquoi. La coque la calcule une fois et la
 * donne aux deux.
 */
export function defaultRedirectUri(): string {
  return makeRedirectUri({ scheme: 'runtrack' });
}

export interface AuthorizationFlowOptions {
  authorizationEndpoint: string;
  clientId: string;
  /**
   * Where the provider sends the browser back.
   *
   * Left out, {@link makeRedirectUri} builds one per platform: the dev server's
   * address in development, the app's scheme once installed. It must be listed
   * in the realm's client, or the provider refuses the request outright.
   */
  redirectUri?: string;
}

/**
 * The authorization half of the flow, on the platform's browser.
 *
 * A public client holds no secret, so **PKCE is the whole security**: the
 * library draws a verifier, sends only its hash to the provider, and hands the
 * verifier back here for the exchange. Whoever intercepts the redirect gets a
 * code that is useless without it.
 *
 * The system browser is used rather than a web view on purpose. A web view has
 * no access to the session cookies of the real browser, so every sign-in would
 * ask for the password again, and it is exactly the pattern password managers —
 * and Apple's review — treat as phishing.
 */
export function createExpoAuthorizationFlow(options: AuthorizationFlowOptions): AuthorizationFlow {
  const redirectUri = options.redirectUri ?? defaultRedirectUri();

  return {
    async authorize() {
      const request = new AuthRequest({
        clientId: options.clientId,
        redirectUri,
        // `openid` is what makes this an identity request rather than a plain
        // authorization; `email` is what lets the API open the profile — without
        // it the token carries no address and no account can be created.
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
      });

      // The discovery document is given by hand: reading
      // `.well-known/openid-configuration` at launch would make opening this
      // screen depend on a round trip, for an address that does not move.
      const discovery: AuthDiscoveryDocument = {
        authorizationEndpoint: options.authorizationEndpoint,
      };
      const result = await request.promptAsync(discovery);

      // `dismiss` is the browser closed by hand, `cancel` the provider's own
      // back button. Both mean the same thing to us, and neither is a failure.
      if (result.type !== 'success') {
        return { type: 'cancelled' };
      }

      const code = result.params['code'];
      const verifier = request.codeVerifier;
      if (typeof code !== 'string' || verifier === undefined) {
        // A success without a code, or without the verifier that started the
        // flow, is not something the person can act on — treat it as a refusal
        // rather than exchange nothing for nothing.
        return { type: 'cancelled' };
      }
      return { type: 'success', code, codeVerifier: verifier };
    },
  };
}
