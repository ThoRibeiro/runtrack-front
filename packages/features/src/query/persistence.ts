import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

/**
 * What survives being offline, and — as §12 puts it — **rien de plus**.
 *
 * §9 lists three things that must work without a network:
 *
 *  - the run in progress, which is not here at all: it lives in SQLite, written
 *    before anything else (§6, lot 9). A query cache would be the wrong place;
 *  - the last feed page read;
 *  - the activities already opened.
 *
 * And it names what must **not** be kept: the live stream's data. It lives on
 * the server, it changes every second, and a cache over it would only show
 * something false.
 *
 * So this is an allow-list rather than a deny-list. A deny-list means every
 * query added later is persisted by default, and the day someone adds one
 * holding a token or a live position, nobody notices.
 */
const PERSISTED_ROOTS = ['feed', 'activity'] as const;

/**
 * Keys that are live, that a cache would falsify, or that are cheaper to
 * rebuild than to store.
 *
 * `decoded` is the last kind: a decoded track is ten thousand points of JSON,
 * the largest thing the cache would hold by an order of magnitude, and it comes
 * back from the polyline in about four milliseconds.
 */
const NEVER_PERSISTED = ['live', 'likes', 'comments', 'share-links', 'decoded'] as const;

/**
 * The slice of a query this reads.
 *
 * Declared rather than imported: `Query` is a generic class with a dozen type
 * parameters, and a test that wants to ask "would you keep this key?" should
 * not have to build one. TanStack's `Query` satisfies this structurally.
 */
export interface PersistableQuery {
  queryKey: readonly unknown[];
  state: { status: string };
}

export function shouldPersistQuery(query: PersistableQuery): boolean {
  const parts = query.queryKey.filter((part): part is string => typeof part === 'string');
  const [root] = parts;
  if (root === undefined || !PERSISTED_ROOTS.some((allowed) => allowed === root)) return false;

  // `['activity', 'live']` is the list of running activities: it is stale the
  // moment it is written.
  if (parts.some((part) => NEVER_PERSISTED.some((banned) => banned === part))) return false;

  return query.state.status === 'success';
}

/**
 * A persister over any key/value store that can hold a string.
 *
 * Written rather than pulled in so that the storage stays a two-method
 * interface — `AsyncStorage` on mobile, `localStorage` on the web — and so that
 * a failure to write is silent. A cache that cannot be saved is a cache that
 * will be rebuilt from the network; crashing the application over it would be
 * absurd.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null> | string | null;
  // `unknown` and not `void`: `AsyncStorage` returns a promise, `localStorage`
  // returns nothing, and both are awaited without reading the result.
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

export const CACHE_KEY = 'runtrack-query-cache';

export function createPersister(store: KeyValueStore, key = CACHE_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await store.setItem(key, JSON.stringify(client));
      } catch {
        // Quota exceeded, private browsing, a store that refuses: the cache is
        // an optimisation, and losing it costs a refetch.
      }
    },
    restoreClient: async () => {
      try {
        const stored = await store.getItem(key);
        if (typeof stored !== 'string') return undefined;
        const parsed: unknown = JSON.parse(stored);
        return isPersistedClient(parsed) ? parsed : undefined;
      } catch {
        // Corrupt, or written by an older shape of the cache. Starting empty is
        // always safe; guessing at half a cache is not.
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await store.removeItem(key);
      } catch {
        // Nothing to do about it, and nothing that depends on it.
      }
    },
  };
}

function isPersistedClient(value: unknown): value is PersistedClient {
  return (
    typeof value === 'object' && value !== null && 'clientState' in value && 'timestamp' in value
  );
}

/** In-memory, for the web shell before anything is stored and for tests. */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}
