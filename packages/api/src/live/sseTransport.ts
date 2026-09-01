/**
 * Bytes off an SSE connection, and the two ways of getting them.
 *
 * `EventSource` is not one of them: it cannot set an `Authorization` header,
 * and this stream is authenticated like every other endpoint. So the connection
 * is opened by hand — and the two runtimes disagree on how:
 *
 *  - **a browser** streams a `fetch` response body through a reader, which
 *    hands over each chunk and keeps nothing;
 *  - **React Native** has no streaming `fetch` (`response.body` is null there),
 *    but `XMLHttpRequest` fires `readystatechange` as `responseText` grows. The
 *    text accumulates for the life of the connection — roughly a megabyte over
 *    a three-hour run, which is affordable — and only the tail is handed over.
 *
 * The choice is made on **capability, not platform**: a runtime that gains
 * streaming fetch tomorrow gets the better path without a release, and a
 * mistaken guess falls back to XHR, which works everywhere.
 */
export interface SseTransportRequest {
  url: string;
  headers: Record<string, string>;
  /** The HTTP status, as soon as the headers are in. 401 drives the renewal. */
  onOpen: (status: number) => void;
  onChunk: (text: string) => void;
  onError: (error: unknown) => void;
  /** The server hung up. Expected: an activity that ends stops publishing. */
  onClose: () => void;
}

export interface SseTransportSubscription {
  close(): void;
}

export interface SseTransport {
  open(request: SseTransportRequest): SseTransportSubscription;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function supportsStreamingFetch(): boolean {
  return (
    typeof ReadableStream === 'function' &&
    typeof Response === 'function' &&
    // React Native's fetch is the whatwg polyfill: it has no `body` at all.
    'body' in Response.prototype
  );
}

export function fetchSseTransport(fetchImpl?: FetchLike): SseTransport {
  const send: FetchLike = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  return {
    open(request) {
      const controller = new AbortController();
      // Behind a function: the compiler narrows a `let` that no synchronous
      // path writes to, and every guard after an await would disappear.
      const state = { closed: false };
      const gone = (): boolean => state.closed;

      void (async () => {
        try {
          const response = await send(request.url, {
            headers: request.headers,
            signal: controller.signal,
          });
          if (gone()) return;

          request.onOpen(response.status);
          const body = response.body;
          if (!response.ok || body === null) {
            // A non-200 has no stream to read. The status already went out;
            // whoever is listening decides between renewing and giving up.
            request.onClose();
            return;
          }

          const reader = body.getReader();
          const decoder = new TextDecoder();
          for (;;) {
            const { done, value } = await reader.read();
            if (gone()) return;
            if (done) break;
            // `stream: true` keeps a multi-byte character split across two
            // chunks readable — an accent in an activity title is enough.
            request.onChunk(decoder.decode(value, { stream: true }));
          }
          request.onClose();
        } catch (error) {
          // An abort is us closing the connection, not a failure.
          if (!gone()) request.onError(error);
        }
      })();

      return {
        close: () => {
          state.closed = true;
          controller.abort();
        },
      };
    },
  };
}

/** The slice of `XMLHttpRequest` this needs, so a test can stand in for it. */
export interface XhrLike {
  readyState: number;
  status: number;
  responseText: string;
  // The parameter is typed loosely on purpose: the DOM declares one as an
  // `Event` and the other as a `ProgressEvent`, and React Native declares its
  // own. Neither handler here reads it — what matters is `readyState` — and
  // this is what lets a real `XMLHttpRequest` satisfy the type without a cast.
  onreadystatechange: ((event: never) => void) | null;
  onerror: ((event: never) => void) | null;
  open(method: string, url: string, async: boolean): void;
  setRequestHeader(name: string, value: string): void;
  send(): void;
  abort(): void;
}

const HEADERS_RECEIVED = 2;
const LOADING = 3;
const DONE = 4;

export function xhrSseTransport(create?: () => XhrLike): SseTransport {
  const build = create ?? ((): XhrLike => new XMLHttpRequest());

  return {
    open(request) {
      const xhr = build();
      let delivered = 0;
      let announced = false;
      let closed = false;

      xhr.onreadystatechange = () => {
        if (closed) return;

        if (xhr.readyState >= HEADERS_RECEIVED && !announced) {
          announced = true;
          request.onOpen(xhr.status);
        }
        if (xhr.readyState >= LOADING) {
          const text = xhr.responseText;
          if (text.length > delivered) {
            request.onChunk(text.slice(delivered));
            delivered = text.length;
          }
        }
        if (xhr.readyState === DONE) {
          closed = true;
          request.onClose();
        }
      };

      xhr.onerror = () => {
        if (closed) return;
        closed = true;
        request.onError(new Error('Connexion au direct interrompue.'));
      };

      xhr.open('GET', request.url, true);
      for (const [name, value] of Object.entries(request.headers)) {
        xhr.setRequestHeader(name, value);
      }
      xhr.send();

      return {
        close: () => {
          // Set before aborting: `abort()` fires `readystatechange` with
          // `DONE`, and a close would otherwise report itself as the server
          // hanging up — which would trigger a reconnection to nothing.
          closed = true;
          xhr.abort();
        },
      };
    },
  };
}

export function sseTransportForRuntime(): SseTransport {
  return supportsStreamingFetch() ? fetchSseTransport() : xhrSseTransport();
}
