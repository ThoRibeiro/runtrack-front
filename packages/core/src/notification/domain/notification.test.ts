import { describe, expect, it } from 'vitest';
import { activityId, notificationId, userId } from '../../shared/identity/ids';
import { NOTIFICATION_TYPES, destinationOf, unreadCount, type Notification } from './notification';
import { covers, localMinutes, quietHours, shouldNotify } from './quietHours';
import { DEVICE_PLATFORMS } from '../ports/pushRegistry';
import { FOLLOW_STATUSES } from '../../social/ports/socialGateway';

const notification = (overrides: Partial<Notification>): Notification => ({
  id: notificationId('n1'),
  type: 'NEW_FOLLOWER',
  createdAt: 1_700_000_000_000,
  readAt: undefined,
  actorId: userId('u2'),
  activityId: activityId('a1'),
  ...overrides,
});

describe('liens profonds', () => {
  it('ouvre le suivi en direct quand un ami démarre', () => {
    expect(destinationOf(notification({ type: 'FRIEND_STARTED_ACTIVITY' }))).toEqual({
      route: 'activity-live',
      activityId: 'a1',
    });
  });

  it('ouvre la course pour une fin, un like ou un commentaire', () => {
    for (const type of [
      'FRIEND_FINISHED_ACTIVITY',
      'ACTIVITY_LIKED',
      'ACTIVITY_COMMENTED',
    ] as const) {
      expect(destinationOf(notification({ type }))).toEqual({
        route: 'activity',
        activityId: 'a1',
      });
    }
  });

  it('ouvre le profil pour un nouvel abonné ou une demande acceptée', () => {
    for (const type of ['NEW_FOLLOWER', 'FOLLOW_ACCEPTED'] as const) {
      expect(destinationOf(notification({ type }))).toEqual({ route: 'user', userId: 'u2' });
    }
  });

  it('ouvre la boîte de demandes pour une demande d’abonnement', () => {
    expect(destinationOf(notification({ type: 'FOLLOW_REQUEST' }))).toEqual({
      route: 'follow-requests',
    });
  });

  it('ne mène nulle part quand la cible manque, plutôt que vers un écran vide', () => {
    expect(
      destinationOf(notification({ type: 'ACTIVITY_LIKED', activityId: undefined })),
    ).toBeUndefined();
    expect(
      destinationOf(notification({ type: 'NEW_FOLLOWER', actorId: undefined })),
    ).toBeUndefined();
  });

  it('sait quoi faire de chaque type connu', () => {
    // Le jour où le serveur en ajoute un, ce test le signale.
    const handled = NOTIFICATION_TYPES.filter(
      (type) => destinationOf(notification({ type })) !== undefined,
    );
    expect(handled).toHaveLength(NOTIFICATION_TYPES.length);
  });
});

describe('compteur de non-lues', () => {
  it('ne compte que celles qui n’ont pas été lues', () => {
    expect(unreadCount([notification({}), notification({ readAt: 1 }), notification({})])).toBe(2);
  });
});

describe('heures calmes', () => {
  const paris = 'Europe/Paris';

  it('couvre une plage qui traverse minuit', () => {
    const night = quietHours(22 * 60, 7 * 60, paris);
    // 2026-01-15, 23 h 30 à Paris (UTC+1).
    expect(covers(night, Date.UTC(2026, 0, 15, 22, 30))).toBe(true);
    // 8 h du matin : la plage est finie.
    expect(covers(night, Date.UTC(2026, 0, 15, 7, 0))).toBe(false);
  });

  it('couvre une plage qui ne traverse pas minuit', () => {
    const siesta = quietHours(13 * 60, 15 * 60, paris);
    expect(covers(siesta, Date.UTC(2026, 0, 15, 13, 0))).toBe(true);
    expect(covers(siesta, Date.UTC(2026, 0, 15, 15, 0))).toBe(false);
  });

  it('dépend du fuseau du destinataire, pas de celui du serveur', () => {
    // « Pas avant 7 h » n'a de sens que là où la personne se trouve.
    const night = quietHours(22 * 60, 7 * 60, 'Pacific/Noumea');
    const parisNight = quietHours(22 * 60, 7 * 60, paris);
    const moment = Date.UTC(2026, 0, 15, 22, 30);

    expect(covers(parisNight, moment)).toBe(true);
    expect(covers(night, moment)).toBe(false);
  });

  it('lit l’heure locale dans le fuseau demandé', () => {
    expect(localMinutes(Date.UTC(2026, 0, 15, 12, 0), paris)).toBe(13 * 60);
  });

  it('refuse une plage de durée nulle, qui s’écrirait comme une plage de 24 h', () => {
    expect(() => quietHours(60, 60, paris)).toThrow(RangeError);
  });

  it('refuse une heure hors des bornes de la journée', () => {
    expect(() => quietHours(-1, 60, paris)).toThrow(RangeError);
    expect(() => quietHours(0, 24 * 60, paris)).toThrow(RangeError);
  });

  it('refuse un fuseau inconnu plutôt que de replier sur UTC en silence', () => {
    expect(() => localMinutes(0, 'Mars/Olympus_Mons')).toThrow();
  });
});

describe('faut-il notifier', () => {
  const paris = 'Europe/Paris';

  it('ne notifie pas une nature coupée', () => {
    expect(
      shouldNotify({ mutedTypes: ['ACTIVITY_LIKED'], quietHours: undefined }, 'ACTIVITY_LIKED', 0),
    ).toBe(false);
  });

  it('notifie hors des heures calmes', () => {
    const preferences = { mutedTypes: [], quietHours: quietHours(22 * 60, 7 * 60, paris) };
    expect(shouldNotify(preferences, 'NEW_FOLLOWER', Date.UTC(2026, 0, 15, 11, 0))).toBe(true);
  });

  it('se tait pendant les heures calmes', () => {
    const preferences = { mutedTypes: [], quietHours: quietHours(22 * 60, 7 * 60, paris) };
    expect(shouldNotify(preferences, 'NEW_FOLLOWER', Date.UTC(2026, 0, 15, 23, 0))).toBe(false);
  });

  it('notifie toujours sans plage définie', () => {
    expect(shouldNotify({ mutedTypes: [], quietHours: undefined }, 'NEW_FOLLOWER', 0)).toBe(true);
  });
});

describe('catalogues', () => {
  it('énumère les plateformes de notification push', () => {
    expect([...DEVICE_PLATFORMS]).toEqual(['IOS', 'ANDROID']);
  });

  it('énumère les états d’abonnement', () => {
    expect([...FOLLOW_STATUSES]).toEqual(['NONE', 'PENDING', 'ACCEPTED']);
  });
});
