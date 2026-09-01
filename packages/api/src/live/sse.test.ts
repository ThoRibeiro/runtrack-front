import { describe, expect, it, vi } from 'vitest';
import type { LiveMessage, LiveStreamRequest } from '@runtrack/core';
import { FixedClock, activityId } from '@runtrack/core';
import { RefreshCoordinator } from '../auth/refreshCoordinator';
import { SessionHolder } from '../auth/sessionHolder';
import { InMemorySecureStore, NOW, aSession } from '../testing/harness';
import { parseLiveEvent } from './liveParser';
import { SseFrameParser } from './sseFrames';
import { SseLiveStream } from './sseLiveStream';
import {
  fetchSseTransport,
  xhrSseTransport,
  type SseTransport,
  type SseTransportRequest,
  type XhrLike,
} from './sseTransport';

// --- le format du fil --------------------------------------------------------

function collect(chunks: readonly string[]): LiveMessage[] {
  const messages: LiveMessage[] = [];
  const parser = new SseFrameParser((message) => messages.push(message));
  for (const chunk of chunks) parser.push(chunk);
  return messages;
}

describe('SseFrameParser', () => {
  it('lit un événement nommé avec son identifiant', () => {
    const messages = collect(['id: 1710-0\nevent: position\ndata: {"sequenceNumber":4}\n\n']);

    expect(messages).toEqual([{ id: '1710-0', event: 'position', data: { sequenceNumber: 4 } }]);
  });

  it('recolle un message coupé n’importe où par le réseau', () => {
    const whole = 'id: 7\nevent: stats\ndata: {"distanceMeters":1200}\n\n';
    for (let cut = 1; cut < whole.length; cut += 1) {
      const messages = collect([whole.slice(0, cut), whole.slice(cut)]);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.event).toBe('stats');
    }
  });

  it('survit à un CRLF coupé entre ses deux octets', () => {
    const messages = collect(['event: heartbeat\r', '\ndata: "2026-01-01T00:00:00Z"\r\n\r\n']);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.event).toBe('heartbeat');
  });

  it('assemble un data multi-ligne comme la spécification le demande', () => {
    const messages = collect(['event: note\ndata: {"a":\ndata: 1}\n\n']);

    expect(messages[0]?.data).toEqual({ a: 1 });
  });

  it('ignore les commentaires anti-proxy et les champs inconnus', () => {
    const messages = collect([': keep-alive\nretry: 5000\nevent: heartbeat\ndata: "x"\n\n']);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.data).toBe('x');
  });

  it('ne fabrique pas de message sur une ligne vide isolée', () => {
    expect(collect(['\n\n\n'])).toEqual([]);
  });

  it('nomme « message » un événement sans champ event, comme la spécification', () => {
    expect(collect(['data: 1\n\n'])[0]?.event).toBe('message');
  });

  it('laisse passer une charge utile illisible plutôt que de tuer le flux', () => {
    const messages = collect(['event: position\ndata: {ceci n’est pas du JSON\n\n']);

    expect(messages[0]?.data).toBe('{ceci n’est pas du JSON');
  });

  it('refuse un identifiant contenant un octet nul', () => {
    const withNul = `id: a${String.fromCodePoint(0)}b\nevent: heartbeat\ndata: "x"\n\n`;

    expect(collect([withNul])[0]?.id).toBeUndefined();
  });

  it('retire une espace après le deux-points, et une seule', () => {
    expect(collect(['event:  spaced\ndata: "x"\n\n'])[0]?.event).toBe(' spaced');
  });
});

// --- la traduction en événements ---------------------------------------------

