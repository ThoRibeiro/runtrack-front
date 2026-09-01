import type {
  ActivityGateway,
  AuthGateway,
  Clock,
  FeedGateway,
  EngagementGateway,
  LiveStream,
  LocationTracker,
  NetworkMonitor,
  NotificationGateway,
  NotificationStream,
  PushRegistry,
  PointBuffer,
  Random,
  Scheduler,
  SecureStore,
  SharingGateway,
  SocialGateway,
  TrackDecoder,
  UserGateway,
} from '@runtrack/core';
import {
  ChunkedTrackDecoder,
  SystemRandom,
  SystemScheduler,
  type MapSurfaceComponent,
} from '@runtrack/adapters';
import {
  HttpActivityGateway,
  HttpAuthGateway,
  HttpClient,
  HttpDeviceGateway,
  HttpEngagementGateway,
  HttpFeedGateway,
  HttpNotificationGateway,
  HttpSharingGateway,
  HttpSocialGateway,
  HttpUserGateway,
  RefreshCoordinator,
  SessionHolder,
  SseLiveStream,
  SseNotificationStream,
  sseTransportForRuntime,
} from '@runtrack/api';

/**
 * The composition root, shared by the two shells.
 *
 * It is the only place that knows an `ActivityGateway` is HTTP, and the only
 * place that wires the single-flight refresh of §11 into the client. A screen
 * receives ports; it never builds one.
 */
export interface Runtime {
  /** The base URL, kept so a share page can build its own paths (§10, web). */
  baseUrl: string;
  auth: AuthGateway;
  activities: ActivityGateway;
  users: UserGateway;
  feed: FeedGateway;
  social: SocialGateway;
  engagement: EngagementGateway;
  sharing: SharingGateway;
  sessions: SessionHolder;
  /** For the share pages, which build `/shared/v1/{token}` paths of their own. */
  http: HttpClient;
  refresh: RefreshCoordinator;
  clock: Clock;
  /**
   * §8: the two map implementations have nothing in common, so each shell
   * injects its own here. It is a component and not a port because something
   * has to *mount* a map — and the hexagon has never heard of a component.
   */
  map: MapSurfaceComponent;
  trackDecoder: TrackDecoder;
  /** §7: the SSE stream, behind its port — `EventSource` is not an option. */
  live: LiveStream;
  notifications: NotificationGateway;
  /** §12: the second stream, the inbox. */
  notificationStream: NotificationStream;
  devices: HttpDeviceGateway;
  /**
   * §12: FCM and APNs tokens. `undefined` on the web, which has none — the
   * port exists so that this is an absent capability rather than a branch.
   */
  push: PushRegistry | undefined;
  /** The watchdog and the backoff of §7 need both of these to be testable. */
  scheduler: Scheduler;
  random: Random;
  /**
   * §9: connectivity, everywhere and not only while recording.
   *
   * It moved out of the recording capability in lot 12: the offline story is
   * not the recorder's alone — every screen owes the runner an honest state
   * rather than a spinner that never stops.
   */
  network: NetworkMonitor;
  /**
   * §2: **the web cannot record.** A browser does not do background
   * geolocation and its tab falls asleep — a fact to accept, not a limitation
   * to work around. So this is `undefined` on the web shell, and the screens
   * that need it only exist on mobile.
   */
  recording: RecordingCapability | undefined;
}

/** What §6 needs from the platform, and what the web shell cannot provide. */
export interface RecordingCapability {
  buffer: PointBuffer;
  tracker: LocationTracker;
}

export interface RuntimeOptions {
  baseUrl: string;
  secureStore: SecureStore;
  clock: Clock;
  map: MapSurfaceComponent;
  /** Defaults to the sliced decoder; a test hands in its own. */
  trackDecoder?: TrackDecoder | undefined;
  /** Mobile only (§2). */
  recording?: RecordingCapability | undefined;
  network: NetworkMonitor;
  /**
   * Mobile only (§12): a browser has no push token.
   *
   * A factory rather than an instance: a push registry needs the device
   * gateway, which is built here. Handing it in afterwards would mean either
   * mutating the runtime or building a second HTTP client for the same three
   * endpoints.
   */
  push?: ((devices: HttpDeviceGateway) => PushRegistry) | undefined;
}

export function createRuntime({
  baseUrl,
  secureStore,
  clock,
  map,
  trackDecoder,
  recording,
  push,
  network,
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

  // The stream carries the same bearer and renews through the same coordinator
  // as every request: §11's single flight covers the live connection too.
  const transport = sseTransportForRuntime();
  const live = new SseLiveStream({
    baseUrl,
    transport,
    session: { holder: sessions, refresh },
  });
  const notificationStream = new SseNotificationStream({
    baseUrl,
    transport,
    session: { holder: sessions, refresh },
  });
  const devices = new HttpDeviceGateway(http);
  // The share pages need the raw client: their paths are not the activity ones.
  const httpClient = http;

  return {
    baseUrl,
    auth,
    activities: new HttpActivityGateway(http),
    users: new HttpUserGateway(http),
    feed: new HttpFeedGateway(http),
    social: new HttpSocialGateway(http),
    engagement: new HttpEngagementGateway(http),
    sharing: new HttpSharingGateway(http),
    sessions,
    http: httpClient,
    refresh,
    clock,
    map,
    trackDecoder: trackDecoder ?? new ChunkedTrackDecoder(),
    live,
    notifications: new HttpNotificationGateway(http),
    notificationStream,
    devices,
    push: push?.(devices),
    scheduler: new SystemScheduler(),
    random: new SystemRandom(),
    network,
    recording,
  };
}
