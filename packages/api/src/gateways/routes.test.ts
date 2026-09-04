import { activityId, userId } from '@runtrack/core';
import { describe, expect, it } from 'vitest';
import { aHarness } from '../testing/harness';
import { bodyOf } from '../testing/expect';
import { HttpActivityGateway } from './httpActivityGateway';
import { HttpAuthGateway } from './httpAuthGateway';
import { HttpSocialGateway } from './httpSocialGateway';
import { HttpUserGateway } from './httpUserGateway';

/**
 * Le verbe et le chemin de chaque appel, épinglés.
 *
 * Ce n'est pas du test de passe-plat : le §0 du cahier des charges annonce
 * `/api/v1/activities`, le back-end répond sur `/race/v1`, et c'est exactement
 * ce genre d'écart que ce tableau attrape — au build, pas au premier écran.
 */
const A1 = activityId('a1');
const U2 = userId('u2');

const ACTIVITY_BODY = {
  id: 'a1',
  ownerId: 'u1',
  type: 'RUN',
  title: 'Sortie',
  visibility: 'PUBLIC',
  status: 'Live',
  startedAt: '2026-01-15T08:00:00Z',
};

const PROFILE_BODY = {
  id: 'u1',
  handle: 'thomas',
  displayName: 'Thomas',
  email: 'thomas@exemple.fr',
  status: 'ACTIVE',
  accountScope: 'PUBLIC',
  registeredAt: '2026-01-01T00:00:00Z',
};

interface Route {
  name: string;
  call: (harness: ReturnType<typeof aHarness>) => Promise<unknown>;
  method: string;
  path: string;
  body?: unknown;
}