describe('parseLiveEvent', () => {
  it('traduit une position, cœur compris', () => {
    const event = parseLiveEvent({
      event: 'position',
      data: {
        sequenceNumber: 12,
        latitude: 48.8566,
        longitude: 2.3522,
        elevation: 35,
        recordedAt: '2026-01-01T10:00:00Z',
        heartRate: 148,
      },
    });

    expect(event).toEqual({
      kind: 'position',
      position: {
        sequenceNumber: 12,
        position: { latitude: 48.8566, longitude: 2.3522 },
        elevationMetres: 35,
        recordedAt: Date.parse('2026-01-01T10:00:00Z'),
        heartRate: 148,
      },
    });
  });

  it('accepte une position sans altitude ni cardio : un téléphone sans baromètre', () => {
    const event = parseLiveEvent({
      event: 'position',
      data: {
        sequenceNumber: 1,
        latitude: 48.8,
        longitude: 2.3,
        recordedAt: '2026-01-01T10:00:00Z',
      },
    });

    if (event?.kind !== 'position') throw new Error('type inattendu');
    expect(event.position.elevationMetres).toBe(0);
    expect(event.position.heartRate).toBeUndefined();
  });

  it('traduit les statistiques par le même chemin que le reste de l’API', () => {
    const event = parseLiveEvent({
      event: 'stats',
      data: { distanceMeters: 4200, elapsedSeconds: 1200, averagePaceSecondsPerKm: 285 },
    });

    if (event?.kind !== 'stats') throw new Error('type inattendu');
    expect(event.stats.distanceMetres).toBe(4200);
    expect(event.stats.averagePaceSecondsPerKm).toBe(285);
    expect(event.stats.elapsedSeconds).toBe(1200);
  });

  it('traduit un changement d’état', () => {
    const event = parseLiveEvent({
      event: 'status',
      data: { status: 'Paused', since: '2026-01-01T10:05:00Z' },
    });

    expect(event).toEqual({
      kind: 'status',
      status: { kind: 'paused', since: Date.parse('2026-01-01T10:05:00Z') },
    });
  });

  it('lit un battement de cœur, dont seule l’arrivée compte', () => {
    expect(parseLiveEvent({ event: 'heartbeat', data: '2026-01-01T10:00:00Z' })).toEqual({
      kind: 'heartbeat',
      at: Date.parse('2026-01-01T10:00:00Z'),
    });
  });

  it.each([
    ['un événement inconnu', { event: 'weather', data: {} }],
    ['une position sans numéro de séquence', { event: 'position', data: { latitude: 1 } }],
    [
      'une position dont la date est illisible',
      {
        event: 'position',
        data: { sequenceNumber: 1, latitude: 1, longitude: 2, recordedAt: 'hier' },
      },
    ],
    [
      'un état que ce build ne connaît pas',
      { event: 'status', data: { status: 'Hibernating', since: '2026-01-01T10:00:00Z' } },
    ],
    ['un état amputé', { event: 'status', data: { status: 'Live' } }],
    ['des statistiques qui ne sont pas un objet', { event: 'stats', data: 'rien' }],
    ['une charge utile nulle', { event: 'position', data: null }],
  ])('laisse tomber %s sans casser le flux', (_name, message) => {
    expect(parseLiveEvent(message)).toBeUndefined();
  });

  it('rend un battement daté de zéro quand l’horodatage est illisible', () => {
    expect(parseLiveEvent({ event: 'heartbeat', data: 42 })).toEqual({ kind: 'heartbeat', at: 0 });
  });
});

// --- l'ouverture de la connexion ---------------------------------------------

interface OpenedRequest extends SseTransportRequest {
  closed: boolean;
}

function recordingTransport(): { transport: SseTransport; opened: OpenedRequest[] } {
  const opened: OpenedRequest[] = [];
  const transport: SseTransport = {
    open(request) {
      const record: OpenedRequest = { ...request, closed: false };
      opened.push(record);
      return {
        close: () => {
          record.closed = true;
        },
      };
    },
  };
  return { transport, opened };
}

function aRequest(overrides: Partial<LiveStreamRequest> = {}): LiveStreamRequest {
  return {
    activityId: activityId('a1'),
    onMessage: () => undefined,
    onError: () => undefined,
    ...overrides,
  };
}

