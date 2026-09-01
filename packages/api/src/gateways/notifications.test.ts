import { describe, expect, it } from 'vitest';
import { deviceToken, notificationId, quietHours } from '@runtrack/core';
import { aHarness } from '../testing/harness';
import { bodyOf } from '../testing/expect';
import { HttpDeviceGateway } from './httpDeviceGateway';
import { HttpNotificationGateway } from './httpNotificationGateway';
import { toLocalTime, toMinutes, toNotification, toPreferences } from '../mappers/notification';

const PARIS = 'Europe/Paris';

describe('la traduction des notifications', () => {
  it('lit une notification complète', () => {
    const notification = toNotification({
      id: 'n1',
      type: 'ACTIVITY_LIKED',
      actorId: 'u-9',
      deepLink: '/activities/a1',
      createdAt: '2026-01-01T10:00:00Z',
      readAt: '2026-01-01T11:00:00Z',
      unread: false,
      aggregateCount: 5,
    });

    expect(notification).toEqual({
      id: notificationId('n1'),
      type: 'ACTIVITY_LIKED',
      actorId: 'u-9',
      deepLink: '/activities/a1',
      createdAt: Date.parse('2026-01-01T10:00:00Z'),
      readAt: Date.parse('2026-01-01T11:00:00Z'),
      unread: false,
      aggregateCount: 5,
    });
  });

  it('compte une notification sans agrégat comme un fait, pas zéro', () => {
    const notification = toNotification({
      id: 'n1',
      type: 'NEW_FOLLOWER',
      createdAt: '2026-01-01T10:00:00Z',
      unread: true,
    });

    expect(notification.aggregateCount).toBe(1);
    expect(notification.actorId).toBeUndefined();
    expect(notification.readAt).toBeUndefined();
  });

  it('affiche quand même une nature que ce build ne connaît pas', () => {
    // Un serveur plus récent en ajoute une : la faire tomber priverait la boîte
    // de tout le reste, alors que son lien profond reste utilisable.
    const notification = toNotification({
      id: 'n1',
      type: 'SOMETHING_NEW',
      deepLink: '/activities/a1',
      createdAt: '2026-01-01T10:00:00Z',
      unread: true,
    });

    expect(notification.deepLink).toBe('/activities/a1');
  });
});

describe('les heures calmes sur le fil', () => {
  it('traduit une heure locale en minutes et retour', () => {
    expect(toMinutes('22:00:00')).toBe(22 * 60);
    expect(toMinutes('07:30')).toBe(7 * 60 + 30);
    expect(toLocalTime(22 * 60)).toBe('22:00:00');
    expect(toLocalTime(7 * 60 + 5)).toBe('07:05:00');
  });

  it('refuse une heure illisible plutôt que d’inventer minuit', () => {
    expect(() => toMinutes('bientôt')).toThrow(RangeError);
  });

  it('lit des préférences, plage comprise', () => {
    const preferences = toPreferences({
      muted: ['ACTIVITY_LIKED'],
      available: ['ACTIVITY_LIKED', 'NEW_FOLLOWER'],
      quietHours: { from: '22:00:00', to: '07:00:00', zone: PARIS },
    });

    expect(preferences.mutedTypes).toEqual(['ACTIVITY_LIKED']);
    expect(preferences.availableTypes).toEqual(['ACTIVITY_LIKED', 'NEW_FOLLOWER']);
    expect(preferences.quietHours).toEqual({
      fromMinutes: 22 * 60,
      toMinutes: 7 * 60,
      zone: PARIS,
    });
  });

  it('rend « aucune plage » quand le serveur n’en envoie pas', () => {
    expect(toPreferences({ muted: [] }).quietHours).toBeUndefined();
  });

  it('retombe sur les natures connues du client quand le serveur n’en liste aucune', () => {
    expect(toPreferences({}).availableTypes.length).toBeGreaterThan(0);
  });
});

describe('HttpNotificationGateway', () => {
  it('lit la boîte, curseur compris', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        items: [
          { id: 'n1', type: 'NEW_FOLLOWER', createdAt: '2026-01-01T10:00:00Z', unread: true },
        ],
        nextCursor: '2026-01-01T09:00:00Z',
      },
    }));

    const page = await new HttpNotificationGateway(harness.client).inbox({ limit: 20 });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe('2026-01-01T09:00:00Z');
    expect(harness.transport.sent[0]?.url).toContain('/notification/v1?limit=20');
  });

  it('compte les non lues', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { unread: 7 } }));

    expect(await new HttpNotificationGateway(harness.client).unreadCount()).toBe(7);
  });

  it('compte zéro quand le serveur ne dit rien', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: {} }));

    expect(await new HttpNotificationGateway(harness.client).unreadCount()).toBe(0);
  });

  it('marque une notification lue', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 204 }));

    await new HttpNotificationGateway(harness.client).markRead(notificationId('n1'));

    expect(harness.transport.sent[0]?.method).toBe('POST');
    expect(harness.transport.sent[0]?.url).toContain('/notification/v1/n1/read');
  });

  it('marque tout lu et dit combien', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { marked: 12 } }));

    expect(await new HttpNotificationGateway(harness.client).markAllRead()).toBe(12);
  });

  it('remplace la liste entière des natures coupées, comme le serveur l’attend', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { muted: ['ACTIVITY_LIKED'], available: [] } }));

    await new HttpNotificationGateway(harness.client).updatePreferences({
      mutedTypes: ['ACTIVITY_LIKED'],
      quietHours: quietHours(22 * 60, 7 * 60, PARIS),
      availableTypes: [],
    });

    const sent = harness.transport.sent[0];
    expect(sent?.method).toBe('PATCH');
    expect(bodyOf(sent?.body)).toEqual({
      muted: ['ACTIVITY_LIKED'],
      quietHours: { from: '22:00:00', to: '07:00:00', zone: PARIS },
    });
  });

  it('envoie « null » pour supprimer les heures calmes, jamais rien du tout', async () => {
    // Omettre le champ laisserait l'ancienne plage en place : un coureur qui
    // les désactive resterait silencieux.
    const harness = aHarness();
    harness.transport.answerWith(() => ({ body: { muted: [] } }));

    await new HttpNotificationGateway(harness.client).updatePreferences({
      mutedTypes: [],
      quietHours: undefined,
      availableTypes: [],
    });

    expect(bodyOf(harness.transport.sent[0]?.body)['quietHours']).toBeNull();
  });
});

describe('HttpDeviceGateway', () => {
  it('enregistre un appareil', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 204 }));

    await new HttpDeviceGateway(harness.client).register(deviceToken('tok-1'), 'IOS');

    expect(bodyOf(harness.transport.sent[0]?.body)).toEqual({ token: 'tok-1', platform: 'IOS' });
  });

  it('liste les appareils enregistrés', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({
      body: {
        items: [{ token: 'tok-1', platform: 'ANDROID', registeredAt: '2026-01-01T10:00:00Z' }],
      },
    }));

    const devices = await new HttpDeviceGateway(harness.client).list();

    expect(devices).toEqual([
      { token: 'tok-1', platform: 'ANDROID', registeredAt: Date.parse('2026-01-01T10:00:00Z') },
    ]);
  });

  it('retire un appareil, jeton échappé', async () => {
    const harness = aHarness();
    harness.transport.answerWith(() => ({ status: 204 }));

    await new HttpDeviceGateway(harness.client).remove(deviceToken('tok/1+2'));

    expect(harness.transport.sent[0]?.method).toBe('DELETE');
    expect(harness.transport.sent[0]?.url).toContain('tok%2F1%2B2');
  });
});
