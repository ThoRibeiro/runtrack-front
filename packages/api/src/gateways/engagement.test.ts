import { describe, expect, it } from 'vitest';
import { activityId, commentId, shareLinkId, userId } from '@runtrack/core';
import { aHarness } from '../testing/harness';
import { bodyOf } from '../testing/expect';
import { HttpEngagementGateway, toComment, toLikes } from './httpEngagementGateway';
import { HttpSharingGateway, toShareLink } from './httpSharingGateway';
import { SharedActivityGateway } from './sharedActivityGateway';

const RUN = activityId('a1');

describe('la traduction de l’engagement', () => {
  it('lit un commentaire complet', () => {
    const comment = toComment({
      id: 'c1',
      activityId: 'a1',
      authorId: 'u-9',
      parentId: 'c0',
      body: 'Belle sortie',
      createdAt: '2026-01-01T10:00:00Z',
      editedAt: '2026-01-01T10:05:00Z',
      deleted: false,
    });

    expect(comment).toEqual({
      id: commentId('c1'),
      activityId: RUN,
      authorId: userId('u-9'),
      parentId: commentId('c0'),
      body: 'Belle sortie',
      postedAt: Date.parse('2026-01-01T10:00:00Z'),
      editedAt: Date.parse('2026-01-01T10:05:00Z'),
      deleted: false,
    });
  });

  it('garde sa place à un commentaire supprimé, sans son texte', () => {
    const comment = toComment({
      id: 'c1',
      activityId: 'a1',
      authorId: 'u-9',
      createdAt: '2026-01-01T10:00:00Z',
      deleted: true,
    });

    expect(comment.deleted).toBe(true);
    expect(comment.body).toBe('');
    expect(comment.parentId).toBeUndefined();
  });

  it('lit un décompte de j’aime, cœur du lecteur compris', () => {
    expect(toLikes({ total: 12, likedByViewer: true, recentUserIds: ['u-1', 'u-2'] })).toEqual({
      total: 12,
      likedByViewer: true,
      recentUserIds: [userId('u-1'), userId('u-2')],
    });
  });

  it('lit un décompte vide sans rien inventer', () => {
    expect(toLikes({})).toEqual({ total: 0, likedByViewer: false, recentUserIds: [] });
  });
});

describe('HttpEngagementGateway', () => {
  it('aime et rend le nouvel état, pas un accusé vide', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { total: 3, likedByViewer: true } }));

    const likes = await new HttpEngagementGateway(harness.client).like(RUN);

    expect(harness.transport.sent[0]?.method).toBe('POST');
    expect(harness.transport.sent[0]?.url).toContain('/race/v1/a1/likes');
    // Le serveur répond l'état : le cœur se pose sur la vérité, pas sur ce que
    // le client a supposé.
    expect(likes.total).toBe(3);
    expect(likes.likedByViewer).toBe(true);
  });

  it('retire un j’aime', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { total: 2, likedByViewer: false } }));

    const likes = await new HttpEngagementGateway(harness.client).unlike(RUN);

    expect(harness.transport.sent[0]?.method).toBe('DELETE');
    expect(likes.likedByViewer).toBe(false);
  });

  it('lit un fil de commentaires paginé par curseur', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        items: [{ id: 'c1', activityId: 'a1', authorId: 'u-9', createdAt: '2026-01-01T10:00:00Z' }],
        nextCursor: '2026-01-01T09:00:00Z',
      },
    }));

    const page = await new HttpEngagementGateway(harness.client).comments(RUN, { limit: 20 });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe('2026-01-01T09:00:00Z');
  });

  it('publie une réponse à un commentaire', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { id: 'c2', activityId: 'a1', authorId: 'u-1', createdAt: '2026-01-01T11:00:00Z' },
    }));

    await new HttpEngagementGateway(harness.client).postComment(RUN, 'Bravo', commentId('c1'));

    expect(bodyOf(harness.transport.sent[0]?.body)).toEqual({ body: 'Bravo', parentId: 'c1' });
  });

  it('modifie et supprime un commentaire par son propre chemin', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { id: 'c1', activityId: 'a1', authorId: 'u-1', createdAt: '2026-01-01T10:00:00Z' },
    }));
    const gateway = new HttpEngagementGateway(harness.client);

    await gateway.editComment(commentId('c1'), 'Corrigé');
    harness.transport.answerWith(() => ({ status: 204 }));
    await gateway.deleteComment(commentId('c1'));

    expect(harness.transport.sent[0]?.method).toBe('PATCH');
    expect(harness.transport.sent[0]?.url).toContain('/comment/v1/c1');
    expect(harness.transport.sent[1]?.method).toBe('DELETE');
  });
});