async function aSessionPair(): Promise<{
  holder: SessionHolder;
  refresh: RefreshCoordinator;
  readonly renewals: number;
}> {
  const holder = new SessionHolder(new InMemorySecureStore(aSession()));
  await holder.load();
  const counter = { renewals: 0 };
  const refresh = new RefreshCoordinator(
    holder,
    () => {
      counter.renewals += 1;
      return Promise.resolve(aSession({ accessToken: 'access-2' }));
    },
    new FixedClock(NOW),
  );
  return {
    holder,
    refresh,
    get renewals() {
      return counter.renewals;
    },
  };
}

describe('SseLiveStream', () => {
  it('ouvre le flux de la course, porteur du jeton et de l’en-tête de reprise', async () => {
    const { transport, opened } = recordingTransport();
    const session = await aSessionPair();
    const stream = new SseLiveStream({
      baseUrl: 'https://api.test',
      transport,
      session,
      newCorrelationId: () => 'corr-1',
    });

    stream.open(aRequest({ lastEventId: '1710-4' }));

    expect(opened[0]?.url).toBe('https://api.test/race/v1/a1/stream');
    expect(opened[0]?.headers).toEqual({
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Correlation-Id': 'corr-1',
      'Last-Event-ID': '1710-4',
      Authorization: 'Bearer access-1',
    });
  });

  it('ouvre sans porteur quand le flux est anonyme — une page publique', async () => {
    const { transport, opened } = recordingTransport();
    const session = await aSessionPair();
    new SseLiveStream({
      baseUrl: 'https://api.test',
      transport,
      session,
      anonymous: true,
    }).open(aRequest());

    // Le jeton du lien est dans le chemin, pas dans un en-tête : envoyer le
    // porteur en plus ferait répondre le serveur en tant que ce compte.
    expect(opened[0]?.headers['Authorization']).toBeUndefined();
  });

  it('assemble les fragments et remonte des messages entiers', () => {
    const { transport, opened } = recordingTransport();
    const messages: LiveMessage[] = [];
    new SseLiveStream({ baseUrl: 'https://api.test', transport }).open(
      aRequest({ onMessage: (message) => messages.push(message) }),
    );

    opened[0]?.onChunk('event: heartbeat\ndata: "');
    opened[0]?.onChunk('2026-01-01T00:00:00Z"\n\n');

    expect(messages).toHaveLength(1);
    expect(messages[0]?.event).toBe('heartbeat');
  });

  it('renouvelle une fois sur 401, puis rouvre avec le jeton neuf', async () => {
    const { transport, opened } = recordingTransport();
    const session = await aSessionPair();
    new SseLiveStream({ baseUrl: 'https://api.test', transport, session }).open(aRequest());

    opened[0]?.onOpen(401);
    await vi.waitFor(() => {
      expect(opened).toHaveLength(2);
    });

    expect(session.renewals).toBe(1);
    expect(opened[0]?.closed).toBe(true);
    expect(opened[1]?.headers['Authorization']).toBe('Bearer access-2');
  });

  it('ne renouvelle pas deux fois : un second 401 n’est plus un problème de jeton', async () => {
    const { transport, opened } = recordingTransport();
    const session = await aSessionPair();
    const errors: unknown[] = [];
    new SseLiveStream({ baseUrl: 'https://api.test', transport, session }).open(
      aRequest({ onError: (error) => errors.push(error) }),
    );

    opened[0]?.onOpen(401);
    await vi.waitFor(() => {
      expect(opened).toHaveLength(2);
    });
    opened[1]?.onOpen(401);

    expect(session.renewals).toBe(1);
    expect(errors).toHaveLength(1);
  });

  it('remonte l’échec du renouvellement plutôt que de boucler', async () => {
    const { transport, opened } = recordingTransport();
    const holder = new SessionHolder(new InMemorySecureStore(aSession()));
    await holder.load();
    const refresh = new RefreshCoordinator(
      holder,
      () => Promise.reject(new Error('jeton rejoué')),
      new FixedClock(NOW),
    );
    const errors: unknown[] = [];

    new SseLiveStream({
      baseUrl: 'https://api.test',
      transport,
      session: { holder, refresh },
    }).open(aRequest({ onError: (error) => errors.push(error) }));

    opened[0]?.onOpen(401);
    await vi.waitFor(() => {
      expect(errors).toHaveLength(1);
    });
    expect(opened).toHaveLength(1);
  });

  it('dit qu’il faut une session quand un 401 tombe sans session du tout', () => {
    const { transport, opened } = recordingTransport();
    const errors: unknown[] = [];
    new SseLiveStream({ baseUrl: 'https://api.test', transport }).open(
      aRequest({ onError: (error) => errors.push(error) }),
    );

    opened[0]?.onOpen(401);

    expect(errors).toHaveLength(1);
  });

  it('signale une réponse en erreur, et laisse la session décider de la suite', () => {
    const { transport, opened } = recordingTransport();
    const errors: unknown[] = [];
    new SseLiveStream({ baseUrl: 'https://api.test', transport }).open(
      aRequest({ onError: (error) => errors.push(error) }),
    );

    opened[0]?.onOpen(404);

    expect(errors).toHaveLength(1);
  });

  it('traite une fermeture propre comme une coupure : d’ici, rien ne les distingue', () => {
    const { transport, opened } = recordingTransport();
    const errors: unknown[] = [];
    new SseLiveStream({ baseUrl: 'https://api.test', transport }).open(
      aRequest({ onError: (error) => errors.push(error) }),
    );

    opened[0]?.onClose();

    expect(errors).toHaveLength(1);
  });

  it('se tait une fois fermé par l’écran', () => {
    const { transport, opened } = recordingTransport();
    const errors: unknown[] = [];
    const messages: LiveMessage[] = [];
    const subscription = new SseLiveStream({ baseUrl: 'https://api.test', transport }).open(
      aRequest({
        onError: (error) => errors.push(error),
        onMessage: (message) => messages.push(message),
      }),
    );

    subscription.close();
    opened[0]?.onChunk('event: heartbeat\ndata: "x"\n\n');
    opened[0]?.onClose();
    opened[0]?.onError(new Error('trop tard'));
    opened[0]?.onOpen(500);

    expect(opened[0]?.closed).toBe(true);
    expect(messages).toEqual([]);
    expect(errors).toEqual([]);
  });
});

