import { describe, expect, it } from 'vitest';
import {
  activityId,
  commentId,
  deviceToken,
  notificationId,
  shareLinkId,
  userId,
} from './identity/ids';
import { isLastPage, mergePages } from './paging/page';
import { ERROR_CODES, isKnownErrorCode } from './errors/errorCode';
import { RunTrackError, endsSession, isRunTrackError } from './errors/runtrackError';
import { FixedRandom } from './random/random';
import { secondsBetween, splitSeconds } from './time/duration';
import { ManualScheduler } from './time/scheduler';

describe('identifiants', () => {
  it('accepte une chaîne non vide, quel que soit le type', () => {
    expect(activityId('a1')).toBe('a1');
    expect(userId('u1')).toBe('u1');
    expect(commentId('c1')).toBe('c1');
    expect(notificationId('n1')).toBe('n1');
    expect(shareLinkId('s1')).toBe('s1');
    expect(deviceToken('d1')).toBe('d1');
  });

  it('refuse une chaîne vide plutôt que de porter un identifiant creux', () => {
    expect(() => activityId('')).toThrow(TypeError);
    expect(() => userId('')).toThrow(TypeError);
  });
});

describe('pagination par curseur', () => {
  it('reconnaît la dernière page à l’absence de curseur', () => {
    expect(isLastPage({ items: [] })).toBe(true);
    expect(isLastPage({ items: [], nextCursor: 'c2' })).toBe(false);
  });

  it('assemble les pages en gardant le dernier curseur', () => {
    const merged = mergePages([
      { items: [1, 2], nextCursor: 'c2' },
      { items: [3], nextCursor: 'c3' },
    ]);

    expect(merged).toEqual({ items: [1, 2, 3], nextCursor: 'c3' });
  });

  it('n’invente pas de curseur quand la dernière page n’en a plus', () => {
    expect(mergePages([{ items: [1], nextCursor: 'c2' }, { items: [2] }])).toEqual({
      items: [1, 2],
    });
  });

  it('assemble une liste vide de pages', () => {
    expect(mergePages<number>([])).toEqual({ items: [] });
  });
});

describe('codes d’erreur', () => {
  it('reconnaît un code du catalogue', () => {
    expect(isKnownErrorCode('IDEMPOTENCY_KEY_REUSED')).toBe(true);
  });

  it('rejette un code inconnu', () => {
    expect(isKnownErrorCode('PAS_UN_CODE')).toBe(false);
  });

  it('ne contient aucun doublon', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });
});

describe('RunTrackError', () => {
  it('porte le code métier, pas le statut', () => {
    const error = new RunTrackError({
      code: 'ACTIVITY_NOT_YOURS',
      message: 'Cette course ne vous appartient pas',
      correlationId: 'abc-123',
      status: 409,
    });

    expect(error.code).toBe('ACTIVITY_NOT_YOURS');
    expect(error.correlationId).toBe('abc-123');
    expect(isRunTrackError(error)).toBe(true);
  });

  it('replie un code inconnu sur UNKNOWN plutôt que de le laisser passer', () => {
    const error = new RunTrackError({ code: 'CODE_DU_FUTUR', message: 'inattendu' });

    expect(error.code).toBe('UNKNOWN');
  });

  it('n’est pas confondu avec une erreur quelconque', () => {
    expect(isRunTrackError(new Error('quelconque'))).toBe(false);
  });

  it('reconnaît ce qui met fin à la session', () => {
    const reused = new RunTrackError({ code: 'REFRESH_TOKEN_REUSED', message: '' });
    const notFound = new RunTrackError({ code: 'ACTIVITY_NOT_FOUND', message: '' });

    expect(endsSession(reused)).toBe(true);
    expect(endsSession(notFound)).toBe(false);
  });
});

describe('FixedRandom', () => {
  it('rend toujours la même valeur', () => {
    expect(new FixedRandom(0.25).next()).toBe(0.25);
  });

  it('refuse une valeur hors de [0, 1)', () => {
    expect(() => new FixedRandom(1)).toThrow(RangeError);
    expect(() => new FixedRandom(-0.1)).toThrow(RangeError);
  });
});

describe('durées', () => {
  it('compte les secondes entre deux instants', () => {
    expect(secondsBetween(1_000, 4_500)).toBe(3.5);
  });

  it('découpe une durée en heures, minutes et secondes', () => {
    expect(splitSeconds(3_725.9)).toEqual({ hours: 1, minutes: 2, seconds: 5 });
  });

  it('refuse une durée négative ou infinie plutôt que d’afficher un nombre faux', () => {
    expect(() => splitSeconds(-1)).toThrow(RangeError);
    expect(() => splitSeconds(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('ManualScheduler', () => {
  it('exécute ce qui est dû, dans l’ordre', () => {
    const scheduler = new ManualScheduler();
    const order: string[] = [];

    scheduler.after(200, () => order.push('deuxième'));
    scheduler.after(100, () => order.push('premier'));
    scheduler.advanceBy(250);

    expect(order).toEqual(['premier', 'deuxième']);
  });

  it('n’exécute rien avant l’échéance', () => {
    const scheduler = new ManualScheduler();
    let ran = false;

    scheduler.after(100, () => {
      ran = true;
    });
    scheduler.advanceBy(99);

    expect(ran).toBe(false);
  });

  it('répète une tâche périodique', () => {
    const scheduler = new ManualScheduler();
    let ticks = 0;

    scheduler.every(10, () => {
      ticks += 1;
    });
    scheduler.advanceBy(35);

    expect(ticks).toBe(3);
    expect(scheduler.scheduledCount).toBe(1);
  });

  it('annule une tâche', () => {
    const scheduler = new ManualScheduler();
    let ran = false;

    const cancel = scheduler.after(10, () => {
      ran = true;
    });
    cancel();
    scheduler.advanceBy(100);

    expect(ran).toBe(false);
    expect(scheduler.scheduledCount).toBe(0);
  });
});
