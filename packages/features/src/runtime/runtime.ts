import type {
  ActivityGateway,
  AuthGateway,
  Clock,
  FeedGateway,
  SecureStore,
  UserGateway,
} from '@runtrack/core';
import {
  HttpActivityGateway,
  HttpAuthGateway,
  HttpClient,
  HttpFeedGateway,
  HttpUserGateway,
  RefreshCoordinator,
  SessionHolder,
} from '@runtrack/api';

/**
 * The composition root, shared by the two shells.
 *
 * It is the only place that knows an `ActivityGateway` is HTTP, and the only
 * place that wires the single-flight refresh of §11 into the client. A screen
 * receives ports; it never builds one.
 */
export interface Runtime {
  auth: AuthGateway;
  activities: ActivityGateway;
  users: UserGateway;
  feed: FeedGateway;
  sessions: SessionHolder;
  refresh: RefreshCoordinator;
  clock: Clock;
}

export interface RuntimeOptions {
  baseUrl: string;
  secureStore: SecureStore;
  clock: Clock;
}

export function createRuntime({ baseUrl, secureStore, clock }: RuntimeOptions): Runtime {
  const sessions = new SessionHolder(secureStore);

  // The knot: the coordinator renews through the auth gateway, and the auth
  // gateway sends through a client that consults the coordinator. It is only
  // apparent — `/auth/v1/refresh` is sent anonymously, so the renewal never
  // re-enters the path that triggered it. The late binding keeps the two
  // objects honest rather than duplicating a client for the auth endpoints.
  let auth: AuthGateway | undefined = undefined;
  const refresh = new RefreshCoordinator(
    sessions,
    (refreshToken) => {
      if (auth === undefined)
        throw new Error('Runtime incomplet : passerelle d’authentification absente');
      return auth.refresh(refreshToken);
    },
    clock,
  );

  const http = new HttpClient({ baseUrl, clock, session: { holder: sessions, refresh } });
  auth = new HttpAuthGateway(http, clock);

  return {
    auth,
    activities: new HttpActivityGateway(http),
    users: new HttpUserGateway(http),
    feed: new HttpFeedGateway(http),
    sessions,
    refresh,
    clock,
  };
}