// --- les deux transports -----------------------------------------------------

describe('fetchSseTransport', () => {
  function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
  }

  it('rend chaque morceau du corps, puis annonce la fin', async () => {
    const chunks: string[] = [];
    const closed = vi.fn();
    const transport = fetchSseTransport(() =>
      Promise.resolve(new Response(streamOf(['event: a\n', 'data: 1\n\n']), { status: 200 })),
    );

    transport.open({
      url: 'https://api.test/stream',
      headers: {},
      onOpen: () => undefined,
      onChunk: (text) => chunks.push(text),
      onError: () => undefined,
      onClose: closed,
    });

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });
    expect(chunks.join('')).toBe('event: a\ndata: 1\n\n');
  });

  it('annonce le statut et n’essaie pas de lire un corps d’erreur', async () => {
    const statuses: number[] = [];
    const closed = vi.fn();
    const transport = fetchSseTransport(() =>
      Promise.resolve(new Response('nope', { status: 401 })),
    );

    transport.open({
      url: 'https://api.test/stream',
      headers: {},
      onOpen: (status) => statuses.push(status),
      onChunk: () => undefined,
      onError: () => undefined,
      onClose: closed,
    });

    await vi.waitFor(() => {
      expect(closed).toHaveBeenCalled();
    });
    expect(statuses).toEqual([401]);
  });

  it('remonte une panne réseau', async () => {
    const failed = vi.fn();
    const transport = fetchSseTransport(() => Promise.reject(new Error('offline')));

    transport.open({
      url: 'https://api.test/stream',
      headers: {},
      onOpen: () => undefined,
      onChunk: () => undefined,
      onError: failed,
      onClose: () => undefined,
    });

    await vi.waitFor(() => {
      expect(failed).toHaveBeenCalled();
    });
  });

  it('ne signale rien quand c’est nous qui raccrochons', async () => {
    const failed = vi.fn();
    const closed = vi.fn();
    // Une réponse qui n'arrive jamais : le seul événement sera notre fermeture.
    const transport = fetchSseTransport(() => new Promise<Response>(() => undefined));

    transport
      .open({
        url: 'https://api.test/stream',
        headers: {},
        onOpen: () => undefined,
        onChunk: () => undefined,
        onError: failed,
        onClose: closed,
      })
      .close();
    await Promise.resolve();

    expect(failed).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });
});