describe('HttpSharingGateway', () => {
  it('crée un lien et rend son jeton en clair — la seule fois où il existe', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        id: 's1',
        token: 'jeton-clair',
        url: '/shared/v1/jeton-clair',
        createdAt: '2026-01-01T10:00:00Z',
        viewCount: 0,
      },
    }));

    const link = await new HttpSharingGateway(harness.client).create(RUN, 48);

    expect(bodyOf(harness.transport.sent[0]?.body)).toEqual({ validForHours: 48 });
    expect(link.token).toBe('jeton-clair');
  });

  it('liste des liens qui n’ont plus de jeton', async () => {
    // Le serveur ne le rend qu'à la création : l'écran propose de révoquer, pas
    // de recopier ce qu'il n'a plus.
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { items: [{ id: 's1', createdAt: '2026-01-01T10:00:00Z', viewCount: 4 }] },
    }));

    const links = await new HttpSharingGateway(harness.client).linksOf(RUN);

    expect(links[0]?.token).toBe('');
    expect(links[0]?.viewCount).toBe(4);
  });

  it('révoque un lien', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 204 }));

    await new HttpSharingGateway(harness.client).revoke(shareLinkId('s1'));

    expect(harness.transport.sent[0]?.method).toBe('DELETE');
    expect(harness.transport.sent[0]?.url).toContain('/share-link/v1/s1');
  });

  it('lit un lien expiré et un lien révoqué sans les confondre', () => {
    const expired = toShareLink({
      id: 's1',
      createdAt: '2026-01-01T10:00:00Z',
      expiresAt: '2026-01-02T10:00:00Z',
    });
    const revoked = toShareLink({
      id: 's2',
      createdAt: '2026-01-01T10:00:00Z',
      revokedAt: '2026-01-01T12:00:00Z',
    });

    expect(expired.expiresAt).toBeDefined();
    expect(expired.revokedAt).toBeUndefined();
    expect(revoked.revokedAt).toBeDefined();
  });
});

describe('SharedActivityGateway', () => {
  it('lit la course par le chemin du lien, sans porteur', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { id: 'a1', ownerId: 'u-9', status: 'Finished', startedAt: '2026-01-01T10:00:00Z' },
    }));

    await new SharedActivityGateway(harness.client, 'jeton').activity();

    // Le serveur résout `/shared/v1/{token}` et réachemine vers la course : le
    // jeton est dans le chemin, jamais dans un en-tête.
    expect(harness.transport.sent[0]?.url).toContain('/shared/v1/jeton');
    expect(harness.transport.sent[0]?.headers['authorization']).toBeUndefined();
  });

  it('porte le suffixe tel quel pour la trace et les kilomètres', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { polyline: '', items: [] } }));
    const gateway = new SharedActivityGateway(harness.client, 'jeton');

    await gateway.track();
    await gateway.splits();

    expect(harness.transport.sent[0]?.url).toContain('/shared/v1/jeton/track');
    expect(harness.transport.sent[1]?.url).toContain('/shared/v1/jeton/splits');
  });

  it('échappe un jeton qui contient des caractères d’URL', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: { id: 'a1', ownerId: 'u-9', status: 'Finished', startedAt: '2026-01-01T10:00:00Z' },
    }));

    await new SharedActivityGateway(harness.client, 'a/b+c').activity();

    expect(harness.transport.sent[0]?.url).toContain('a%2Fb%2Bc');
  });

  it('dit sur quelle URL le direct d’un lien s’ouvre', () => {
    const harness = aHarness();
    const gateway = new SharedActivityGateway(harness.client, 'jeton');

    expect(gateway.streamUrl('https://api.test')).toBe('https://api.test/shared/v1/jeton/stream');
  });
});
