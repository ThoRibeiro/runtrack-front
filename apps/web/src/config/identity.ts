import {
  ExpoIdentityGateway,
  createExpoAuthorizationFlow,
  defaultRedirectUri,
} from '@runtrack/adapters';

import type { Clock, IdentityGateway } from '@runtrack/core';
import { OidcTokens } from '@runtrack/features';

/**
 * Le fournisseur d'identité, s'il y en a un.
 *
 * **Une seule variable décide**, `EXPO_PUBLIC_KEYCLOAK_ISSUER` : configurée, les
 * comptes sont tenus par le realm et l'écran de connexion se réduit à un bouton ;
 * absente, l'application garde son formulaire et son mot de passe. Un second
 * réglage qui dirait « on est en OIDC » à côté d'une adresse finirait par la
 * contredire.
 *
 * Le pendant côté serveur est `runtrack.auth.provider` : les deux doivent dire la
 * même chose, sinon l'API refuse les jetons que l'application obtient.
 */
export function identityFromEnvironment(clock: Clock): IdentityGateway | undefined {
  const issuer: unknown = process.env['EXPO_PUBLIC_KEYCLOAK_ISSUER'];
  if (typeof issuer !== 'string' || issuer === '') return undefined;

  const configured: unknown = process.env['EXPO_PUBLIC_KEYCLOAK_CLIENT_ID'];
  const clientId = typeof configured === 'string' && configured !== '' ? configured : 'runtrack-app';

  // Calculée une fois : le fournisseur compare celle de la demande et celle de
  // l'échange, et deux valeurs différentes donnent un `invalid_grant` muet. Elle
  // doit aussi figurer dans le client du realm, sinon la demande est refusée
  // avant même d'afficher quoi que ce soit.
  const redirectUri = defaultRedirectUri();

  const flow = createExpoAuthorizationFlow({
    authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
    clientId,
    redirectUri,
  });
  const tokens = new OidcTokens({ issuerUri: issuer, clientId, redirectUri }, clock);

  return new ExpoIdentityGateway(flow, tokens);
}
