import { RunTrackError, type Clock, type Page } from '@runtrack/core';
import type { RefreshCoordinator } from '../auth/refreshCoordinator';
import type { SessionHolder } from '../auth/sessionHolder';
import { defaultCorrelationIdFactory, type CorrelationIdFactory } from './correlationId';
import { toRunTrackError } from './problem';

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  baseUrl: string;
  clock: Clock;
  /** Injectable so a test drives the transport without a server. */
  fetch?: Fetch;
  newCorrelationId?: CorrelationIdFactory;
  /** Absent on the public share pages, which are read without an account. */
  session?: { holder: SessionHolder; refresh: RefreshCoordinator };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** §6: one key per batch, scoped to an activity. */
  idempotencyKey?: string;
  /**
   * Set for the endpoints that must never carry a bearer: the refresh itself,
   * and the share-link paths — a link is read by someone who may have no
   * account, and a stale bearer would have the server answer as them.
   */
  anonymous?: boolean;
}

const NO_CONTENT = 204;
const UNAUTHORISED = 401;

export class HttpClient {
  private readonly fetchImpl: Fetch;
  private readonly newCorrelationId: CorrelationIdFactory;

  constructor(private readonly options: HttpClientOptions) {
    this.fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.newCorrelationId = options.newCorrelationId ?? defaultCorrelationIdFactory;
  }

  /** For the endpoints that answer 204, or whose body is of no interest. */
  async requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
    await this.exchange(path, options);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body, correlationId } = await this.exchange(path, options);

    if (body === undefined) {
      throw new RunTrackError({
        code: 'UNKNOWN',
        message: 'Réponse vide là où un corps était attendu',
        correlationId,
      });
    }

    // The one boundary conversion of this package: the wire is `unknown`, and
    // the mappers immediately narrow it. Nothing is hidden — the shape is
    // asserted by the mapper tests, not assumed here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return body as T;
  }

  private async exchange(
    path: string,
    options: RequestOptions,
  ): Promise<{ body: unknown; correlationId: string }> {
    const correlationId = this.newCorrelationId();
    const session = this.options.session;

    if (session !== undefined && options.anonymous !== true) {
      // Renewing before sending rather than after a 401: a request that leaves
      // with thirty seconds of validity can still arrive expired, and each one
      // of those is a 401 that risks a stampede.
      const current = await session.holder.load();
      if (current !== undefined && session.refresh.needsPreemptiveRefresh(current)) {
        await session.refresh.refresh(current.refreshToken);
      }
    }

    let response = await this.send(path, options, correlationId);

    if (response.status === UNAUTHORISED && session !== undefined && options.anonymous !== true) {
      const stale = session.holder.current();
      if (stale !== undefined) {
        // One renewal for everyone: see `RefreshCoordinator`.
        await session.refresh.refresh(stale.refreshToken);
        response = await this.send(path, options, correlationId);
      }
    }

    return { body: await this.read(response, correlationId), correlationId };
  }

  private send(path: string, options: RequestOptions, correlationId: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Correlation-Id': correlationId,
    };

    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey !== undefined) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const token = this.options.session?.holder.current()?.accessToken;
    if (token !== undefined && options.anonymous !== true) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const init: RequestInit = { method: options.method ?? 'GET', headers };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);

    return this.fetchImpl(this.options.baseUrl + path + queryString(options.query), init);
  }

  private async read(response: Response, correlationId: string): Promise<unknown> {
    const echoed = response.headers.get('X-Correlation-Id') ?? correlationId;

    if (response.status === NO_CONTENT) return undefined;

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    if (!response.ok) {
      throw toRunTrackError(body, { status: response.status, correlationId: echoed });
    }

    return body;
  }
}

export function queryString(query: RequestOptions['query']): string {
  if (query === undefined) return '';
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

/** Every list endpoint answers with this shape; §0 forbids offset pagination. */
export interface CursorPage<T> {
  items?: T[];
  nextCursor?: string;
}

export function toPage<Dto, Domain>(
  page: CursorPage<Dto>,
  map: (dto: Dto) => Domain,
): Page<Domain> {
  const items = (page.items ?? []).map(map);
  return page.nextCursor === undefined ? { items } : { items, nextCursor: page.nextCursor };
}
