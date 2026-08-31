import { activityId, userId } from '@runtrack/core';
import { describe, expect, it } from 'vitest';
import { aHarness } from '../testing/harness';
import { bodyOf } from '../testing/expect';
import { HttpActivityGateway } from './httpActivityGateway';
import { HttpAuthGateway } from './httpAuthGateway';
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
    name: 'suppression de compte',
    call: (h) => new HttpUserGateway(h.client).deleteAccount(),
    method: 'DELETE',
    path: '/user/v1/me',
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
