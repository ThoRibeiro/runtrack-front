import type { LiveMessage } from '@runtrack/core';

/**
 * The SSE wire format, parsed here rather than by `EventSource`.
 *
 * Why not `EventSource`: it cannot carry an `Authorization` header, and the
 * stream of §7 is authenticated like every other endpoint — the back-end reads
 * a `Viewer` from the bearer, and a private activity answers "not found" on
 * this path like on any other. Passing a JWT in the query string instead would
 * put it in access logs and browser history. So the frames are parsed by hand,
 * over a transport that can set headers (§8 of `docs/decisions-lot-8.md`).
 *
 * The format is small and fully specified: fields are `field: value` lines, a
 * blank line dispatches the event, `data` accumulates across lines joined by
 * `\n`, and a line starting with `:` is a comment. Anything else is ignored,
 * which is what the specification asks for — a server is allowed to send fields
 * a client has never heard of.
 */
const DEFAULT_EVENT = 'message';

interface Frame {
  id: string | undefined;
  event: string;
  data: string[];
}

function emptyFrame(): Frame {
  return { id: undefined, event: DEFAULT_EVENT, data: [] };
}

/**
 * Feeds on arbitrary chunks of text and emits whole messages.
 *
 * A chunk boundary falls wherever the network decides — mid-line, mid-word,
 * between the `\r` and the `\n` of a CRLF. So the incomplete tail is kept and
 * prepended to the next chunk; anything else loses an event every few minutes,
 * which is the kind of bug that only shows up in production.
 */
export class SseFrameParser {
  private buffer = '';
  private frame = emptyFrame();

  constructor(private readonly onMessage: (message: LiveMessage) => void) {}

  push(chunk: string): void {
    this.buffer += chunk;

    // A trailing `\r` may be the first half of a CRLF: hold it back.
    const endsOnCarriageReturn = this.buffer.endsWith('\r');
    const usable = endsOnCarriageReturn ? this.buffer.slice(0, -1) : this.buffer;
    const lines = usable.split(/\r\n|\n|\r/);

    // The last element is the incomplete line, unless the chunk ended cleanly.
    this.buffer = (lines.pop() ?? '') + (endsOnCarriageReturn ? '\r' : '');

    for (const line of lines) this.readLine(line);
  }

  private readLine(line: string): void {
    if (line === '') {
      this.dispatch();
      return;
    }
    // A comment. The server uses them to keep proxies from closing an idle
    // connection, and they are not events.
    if (line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    // "If value starts with a space, remove it" — one space, not all of them.
    const raw = separator === -1 ? '' : line.slice(separator + 1);
    const value = raw.startsWith(' ') ? raw.slice(1) : raw;

    switch (field) {
      case 'id':
        // The specification says an id containing a NUL is to be ignored.
        if (!value.includes('\0')) this.frame.id = value;
        break;
      case 'event':
        this.frame.event = value;
        break;
      case 'data':
        this.frame.data.push(value);
        break;
      // `retry` is deliberately unread: §7 fixes the reconnection policy —
      // exponential backoff with jitter — and a server should not be able to
      // talk a thousand clients into reconnecting in unison.
      default:
        break;
    }
  }

  private dispatch(): void {
    const frame = this.frame;
    this.frame = emptyFrame();

    // A blank line with nothing before it dispatches nothing.
    if (frame.data.length === 0) return;

    const data = frame.data.join('\n');
    this.onMessage({
      id: frame.id,
      event: frame.event,
      // The payload is JSON on every event this server sends; a body that is
      // not is handed over raw, and the parser above decides it is unusable.
      data: parseJson(data),
    });
  }
}

function parseJson(data: string): unknown {
  try {
    // `JSON.parse` is typed `any`; the boundary narrows it to `unknown` here,
    // and `parseLiveEvent` is what actually gives it a shape.
    const parsed: unknown = JSON.parse(data);
    return parsed;
  } catch {
    // Not swallowed: the raw string travels on, and `parseLiveEvent` drops the
    // message. Throwing here would kill a live stream over one bad frame.
    return data;
  }
}