const ROUTES: Route[] = [
  {
    name: 'course par identifiant',
    call: (h) => new HttpActivityGateway(h.client).byId(A1),
    method: 'GET',
    path: '/race/v1/a1',
    body: ACTIVITY_BODY,
  },
  {
    name: 'mise en pause',
    call: (h) => new HttpActivityGateway(h.client).pause(A1),
    method: 'POST',
    path: '/race/v1/a1/pause',
    body: { ...ACTIVITY_BODY, status: 'Paused' },
  },
  {
    name: 'reprise',
    call: (h) => new HttpActivityGateway(h.client).resume(A1),
    method: 'POST',
    path: '/race/v1/a1/resume',
    body: ACTIVITY_BODY,
  },
  {
    name: 'fin de course',
    call: (h) => new HttpActivityGateway(h.client).finish(A1),
    method: 'POST',
    path: '/race/v1/a1/finish',
    body: { ...ACTIVITY_BODY, status: 'Finished', endedAt: '2026-01-15T09:00:00Z' },
  },
  {
    name: 'abandon',
    call: (h) => new HttpActivityGateway(h.client).discard(A1),
    method: 'POST',
    path: '/race/v1/a1/discard',
    body: { ...ACTIVITY_BODY, status: 'Discarded', endedAt: '2026-01-15T09:00:00Z' },
  },
  {
    name: 'trace historisée',
    call: (h) => new HttpActivityGateway(h.client).track(A1),
    method: 'GET',
    path: '/race/v1/a1/track',
    body: { polyline: '_p~iF', pointCount: 2 },
  },
  {
    name: 'splits kilométriques',
    call: (h) => new HttpActivityGateway(h.client).splits(A1),
    method: 'GET',
    path: '/race/v1/a1/splits',
    body: { items: [{ kilometerIndex: 0, complete: true }] },
  },
  {
    name: 'courses d’un compte',
    call: (h) => new HttpActivityGateway(h.client).ofUser(U2, {}),
    method: 'GET',
    path: '/user/v1/u2/races',
    body: { items: [] },
  },
  {
    name: 'son propre profil',
    call: (h) => new HttpUserGateway(h.client).me(),
    method: 'GET',
    path: '/user/v1/me',
    body: PROFILE_BODY,
  },
  {
    name: 'édition du profil',
    call: (h) => new HttpUserGateway(h.client).updateProfile({ displayName: 'Thomas R.' }),
    method: 'PATCH',
    path: '/user/v1/me',
    body: PROFILE_BODY,
  },
  {
    name: 'lecture de la physiologie',
    call: (h) => new HttpUserGateway(h.client).physiology(),
    method: 'GET',
    path: '/user/v1/me/physiology',
    body: { biologicalSex: 'MALE', weightKilograms: 72, heightCentimeters: 178 },
  },
  {
    name: 'physiologie',
    call: (h) =>
      new HttpUserGateway(h.client).updatePhysiology({
        birthDate: '1998-03-04',
        biologicalSex: 'MALE',
        weightKilograms: 72,
        heightCentimetres: 178,
      }),
    method: 'PUT',
    path: '/user/v1/me/physiology',
    body: { heightCentimeters: 178, biologicalSex: 'MALE' },
  },
  {
    name: 'suppression d’une course',
    call: (h) => new HttpActivityGateway(h.client).delete(A1),
    method: 'DELETE',
    path: '/race/v1/a1',
    body: {},
  },
  {
    name: 'suppression de compte',
    call: (h) => new HttpUserGateway(h.client).deleteAccount(),
    method: 'DELETE',
    path: '/user/v1/me',
    body: {},
  },
  {
    name: 'profil public par pseudonyme',
    call: (h) => new HttpSocialGateway(h.client).profileOf('camille'),
    method: 'GET',
    path: '/user/v1/camille',
    body: { id: 'u-7', handle: 'camille' },
  },
  {
    name: 'recherche de coureur',
    call: (h) => new HttpSocialGateway(h.client).search('cam'),
    method: 'GET',
    path: '/user/v1?search=cam',
    body: [],
  },
  {
    name: 'liste des abonnés',
    call: (h) => new HttpSocialGateway(h.client).followers(U2),
    method: 'GET',
    path: '/user/v1/u2/followers',
    body: { userIds: ['u-1'], count: 128 },
  },
  {
    name: 'liste des abonnements',
    call: (h) => new HttpSocialGateway(h.client).following(U2),
    method: 'GET',
    path: '/user/v1/u2/following',
    body: { userIds: [], count: 0 },
  },
  {
    name: 'suivre',
    call: (h) => new HttpSocialGateway(h.client).follow(U2),
    method: 'POST',
    path: '/user/v1/u2/follow',
    body: { status: 'PENDING', pending: true },
  },
  {
    name: 'ne plus suivre',
    call: (h) => new HttpSocialGateway(h.client).unfollow(U2),
    method: 'DELETE',
    path: '/user/v1/u2/follow',
    body: {},
  },
  {
    name: 'bloquer',
    call: (h) => new HttpSocialGateway(h.client).block(U2),
    method: 'POST',
    path: '/user/v1/u2/block',
    body: {},
  },
  {
    name: 'débloquer',
    call: (h) => new HttpSocialGateway(h.client).unblock(U2),
    method: 'DELETE',
    path: '/user/v1/u2/block',
    body: {},
  },
  {
    name: 'demandes en attente',
    call: (h) => new HttpSocialGateway(h.client).pendingRequests(),
    method: 'GET',
    path: '/user/v1/me/follow-requests',
    body: [],
  },
  {
    name: 'accepter une demande',
    call: (h) => new HttpSocialGateway(h.client).acceptRequest(U2),
    method: 'POST',
    path: '/user/v1/me/follow-requests/u2/accept',
    body: {},
  },
  {
    name: 'refuser une demande',
    call: (h) => new HttpSocialGateway(h.client).rejectRequest(U2),
    method: 'POST',
    path: '/user/v1/me/follow-requests/u2/reject',
    body: {},
  },
  {
    name: 'inscription',
    call: (h) =>
      new HttpAuthGateway(h.client, h.clock).signUp({
        handle: 'thomas',
        email: 'a@b.fr',
        displayName: 'Thomas',
        password: 'motdepasse1234',
      }),
    method: 'POST',
    path: '/auth/v1/signup',
    body: { userId: 'u1' },
  },
  {
    name: 'déconnexion',
    call: (h) => new HttpAuthGateway(h.client, h.clock).logOut('r1'),
    method: 'POST',
    path: '/auth/v1/logout',
    body: {},
  },
  {
    name: 'mot de passe oublié',
    call: (h) => new HttpAuthGateway(h.client, h.clock).requestPasswordReset('a@b.fr'),
    method: 'POST',
    path: '/auth/v1/password/forgot',
    body: {},
  },
  {
    name: 'réinitialisation',
    call: (h) => new HttpAuthGateway(h.client, h.clock).resetPassword('t', 'motdepasse1234'),
    method: 'POST',
    path: '/auth/v1/password/reset',
    body: {},
  },
  {
    name: 'confirmation d’adresse',
    call: (h) => new HttpAuthGateway(h.client, h.clock).verifyEmail('t'),
    method: 'GET',
    path: '/auth/v1/verify-email?token=t',
    body: {},
  },
];

