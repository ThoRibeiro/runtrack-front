import { render, type RenderResult } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import {
  FixedClock,
  userId,
  type ActivityGateway,
  type AuthGateway,
  type FeedGateway,
  type SecureStore,
  type Session,
  type UserGateway,
} from '@runtrack/core';
import { SessionHolder, RefreshCoordinator } from '@runtrack/api';
import { ThemeProvider } from '@runtrack/ui';
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

export interface Harness {
  runtime: Runtime;
  auth: FakeAuthGateway;
  store: InMemorySecureStore;
}

/**
 * Only the gateways this lot exercises are real. The others are spelled out
 * rather than proxied: a stub that throws by name says which wire is missing,
 * and each lot replaces its own with a proper double.
 */
function absent(name: string): never {
  throw new Error(`Passerelle ${name} non branchée dans ce test`);
}

const noActivities: ActivityGateway = {
  start: () => absent('courses'),
  byId: () => absent('courses'),
  ingest: () => absent('courses'),
  pause: () => absent('courses'),
  resume: () => absent('courses'),
  finish: () => absent('courses'),
  discard: () => absent('courses'),
  changeVisibility: () => absent('courses'),
  track: () => absent('courses'),
  splits: () => absent('courses'),
  ofUser: () => absent('courses'),
  live: () => absent('courses'),
};

const noUsers: UserGateway = {
  me: () => absent('comptes'),
  updateProfile: () => absent('comptes'),
  changeHandle: () => absent('comptes'),
  changeAvatar: () => absent('comptes'),
  updatePhysiology: () => absent('comptes'),
  changeVisibility: () => absent('comptes'),
  stats: () => absent('comptes'),
  deleteAccount: () => absent('comptes'),
};

const noFeed: FeedGateway = { read: () => absent('fil') };

export function aRuntime(options: { session?: Session } = {}): Harness {
  const clock = new FixedClock(NOW);
  const store =
    options.session === undefined
      ? new InMemorySecureStore()
      : new InMemorySecureStore(options.session);
  const sessions = new SessionHolder(store);
  const auth = new FakeAuthGateway();

  const runtime: Runtime = {
    auth,
    activities: noActivities,
    users: noUsers,
    feed: noFeed,
    sessions,
    refresh: new RefreshCoordinator(sessions, () => auth.refresh(), clock),
    clock,
  };

  return { runtime, auth, store };
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
