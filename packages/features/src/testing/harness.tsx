import { render, type RenderResult } from '@testing-library/react-native';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactElement, type ReactNode } from 'react';
import {
  FixedClock,
  userId,
  type AuthGateway,
  type MapRenderer,
  type SecureStore,
  type Session,
} from '@runtrack/core';
import { ChunkedTrackDecoder, type MapSurfaceComponent } from '@runtrack/adapters';
import { SessionHolder, RefreshCoordinator } from '@runtrack/api';
import { ThemeProvider } from '@runtrack/ui';
import { FakeActivityGateway, FakeFeedGateway, FakeSocialGateway, FakeUserGateway } from './fakes';
import { RuntimeProvider } from '../runtime/RuntimeProvider';
import type { Runtime } from '../runtime/runtime';
import { SessionProvider } from '../session/SessionProvider';

export const NOW = 1_700_000_000_000;

export function aSession(overrides: Partial<Session> = {}): Session {
  return {
    userId: userId('u-42'),
    accessToken: 'access',
    refreshToken: 'refresh',
    accessTokenExpiresAt: NOW + 900_000,
    ...overrides,
  };
}

export class InMemorySecureStore implements SecureStore {
  cleared = 0;

  constructor(private session?: Session) {}

  read(): Promise<Session | undefined> {
    return Promise.resolve(this.session);
  }

  write(session: Session): Promise<void> {
    this.session = session;
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.cleared += 1;
    this.session = undefined;
    return Promise.resolve();
  }
}

/** An auth gateway the test decides the answers of. */
export class FakeAuthGateway implements AuthGateway {
  signUpCalls: unknown[] = [];
  logInCalls: unknown[] = [];
  logOutCalls: string[] = [];
  resetCalls: { token: string; password: string }[] = [];
  forgotCalls: string[] = [];
  verifyCalls: string[] = [];

  onSignUp: () => Promise<void> = () => Promise.resolve();
  onLogIn: () => Promise<Session> = () => Promise.resolve(aSession());
  onLogOut: () => Promise<void> = () => Promise.resolve();
  onForgot: () => Promise<void> = () => Promise.resolve();
  onReset: () => Promise<void> = () => Promise.resolve();
  onVerify: () => Promise<void> = () => Promise.resolve();

  signUp(command: unknown): Promise<void> {
    this.signUpCalls.push(command);
    return this.onSignUp();
  }

  logIn(credentials: unknown): Promise<Session> {
    this.logInCalls.push(credentials);
    return this.onLogIn();
  }

  refresh(): Promise<Session> {
    return Promise.resolve(aSession());
  }

  logOut(refreshToken: string): Promise<void> {
    this.logOutCalls.push(refreshToken);
    return this.onLogOut();
  }

  requestPasswordReset(email: string): Promise<void> {
    this.forgotCalls.push(email);
    return this.onForgot();
  }

  resetPassword(token: string, password: string): Promise<void> {
    this.resetCalls.push({ token, password });
    return this.onReset();
  }

  verifyEmail(token: string): Promise<void> {
    this.verifyCalls.push(token);
    return this.onVerify();
  }
}

/**
 * A map that draws nothing and records everything.
 *
 * §8's two real surfaces are a WebGL canvas and a native view; neither renders
 * in jest, and neither needs to. What a screen test has to answer is what the
 * map was *told* — and that is exactly what this keeps.
 */
export class RecordingMapRenderer implements MapRenderer {
  traces: readonly (readonly { latitude: number; longitude: number }[])[] = [];
  markerLabels: readonly string[] = [];
  fits = 0;
  followed = 0;
  private panListeners = new Set<() => void>();

  setTrace(points: readonly { latitude: number; longitude: number }[]): void {
    this.traces = [...this.traces, points];
  }

  appendToTrace(points: readonly { latitude: number; longitude: number }[]): void {
    this.traces = [...this.traces, points];
  }

  setMarkers(markers: readonly { accessibilityLabel: string }[]): void {
    this.markerLabels = markers.map((marker) => marker.accessibilityLabel);
  }

  fitTo(): void {
    this.fits += 1;
  }

  followPosition(): void {
    this.followed += 1;
  }

  onUserMovedView(listener: () => void): () => void {
    this.panListeners.add(listener);
    return () => this.panListeners.delete(listener);
  }

  /** The user drags the map, from a test. */
  pan(): void {
    for (const listener of this.panListeners) listener();
  }
}

export interface Harness {
  runtime: Runtime;
  auth: FakeAuthGateway;
  feed: FakeFeedGateway;
  activities: FakeActivityGateway;
  users: FakeUserGateway;
  social: FakeSocialGateway;
  store: InMemorySecureStore;
  map: RecordingMapRenderer;
}

export function aRuntime(options: { session?: Session } = {}): Harness {
  const clock = new FixedClock(NOW);
  const store =
    options.session === undefined
      ? new InMemorySecureStore()
      : new InMemorySecureStore(options.session);
  const sessions = new SessionHolder(store);
  const auth = new FakeAuthGateway();

  const feed = new FakeFeedGateway();
  const activities = new FakeActivityGateway();
  const users = new FakeUserGateway();
  const social = new FakeSocialGateway();

  const map = new RecordingMapRenderer();
  const MapSurface: MapSurfaceComponent = ({ onReady, accessibilityLabel, testID }) => {
    // Handed over once, on mount, the way a real surface does when its canvas
    // becomes usable — never on every render, which would be a render loop.
    useEffect(() => {
      onReady(map);
    }, [onReady]);
    return <View accessibilityLabel={accessibilityLabel} testID={testID} />;
  };

  const runtime: Runtime = {
    auth,
    activities,
    users,
    feed,
    social,
    sessions,
    refresh: new RefreshCoordinator(sessions, () => auth.refresh(), clock),
    clock,
    map: MapSurface,
    // The real one: a decode is a decode, and slicing it is what §8 asks for.
    trackDecoder: new ChunkedTrackDecoder(),
  };

  return { runtime, auth, feed, activities, users, social, store, map };
}

/**
 * The provider stack on its own, for `renderHook` — which needs a wrapper
 * rather than a rendered tree.
 */
export function wrapperFor(harness: Harness): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return function Providers({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={client}>
        <RuntimeProvider runtime={harness.runtime}>
          <SessionProvider>
            <ThemeProvider name="light">{children}</ThemeProvider>
          </SessionProvider>
        </RuntimeProvider>
      </QueryClientProvider>
    );
  };
}

export function renderWithRuntime(node: ReactElement, harness: Harness): Promise<RenderResult> {
  // Pas de cache et pas de réessai : la politique réelle est vérifiée à part,
  // et un cache qui survit à un test fait attendre jest sur ses minuteries.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  function Providers({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={client}>
        <RuntimeProvider runtime={harness.runtime}>
          <SessionProvider>
            <ThemeProvider name="light">{children}</ThemeProvider>
          </SessionProvider>
        </RuntimeProvider>
      </QueryClientProvider>
    );
  }

  return render(<Providers>{node}</Providers>);
}
