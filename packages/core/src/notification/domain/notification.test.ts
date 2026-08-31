import { describe, expect, it } from 'vitest';
import { notificationId, userId } from '../../shared/identity/ids';
import { destinationOf, parseDeepLink, unreadCount, type Notification } from './notification';
import { covers, localMinutes, quietHours, shouldNotify } from './quietHours';
import { DEVICE_PLATFORMS } from '../ports/pushRegistry';
import { FOLLOW_STATUSES } from '../../social/ports/socialGateway';

const notification = (overrides: Partial<Notification>): Notification => ({
  id: notificationId('n1'),
  type: 'NEW_FOLLOWER',
  createdAt: 1_700_000_000_000,
  readAt: undefined,
  unread: true,
  actorId: userId('u2'),
  deepLink: '/users/u2',
  aggregateCount: 1,
  ...overrides,
});

describe('liens profonds', () => {
  it('ouvre le suivi en direct', () => {
    expect(parseDeepLink('/activities/a1/live')).toEqual({
      route: 'activity-live',
      activityId: 'a1',
    });
  });

  it('ouvre la course', () => {
    expect(parseDeepLink('/activities/a1')).toEqual({ route: 'activity', activityId: 'a1' });
  });

  it('ouvre le fil de commentaires, à l’ancre du commentaire', () => {
    expect(parseDeepLink('/activities/a1/comments#c9')).toEqual({
      route: 'activity-comments',
      activityId: 'a1',
      commentId: 'c9',
    });
  });

  it('ouvre le fil de commentaires sans ancre', () => {
    expect(parseDeepLink('/activities/a1/comments')).toEqual({
      route: 'activity-comments',
      activityId: 'a1',
      commentId: undefined,
    });
  });

  it('ouvre un profil', () => {
    expect(parseDeepLink('/users/u2')).toEqual({ route: 'user', userId: 'u2' });
  });

  it('ouvre la boîte de demandes d’abonnement', () => {
    expect(parseDeepLink('/me/follow-requests')).toEqual({ route: 'follow-requests' });
  });

  it('n’ouvre rien sur un chemin que cette version ne connaît pas', () => {
    // Un serveur plus récent peut envoyer une destination inédite : ouvrir le
    // mauvais écran serait pire que de n’en ouvrir aucun.
    expect(parseDeepLink('/badges/42')).toBeUndefined();
    expect(parseDeepLink('')).toBeUndefined();
  });

  it('lit la destination portée par la notification, sans la redériver', () => {
    // Le serveur fabrique le chemin ; en recalculer une seconde version côté
    // client ferait deux vérités qui divergent au premier changement.
    expect(destinationOf(notification({ deepLink: '/activities/a7/live' }))).toEqual({
      route: 'activity-live',
      activityId: 'a7',
    });
  });
});

describe('compteur de non-lues', () => {
  it('ne compte que celles qui n’ont pas été lues', () => {
    expect(
      unreadCount([notification({}), notification({ readAt: 1, unread: false }), notification({})]),
    ).toBe(2);
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
