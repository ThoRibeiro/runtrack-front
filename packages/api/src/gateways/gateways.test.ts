import { RunTrackError, activityId, userId } from '@runtrack/core';
import { describe, expect, it } from 'vitest';
import { NOW, aHarness } from '../testing/harness';
import { bodyOf } from '../testing/expect';
import { decodeBase64Url, subjectOf } from '../auth/jwt';
import { HttpActivityGateway } from './httpActivityGateway';
import { HttpAuthGateway } from './httpAuthGateway';
import { HttpFeedGateway } from './httpFeedGateway';
import { HttpUserGateway } from './httpUserGateway';

/** Un JWT dont seule la charge utile compte : rien ici ne vérifie de signature. */
function aToken(subject: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: subject }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${payload}.signature`;
}

describe('lecture du sujet d’un jeton', () => {
  it('lit le compte auquel la session appartient', () => {
    expect(subjectOf(aToken('u-42'))).toBe('u-42');
  });

  it('décode l’UTF-8 sans abîmer les accents', () => {
    expect(subjectOf(aToken('thomas-éà'))).toBe('thomas-éà');
  });

  it('refuse un jeton mal formé plutôt que d’inventer un compte', () => {
    expect(() => subjectOf('pas-un-jeton')).toThrow(RunTrackError);
    expect(() => subjectOf('a.@@@.c')).toThrow(RunTrackError);
    expect(() => subjectOf(`a.${Buffer.from('{}').toString('base64url')}.c`)).toThrow(
      RunTrackError,
    );
  });

  it('décode le base64url, alphabet compris', () => {
    expect(decodeBase64Url('aGVsbG8')).toBe('hello');
  });

  it('décode tout l’UTF-8, pas seulement l’ASCII et les accents', () => {
    // Un sujet de jeton n'est pas censé en contenir, mais un décodeur qui coupe
    // un caractère en deux le fait sans le dire.
    for (const text of ['déjà', '日本語', '🏃‍♂️']) {
      const encoded = Buffer.from(text, 'utf8').toString('base64url');
      expect(decodeBase64Url(encoded)).toBe(text);
    }
  });
});

describe('HttpAuthGateway', () => {
  it('ouvre une session et en déduit la date d’expiration', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { accessToken: aToken('u-42'), refreshToken: 'r1', expiresIn: 900 },
    }));
    const gateway = new HttpAuthGateway(harness.client, harness.clock);

    const session = await gateway.logIn({ email: 'a@b.fr', password: 'motdepasse1234' });

    expect(session.userId).toBe('u-42');
    // 900 s de durée de vie relative deviennent un instant absolu.
    expect(session.accessTokenExpiresAt).toBe(NOW + 900_000);
  });

  it('renouvelle sans jamais porter de jeton d’accès', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { accessToken: aToken('u-42'), refreshToken: 'r2', expiresIn: 900 },
    }));
    const gateway = new HttpAuthGateway(harness.client, harness.clock);

    await gateway.refresh('r1');

    expect(harness.transport.sent[0]?.headers['authorization']).toBeUndefined();
    expect(harness.transport.sent[0]?.url).toContain('/auth/v1/refresh');
  });
});

describe('HttpActivityGateway', () => {
  it('démarre une course sur le chemin du back-end, pas celui du cahier des charges', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        id: 'a1',
        ownerId: 'u1',
        type: 'RUN',
        title: 'Sortie',
        visibility: 'PUBLIC',
        status: 'Live',
        startedAt: '2026-01-15T08:00:00Z',
      },
    }));
    const gateway = new HttpActivityGateway(harness.client);

    const activity = await gateway.start({
      type: 'RUN',
      title: 'Sortie',
      visibility: 'PUBLIC',
      deviceTime: NOW,
    });

    expect(harness.transport.sent[0]?.url).toBe('https://runtrack.test/race/v1');
    expect(activity.status.kind).toBe('live');
  });

  it('envoie deviceTime au démarrage, et lui seul', async () => {
    // §6 : la dérive est mesurée une seule fois. Le renvoyer en cours de route
    // décalerait la trace.
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        id: 'a1',
        ownerId: 'u1',
        type: 'RUN',
        title: 'x',
        visibility: 'PUBLIC',
        status: 'Live',
        startedAt: '2026-01-15T08:00:00Z',
      },
    }));
    const gateway = new HttpActivityGateway(harness.client);

    await gateway.start({ type: 'RUN', title: 'x', visibility: 'PUBLIC', deviceTime: NOW });
    expect(bodyOf(harness.transport.sent[0]?.body)['deviceTime']).toBe(new Date(NOW).toISOString());

    harness.transport.answerWith(() => ({ body: { lastAcceptedSequence: 0, acceptedCount: 1 } }));
    await gateway.ingest({
      activityId: activityId('a1'),
      idempotencyKey: 'a1:0-0',
      points: [
        {
          sequenceNumber: 0,
          position: { latitude: 48.85, longitude: 2.35 },
          elevationMetres: 30,
          recordedAt: NOW + 1_000,
          accuracyMetres: 5,
        },
      ],
    });

    expect(bodyOf(harness.transport.sent[1]?.body)).not.toHaveProperty('deviceTime');
  });

  it('porte la clé d’idempotence du lot', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { lastAcceptedSequence: 3, acceptedCount: 4, rejected: [] },
    }));
    const gateway = new HttpActivityGateway(harness.client);

    const outcome = await gateway.ingest({
      activityId: activityId('a1'),
      idempotencyKey: 'a1:0-3',
      points: [],
    });

    expect(harness.transport.sent[0]?.headers['idempotency-key']).toBe('a1:0-3');
    expect(outcome.lastAcceptedSequence).toBe(3);
  });

  it('lit les courses en cours des comptes suivis', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        items: [
          {
            id: 'a1',
            ownerId: 'u2',
            type: 'RUN',
            title: 'x',
            visibility: 'PUBLIC',
            status: 'Live',
            startedAt: '2026-01-15T08:00:00Z',
          },
        ],
      },
    }));

    const live = await new HttpActivityGateway(harness.client).live();

    expect(live).toHaveLength(1);
    expect(harness.transport.sent[0]?.url).toContain('/race/v1/live');
  });

  it('pagine par curseur, jamais par offset', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { items: [], nextCursor: 'c2' } }));

    const page = await new HttpActivityGateway(harness.client).ofUser(userId('u2'), {
      cursor: 'c1',
      limit: 20,
    });

    expect(harness.transport.sent[0]?.url).toContain('cursor=c1&limit=20');
    expect(harness.transport.sent[0]?.url).not.toContain('offset');
    expect(page.nextCursor).toBe('c2');
  });
});

describe('HttpUserGateway', () => {
  it('demande le bilan dans le fuseau du client', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { period: 'WEEK', distanceMeters: 27_200 } }));

    const totals = await new HttpUserGateway(harness.client).stats('WEEK', 'Europe/Paris');

    expect(harness.transport.sent[0]?.url).toContain('period=WEEK&zone=Europe%2FParis');
    expect(totals.distanceMetres).toBe(27_200);
  });
});

describe('HttpFeedGateway', () => {
  it('lit le fil', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        items: [
          {
            activityId: 'a1',
            author: { id: 'u1', handle: 'thomas', displayName: 'Thomas' },
            type: 'RUN',
            title: 'Sortie',
            status: 'Finished',
            startedAt: '2026-01-15T08:00:00Z',
            endedAt: '2026-01-15T09:00:00Z',
          },
        ],
        nextCursor: '2026-01-15T08:00:00Z',
      },
    }));

    const page = await new HttpFeedGateway(harness.client).read({ limit: 20 });

    expect(page.items[0]?.title).toBe('Sortie');
    expect(page.nextCursor).toBe('2026-01-15T08:00:00Z');
  });
});
