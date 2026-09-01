import { RunTrackError } from '@runtrack/core';
import { describe, expect, it } from 'vitest';
import { aHarness } from '../testing/harness';
import { asRunTrackError } from '../testing/expect';
import { queryString, toPage } from './httpClient';
import { toRunTrackError } from './problem';

describe('erreurs problem+json', () => {
  it('lit le code métier, jamais le statut', async () => {
    // Trois causes distinctes rendent 409 : brancher sur le statut, c'est
    // confondre trois choses différentes.
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      status: 409,
      body: {
        type: 'about:blank',
        title: 'Conflit',
        status: 409,
        code: 'IDEMPOTENCY_KEY_REUSED',
        detail: 'Cette clé a déjà servi pour un autre corps',
      },
    }));

    const failure = asRunTrackError(
      await harness.client.request('/race/v1/a1/points').catch((error: unknown) => error),
    );

    expect(failure.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(failure.message).toBe('Cette clé a déjà servi pour un autre corps');
  });

  it('replie un code inconnu sur UNKNOWN sans le laisser passer pour connu', () => {
    const error = toRunTrackError(
      { code: 'CODE_DU_FUTUR', detail: 'inédit' },
      { status: 400, correlationId: 'c1' },
    );

    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe('inédit');
  });

  it('rend quand même une RunTrackError sur un corps qui n’est pas un problème', () => {
    // Sinon l'appelant devrait gérer deux formes d'erreur, et c'est comme ça
    // qu'on finit avec le `catch` vide que le §15 interdit.
    const error = toRunTrackError('<html>502</html>', { status: 502, correlationId: 'c1' });

    expect(error.code).toBe('UNKNOWN');
    expect(error.status).toBe(502);
    expect(error.correlationId).toBe('c1');
  });

  it('replie sur le titre quand le détail manque', () => {
    const error = toRunTrackError(
      { title: 'Trop de tentatives', code: 'TOO_MANY_ATTEMPTS' },
      {
        status: 429,
        correlationId: undefined,
      },
    );

    expect(error.message).toBe('Trop de tentatives');
  });

  it('rend une erreur lisible quand le corps est illisible', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 500 }));

    await expect(harness.client.request('/race/v1/a1')).rejects.toThrow(RunTrackError);
  });
});

describe('identifiant de corrélation', () => {
  it('part sur chaque requête', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    await harness.client.request('/feed/v1');

    expect(harness.transport.sent[0]?.headers['x-correlation-id']).toBe('correlation-1');
  });

  it('l’écho du serveur prime sur celui du client dans l’erreur', async () => {
    // C'est ce que l'utilisateur cite quand il signale un problème : autant que
    // ce soit celui que le serveur a réellement journalisé.
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      status: 404,
      body: { code: 'ACTIVITY_NOT_FOUND', detail: 'absente', correlationId: 'serveur-9' },
    }));

    const failure = asRunTrackError(
      await harness.client.request('/race/v1/a1').catch((error: unknown) => error),
    );

    expect(failure.correlationId).toBe('serveur-9');
  });
});

describe('en-têtes', () => {
  it('porte le jeton d’accès', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    await harness.client.request('/user/v1/me');

    expect(harness.transport.sent[0]?.headers['authorization']).toBe('Bearer access-1');
  });

  it('ne porte aucun jeton sur une requête anonyme', async () => {
    // Le renouvellement lui-même en fait partie : lui envoyer un jeton expiré
    // ferait boucler la coordination sur elle-même.
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    await harness.client.request('/auth/v1/refresh', { method: 'POST', anonymous: true });

    expect(harness.transport.sent[0]?.headers['authorization']).toBeUndefined();
  });

  it('porte la clé d’idempotence quand on la lui donne', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    await harness.client.request('/race/v1/a1/points', {
      method: 'POST',
      idempotencyKey: 'a1:0-999',
      body: { points: [] },
    });

    expect(harness.transport.sent[0]?.headers['idempotency-key']).toBe('a1:0-999');
  });

  it('n’envoie aucun porteur sur un chemin de partage', async () => {
    // Le jeton d'un lien voyage dans le chemin — `/shared/v1/{token}` — et le
    // serveur le résout là. Un porteur de session en plus ferait répondre le
    // serveur en tant que ce compte, pas en tant que porteur du lien.
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    await harness.client.request('/shared/v1/jeton', { anonymous: true });

    expect(harness.transport.sent[0]?.headers['authorization']).toBeUndefined();
  });

  it('accepte un 204 par le chemin sans corps', async () => {
    // `requestVoid` existe pour ça : demander un corps là où le serveur n'en
    // envoie pas obligerait chaque appelant à traiter `undefined` comme un T.
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 204 }));

    await expect(harness.client.requestVoid('/race/v1/a1/likes')).resolves.toBeUndefined();
  });

  it('refuse un corps vide là où un corps est attendu', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 204 }));

    await expect(harness.client.request('/race/v1/a1')).rejects.toThrow(RunTrackError);
  });
});

describe('chaîne de requête', () => {
  it('n’émet rien sans paramètre', () => {
    expect(queryString(undefined)).toBe('');
    expect(queryString({})).toBe('');
  });

  it('omet les paramètres absents plutôt que d’envoyer « undefined »', () => {
    expect(queryString({ cursor: undefined, limit: 20 })).toBe('?limit=20');
  });

  it('échappe ce qui doit l’être', () => {
    expect(queryString({ zone: 'Europe/Paris' })).toBe('?zone=Europe%2FParis');
  });
});

describe('pagination par curseur', () => {
  it('transforme les éléments et garde le curseur', () => {
    expect(toPage({ items: [1, 2], nextCursor: 'c2' }, (value) => value * 2)).toEqual({
      items: [2, 4],
      nextCursor: 'c2',
    });
  });

  it('n’invente pas de curseur sur la dernière page', () => {
    expect(toPage({ items: [1] }, (value) => value)).toEqual({ items: [1] });
  });

  it('tolère une page sans tableau', () => {
    expect(toPage({}, (value: number) => value)).toEqual({ items: [] });
  });
});