describe('xhrSseTransport', () => {
  class FakeXhr implements XhrLike {
    readyState = 0;
    status = 0;
    responseText = '';
    onreadystatechange: ((event: never) => void) | null = null;
    onerror: ((event: never) => void) | null = null;
    headers: Record<string, string> = {};
    url = '';
    aborted = 0;

    open(_method: string, url: string): void {
      this.url = url;
    }

    setRequestHeader(name: string, value: string): void {
      this.headers[name] = value;
    }

    send(): void {
      this.readyState = 2;
      this.status = 200;
      this.fire();
    }

    abort(): void {
      this.aborted += 1;
      this.readyState = 4;
      this.fire();
    }

    /** Le serveur pousse : `responseText` grandit, l'événement se rejoue. */
    grow(text: string): void {
      this.readyState = 3;
      this.responseText += text;
      this.fire();
    }

    finish(): void {
      this.readyState = 4;
      this.fire();
    }

    fail(): void {
      // Appelé sans argument : les gestionnaires n'en lisent aucun, et un
      // paramètre `never` ne se fabrique pas — c'est tout l'intérêt du type.
      const handler: ((...args: never[]) => void) | null = this.onerror;
      handler?.();
    }

    private fire(): void {
      const handler: ((...args: never[]) => void) | null = this.onreadystatechange;
      handler?.();
    }
  }

  function open(xhr: FakeXhr): {
    chunks: string[];
    statuses: number[];
    errors: unknown[];
    closes: () => number;
    subscription: { close(): void };
  } {
    const chunks: string[] = [];
    const statuses: number[] = [];
    const errors: unknown[] = [];
    let closes = 0;
    const subscription = xhrSseTransport(() => xhr).open({
      url: 'https://api.test/stream',
      headers: { Authorization: 'Bearer x' },
      onOpen: (status) => statuses.push(status),
      onChunk: (text) => chunks.push(text),
      onError: (error) => errors.push(error),
      onClose: () => {
        closes += 1;
      },
    });
    return { chunks, statuses, errors, closes: () => closes, subscription };
  }

  it('ne rend que ce qui vient d’arriver, jamais tout le texte accumulé', () => {
    const xhr = new FakeXhr();
    const observed = open(xhr);

    xhr.grow('event: a\ndata: 1\n\n');
    xhr.grow('event: b\ndata: 2\n\n');

    expect(observed.chunks).toEqual(['event: a\ndata: 1\n\n', 'event: b\ndata: 2\n\n']);
  });

  it('porte les en-têtes, ce que `EventSource` ne sait pas faire', () => {
    const xhr = new FakeXhr();
    open(xhr);

    expect(xhr.headers['Authorization']).toBe('Bearer x');
    expect(xhr.url).toBe('https://api.test/stream');
  });

  it('annonce le statut une seule fois', () => {
    const xhr = new FakeXhr();
    const observed = open(xhr);

    xhr.grow('data: 1\n\n');
    xhr.finish();

    expect(observed.statuses).toEqual([200]);
  });

  it('annonce la fin quand le serveur raccroche', () => {
    const xhr = new FakeXhr();
    const observed = open(xhr);

    xhr.finish();

    expect(observed.closes()).toBe(1);
  });

  it('ne prend pas notre propre fermeture pour une déconnexion du serveur', () => {
    const xhr = new FakeXhr();
    const observed = open(xhr);

    observed.subscription.close();

    expect(xhr.aborted).toBe(1);
    expect(observed.closes()).toBe(0);
    expect(observed.errors).toEqual([]);
  });

  it('remonte une panne de transport', () => {
    const xhr = new FakeXhr();
    const observed = open(xhr);

    xhr.fail();
    xhr.fail();

    expect(observed.errors).toHaveLength(1);
  });
});