describe.each(ROUTES)('$name', (route) => {
  it(`appelle ${route.method} ${route.path}`, async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: route.body ?? {} }));

    await route.call(harness);

    expect(harness.transport.sent[0]?.method).toBe(route.method);
    expect(harness.transport.sent[0]?.url).toBe(`https://runtrack.test${route.path}`);
  });
});

describe('corps épinglés', () => {
  /**
   * Le verbe et le chemin ne suffisent pas : le serveur attend `password`, et
   * envoyer `newPassword` rendait 422 sur un parcours qu'aucun test de chemin
   * ne traversait. Ce que le corps nomme fait partie du contrat.
   */
  it('nomme le nouveau mot de passe comme le serveur le nomme', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    await new HttpAuthGateway(harness.client, harness.clock).resetPassword('t', 'motdepasse1234');

    expect(bodyOf(harness.transport.sent[0]?.body)).toEqual({
      token: 't',
      password: 'motdepasse1234',
    });
  });
});

describe('appels en deux temps', () => {
  it('relit le profil après un changement de pseudonyme', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: PROFILE_BODY }));

    await new HttpUserGateway(harness.client).changeHandle('thomas2');

    expect(harness.transport.sent.map((request) => `${request.method} ${request.url}`)).toEqual([
      'PUT https://runtrack.test/user/v1/me/handle',
      'GET https://runtrack.test/user/v1/me',
    ]);
  });

  it('relit le profil après un changement d’avatar', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: PROFILE_BODY }));

    await new HttpUserGateway(harness.client).changeAvatar('https://exemple.fr/a.png');

    expect(harness.transport.sent[0]?.url).toContain('/user/v1/me/avatar');
  });

  it('relit le profil après un changement de visibilité de compte', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: PROFILE_BODY }));

    await new HttpUserGateway(harness.client).changeVisibility('FOLLOWERS');

    expect(bodyOf(harness.transport.sent[0]?.body)['accountScope']).toBe('FOLLOWERS');
  });

  it('relit la course après un changement de visibilité', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: ACTIVITY_BODY }));

    await new HttpActivityGateway(harness.client).changeVisibility(A1, 'PUBLIC');

    expect(harness.transport.sent.map((request) => request.method)).toEqual(['PUT', 'GET']);
  });
});

describe('HttpSocialGateway', () => {
  it('transpose une liste d’identifiants et garde le compte du serveur', async () => {
    // Le compte du serveur, pas `userIds.length` : c'est celui qu'affiche
    // l'en-tête de profil, et il reste juste si la liste est un jour tronquée.
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { userIds: ['u-1', 'u-2'], count: 128 } }));

    const list = await new HttpSocialGateway(harness.client).followers(U2);

    expect(list.userIds).toEqual(['u-1', 'u-2']);
    expect(list.count).toBe(128);
  });

  it('replie sur la longueur quand le serveur omet le compte', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { userIds: ['u-1'] } }));

    expect((await new HttpSocialGateway(harness.client).followers(U2)).count).toBe(1);
  });

  it('lit l’état d’abonnement, en repliant sur le drapeau « pending »', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { pending: true } }));

    expect(await new HttpSocialGateway(harness.client).follow(U2)).toBe('PENDING');
  });

  it('transpose une demande en attente', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: [{ requestId: 'r1', followerId: 'u-9', requestedAt: '2026-01-15T08:00:00Z' }],
    }));

    const requests = await new HttpSocialGateway(harness.client).pendingRequests();

    expect(requests[0]).toEqual({
      requestId: 'r1',
      followerId: 'u-9',
      requestedAt: Date.UTC(2026, 0, 15, 8, 0, 0),
    });
  });

  it('refuse une demande sans auteur, qui ne mènerait à rien', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: [{ requestId: 'r1' }] }));

    await expect(new HttpSocialGateway(harness.client).pendingRequests()).rejects.toThrow();
  });
});

