import type {
  ActivityGateway,
  AuthGateway,
  Clock,
  FeedGateway,
  SecureStore,
  SocialGateway,
  TrackDecoder,
  UserGateway,
} from '@runtrack/core';
import { ChunkedTrackDecoder, type MapSurfaceComponent } from '@runtrack/adapters';
import {
  HttpActivityGateway,
  HttpAuthGateway,
  HttpClient,
  HttpFeedGateway,
  HttpSocialGateway,
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
  social: SocialGateway;
  sessions: SessionHolder;
  refresh: RefreshCoordinator;
  clock: Clock;
  /**
   * §8: the two map implementations have nothing in common, so each shell
   * injects its own here. It is a component and not a port because something
   * has to *mount* a map — and the hexagon has never heard of a component.
   */
  map: MapSurfaceComponent;
  trackDecoder: TrackDecoder;
}

export interface RuntimeOptions {
  baseUrl: string;
  secureStore: SecureStore;
  clock: Clock;
  map: MapSurfaceComponent;
  /** Defaults to the sliced decoder; a test hands in its own. */
  trackDecoder?: TrackDecoder | undefined;
}

export function createRuntime({
  baseUrl,
  secureStore,
  clock,
  map,
  trackDecoder,
}: RuntimeOptions): Runtime {
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
    social: new HttpSocialGateway(http),
    sessions,
    refresh,
    clock,
    map,
    trackDecoder: trackDecoder ?? new ChunkedTrackDecoder(),
  };
}
