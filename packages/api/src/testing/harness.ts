import { FixedClock, type FileUploader, type SecureStore, type Session } from '@runtrack/core';
import { userId } from '@runtrack/core';
import { RefreshCoordinator } from '../auth/refreshCoordinator';
import { SessionHolder } from '../auth/sessionHolder';
import { HttpClient, type Fetch } from '../http/httpClient';

export const NOW = 1_700_000_000_000;

export function aSession(overrides: Partial<Session> = {}): Session {
  return {
    userId: userId('u1'),
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    accessTokenExpiresAt: NOW + 15 * 60_000,
    ...overrides,
  };
}

/** A secure store in memory: Keychain without the Keychain. */
export class InMemorySecureStore implements SecureStore {
  writes = 0;
  clears = 0;

  constructor(private session?: Session) {}

  read(): Promise<Session | undefined> {
    return Promise.resolve(this.session);
  }

  write(session: Session): Promise<void> {
    this.writes += 1;
    this.session = session;
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.clears += 1;
    this.session = undefined;
    return Promise.resolve();
  }
}

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface StubbedResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * A transport the test drives. It records what left, and answers what the test
 * decided — including the delay, which is what makes ten parallel requests
 * actually overlap.
 */
export class FakeTransport {
  readonly sent: RecordedRequest[] = [];
  private handler: (request: RecordedRequest) => StubbedResponse | Promise<StubbedResponse> =
    () => ({
      body: {},
    });

  answerWith(
    handler: (request: RecordedRequest) => StubbedResponse | Promise<StubbedResponse>,
  ): void {
    this.handler = handler;
  }

  countOf(pathFragment: string): number {
    return this.sent.filter((request) => request.url.includes(pathFragment)).length;
  }

  readonly fetch: Fetch = async (input, init) => {
    // `Headers` lowercases every name, which is what HTTP does — the
    // assertions read them in that form rather than in the one this client
    // happens to write.
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, name) => {
      headers[name] = value;
    });

    const request: RecordedRequest = {
      url: input,
      method: init?.method ?? 'GET',
      headers,
      // Un corps multipart n'est pas du JSON : on le garde tel quel, pour que
      // le test d'un téléversement puisse vérifier ce qui est réellement parti.
      body:
        typeof init?.body === 'string'
          ? JSON.parse(init.body)
          : (init?.body ?? undefined),
    };
    this.sent.push(request);

    const stubbed = await this.handler(request);
    const status = stubbed.status ?? 200;

    // A real `Response`, not a shape that looks like one: the client reads
    // `headers.get` and `json()`, and a hand-made double drifts from both.
    return new Response(stubbed.body === undefined ? null : JSON.stringify(stubbed.body), {
      status,
      headers: { 'Content-Type': 'application/json', ...stubbed.headers },
    });
  };
}

export interface Harness {
  client: HttpClient;
  transport: FakeTransport;
  holder: SessionHolder;
  store: InMemorySecureStore;
  coordinator: RefreshCoordinator;
  clock: FixedClock;
  /** How many renewals actually reached the server. */
  refreshCount: () => number;
}

export function aHarness(
  options: {
    session?: Session | undefined;
    refresher?: (token: string) => Promise<Session>;
    now?: number;
    /** Le téléversement de la plateforme, quand le test en simule un. */
    uploader?: FileUploader | undefined;
  } = {},
): Harness {
  const clock = new FixedClock(options.now ?? NOW);
  const store = new InMemorySecureStore(options.session ?? aSession());
  const holder = new SessionHolder(store);
  const transport = new FakeTransport();

  let renewals = 0;
  const refresher =
    options.refresher ??
    ((token: string) => {
      renewals += 1;
      return Promise.resolve(
        aSession({
          accessToken: `access-after-${token}`,
          refreshToken: `rotated-${token}`,
          accessTokenExpiresAt: clock.now() + 15 * 60_000,
        }),
      );
    });

  const counted = (token: string) => {
    if (options.refresher !== undefined) renewals += 1;
    return refresher(token);
  };

  const coordinator = new RefreshCoordinator(holder, counted, clock);
  const client = new HttpClient({
    baseUrl: 'https://runtrack.test',
    clock,
    fetch: transport.fetch,
    newCorrelationId: () => 'correlation-1',
    session: { holder, refresh: coordinator },
    uploader: options.uploader,
  });

  return { client, transport, holder, store, coordinator, clock, refreshCount: () => renewals };
}