describe('les transitions d’une course', () => {
  /**
   * Le serveur répond 204 sur pause/reprise/fin/abandon. Le client réclamait un
   * corps, et terminer une course échouait sur « Réponse vide là où un corps
   * était attendu » — alors que le serveur, lui, avait bien terminé la course.
   */
  const MOVES = [
    { name: 'pause', call: (g: HttpActivityGateway) => g.pause(A1) },
    { name: 'reprise', call: (g: HttpActivityGateway) => g.resume(A1) },
    { name: 'fin', call: (g: HttpActivityGateway) => g.finish(A1) },
    { name: 'abandon', call: (g: HttpActivityGateway) => g.discard(A1) },
  ];

  it.each(MOVES)('$name : accepte un 204 et relit l’état d’après', async ({ call }) => {
    const harness = aHarness();
    harness.transport.answerWith((request) =>
      request.method === 'POST'
        ? { status: 204 }
        : { body: { ...ACTIVITY_BODY, status: 'Finished', endedAt: '2026-01-15T09:00:00Z' } },
    );

    const activity = await call(new HttpActivityGateway(harness.client));

    expect(activity.status.kind).toBe('finished');
    expect(harness.transport.sent.map((request) => request.method)).toEqual(['POST', 'GET']);
  });
});

describe('le téléversement d’une photo', () => {
  it('passe par le téléversement de la plateforme quand elle en a un', async () => {
    const uploads: { url: string; fieldName: string }[] = [];
    const harness = aHarness({
      uploader: {
        upload: (request) => {
          uploads.push({ url: request.url, fieldName: request.fieldName });
          return Promise.resolve({ status: 200, body: JSON.stringify(PROFILE_BODY) });
        },
      },
    });

    await new HttpUserGateway(harness.client).uploadAvatar({
      uri: 'file:///tmp/moi.jpg',
      name: 'moi.jpg',
      mimeType: 'image/jpeg',
    });

    // Sur React Native, un `FormData` autour d'une URI `file://` échoue avec
    // « Network request failed » — sans statut ni corps, indiscernable d'une
    // coupure réseau. C'est ce que voyait l'écran de profil.
    expect(uploads).toHaveLength(1);
    expect(uploads[0]?.url).toContain('/user/v1/me/avatar/file');
    expect(uploads[0]?.fieldName).toBe('file');
    expect(harness.transport.sent).toHaveLength(0);
  });

  it('part en multipart quand la plateforme n’a rien de mieux', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: PROFILE_BODY }));

    // Le chemin du navigateur : l'image est lue par `fetch`, puis postée comme
    // un `Blob`. Une `data:` URL en tient lieu ici.
    await new HttpUserGateway(harness.client).uploadAvatar({
      uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      name: 'moi.jpg',
      mimeType: 'image/jpeg',
    });

    const sent = harness.transport.sent[0];
    expect(sent?.method).toBe('POST');
    expect(sent?.url).toContain('/user/v1/me/avatar/file');
    // La frontière multipart est calculée par le runtime au moment de l'envoi :
    // l'écrire à la main produit un corps que le serveur ne sait pas découper.
    expect(sent?.headers['content-type']).toBeUndefined();
    expect(sent?.body).toBeInstanceOf(FormData);
  });
});
