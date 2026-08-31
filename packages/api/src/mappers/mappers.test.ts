import { RunTrackError } from '@runtrack/core';
import { describe, expect, it } from 'vitest';
import { toActivity, toIngestionOutcome, toSplit, toStats, toStatus, toTrack } from './activity';
import { toFeedItem } from './feed';
import {
  narrow,
  narrowOrThrow,
  toInstant,
  toOptionalInstant,
  toOptionalString,
} from './primitives';
import { toMyProfile, toPhysiology, toPublicProfile, toRunnerTotals } from './user';

const STARTED = '2026-01-15T08:00:00Z';
const ENDED = '2026-01-15T09:04:22Z';

describe('primitives', () => {
  it('convertit un horodatage ISO en millisecondes', () => {
    expect(toInstant(STARTED)).toBe(Date.UTC(2026, 0, 15, 8, 0, 0));
  });

  it('refuse un horodatage illisible plutôt que de rendre NaN', () => {
    expect(() => toInstant('hier matin')).toThrow(RunTrackError);
  });

  it('laisse passer une absence', () => {
    expect(toOptionalInstant(undefined)).toBeUndefined();
    expect(toOptionalString(undefined)).toBeUndefined();
  });

  it('traite la chaîne vide comme une absence', () => {
    // springdoc envoie volontiers "" là où il veut dire « rien ».
    expect(toOptionalString('')).toBeUndefined();
  });

  it('replie une valeur hors catalogue sur la valeur de repli', () => {
    expect(narrow('BIKE', ['RUN', 'BIKE'] as const, 'RUN')).toBe('BIKE');
    expect(narrow('KAYAK', ['RUN', 'BIKE'] as const, 'RUN')).toBe('RUN');
    expect(narrow(undefined, ['RUN'] as const, 'RUN')).toBe('RUN');
  });

  it('refuse là où un repli serait un mensonge', () => {
    expect(() => narrowOrThrow('Zombie', ['Live'] as const, 'État')).toThrow(RunTrackError);
  });
});

describe('course', () => {
  const dto = {
    id: 'a1',
    ownerId: 'u1',
    type: 'TRAIL',
    title: 'Sortie du matin',
    description: '',
    visibility: 'FOLLOWERS',
    status: 'Finished',
    startedAt: STARTED,
    endedAt: ENDED,
    stats: { distanceMeters: 12_400, elapsedSeconds: 3_862, movingTimeSeconds: 3_700 },
  };

  it('transpose la course', () => {
    const activity = toActivity(dto);

    expect(activity.id).toBe('a1');
    expect(activity.type).toBe('TRAIL');
    expect(activity.visibility).toBe('FOLLOWERS');
    expect(activity.status).toEqual({ kind: 'finished', since: toInstant(ENDED) });
    expect(activity.description).toBeUndefined();
    expect(activity.stats.distanceMetres).toBe(12_400);
  });

  it('échoue fermé sur une visibilité inconnue', () => {
    // Montrer la course à tout le monde parce qu'on n'a pas compris la portée
    // serait la pire des sorties.
    expect(toActivity({ ...dto, visibility: 'GALAXY' }).visibility).toBe('PRIVATE');
  });

  it('replie un type inconnu sans casser l’écran', () => {
    expect(toActivity({ ...dto, type: 'KAYAK' }).type).toBe('RUN');
  });

  it('refuse un état de course inconnu, parce qu’il décide du comportement', () => {
    expect(() => toActivity({ ...dto, status: 'Hibernating' })).toThrow(RunTrackError);
  });

  it('date un état non terminal du départ, faute de « since » sur le fil', () => {
    // Le serveur n'envoie `endedAt` que pour les états terminaux.
    expect(toStatus('Live', 1_000, undefined)).toEqual({ kind: 'live', since: 1_000 });
    expect(toStatus('Paused', 1_000, undefined)).toEqual({ kind: 'paused', since: 1_000 });
    expect(toStatus('Discarded', 1_000, undefined)).toEqual({ kind: 'discarded', since: 1_000 });
  });

  it('rend des statistiques nulles plutôt qu’indéfinies quand elles manquent', () => {
    const stats = toStats(undefined);

    expect(stats.distanceMetres).toBe(0);
    expect(stats.averagePaceSecondsPerKm).toBeUndefined();
  });

  it('transpose un split et une trace', () => {
    expect(toSplit({ kilometerIndex: 3, distanceMeters: 1_000, complete: true })).toMatchObject({
      kilometreIndex: 3,
      distanceMetres: 1_000,
      complete: true,
    });
    expect(toTrack({ polyline: '_p~iF', pointCount: 2 })).toEqual({
      polyline: '_p~iF',
      pointCount: 2,
      pointsPurgedAt: undefined,
    });
  });
});

describe('réponse d’ingestion', () => {
  it('transpose ce que le §6 demande de lire', () => {
    const outcome = toIngestionOutcome({
      lastAcceptedSequence: 42,
      acceptedCount: 40,
      rejected: [{ sequenceNumber: 43, reason: 'ACCURACY_TOO_LOW' }],
    });

    expect(outcome.lastAcceptedSequence).toBe(42);
    expect(outcome.acceptedCount).toBe(40);
    expect(outcome.rejected).toEqual([{ sequenceNumber: 43, reason: 'ACCURACY_TOO_LOW' }]);
  });

  it('ne perd pas un rejet dont il ne connaît pas la raison', () => {
    // §6 : « n'ignore pas les rejets ». Un rejet inconnu reste un point qui
    // n'est pas passé.
    const outcome = toIngestionOutcome({
      lastAcceptedSequence: 1,
      rejected: [{ sequenceNumber: 2, reason: 'RAISON_INEDITE' }],
    });

    expect(outcome.rejected).toHaveLength(1);
  });

  it('rend un tampon intact quand rien n’a été accepté', () => {
    expect(toIngestionOutcome({}).lastAcceptedSequence).toBe(-1);
  });
});

describe('comptes', () => {
  it('transpose un profil public en échouant fermé', () => {
    expect(toPublicProfile({ id: 'u1', handle: 'thomas', accountScope: 'INCONNU' })).toMatchObject({
      handle: 'thomas',
      accountScope: 'PRIVATE',
    });
  });

  it('transpose son propre profil', () => {
    const me = toMyProfile({
      id: 'u1',
      handle: 'thomas',
      email: 'thomas@exemple.fr',
      status: 'ACTIVE',
      accountScope: 'PUBLIC',
      registeredAt: STARTED,
    });

    expect(me.email).toBe('thomas@exemple.fr');
    expect(me.status).toBe('ACTIVE');
    expect(me.registeredAt).toBe(toInstant(STARTED));
  });

  it('transpose la physiologie, orthographe du serveur comprise', () => {
    expect(toPhysiology({ heightCentimeters: 178, biologicalSex: 'MALE' })).toMatchObject({
      heightCentimetres: 178,
      biologicalSex: 'MALE',
    });
  });

  it('transpose le bilan et ses totaux par type', () => {
    const totals = toRunnerTotals({
      period: 'WEEK',
      since: STARTED,
      distanceMeters: 27_200,
      byType: [{ type: 'RUN', activityCount: 3, distanceMeters: 27_200 }],
    });

    expect(totals.period).toBe('WEEK');
    expect(totals.distanceMetres).toBe(27_200);
    expect(totals.byType[0]?.type).toBe('RUN');
  });
});

describe('fil', () => {
  it('transpose une carte de fil, sans trace ni statistiques', () => {
    // Le serveur n'en envoie pas : le fil éclate à la lecture, et charger une
    // polyline par carte rendrait le premier écran inutilisable.
    const item = toFeedItem({
      activityId: 'a1',
      author: { id: 'u1', handle: 'thomas', displayName: 'Thomas' },
      type: 'RUN',
      title: 'Sortie',
      status: 'Live',
      distanceMeters: 5_200,
      movingTimeSeconds: 1_500,
      startedAt: STARTED,
      likeCount: 3,
      commentCount: 1,
    });

    expect(item.author.displayName).toBe('Thomas');
    expect(item.status.kind).toBe('live');
    expect(item.endedAt).toBeUndefined();
    expect(item.likeCount).toBe(3);
  });

  it('refuse une carte sans auteur, qui ne mènerait nulle part', () => {
    // `?? ''` ferait semblant d'avoir une valeur de repli puis échouerait plus
    // loin, avec un message qui ne dit pas quelle réponse était incomplète.
    expect(() =>
      toFeedItem({ activityId: 'a1', status: 'Finished', startedAt: STARTED, endedAt: ENDED }),
    ).toThrow(RunTrackError);
  });

  it('refuse une carte sans identifiant de course', () => {
    expect(() =>
      toFeedItem({
        author: { id: 'u1' },
        status: 'Live',
        startedAt: STARTED,
      }),
    ).toThrow(RunTrackError);
  });
});

/**
 * springdoc marque presque tout comme facultatif : le client doit survivre à
 * une réponse partielle sans afficher « undefined » ni tomber. Ces cas-là
 * couvrent les valeurs de repli une par une.
 */
describe('réponses minimales', () => {
  it('transpose une course réduite à ce qui est indispensable', () => {
    const activity = toActivity({ id: 'a1', ownerId: 'u1', status: 'Live' });

    expect(activity.title).toBe('');
    expect(activity.type).toBe('RUN');
    expect(activity.visibility).toBe('PRIVATE');
    expect(activity.startedAt).toBe(0);
    expect(activity.stats.distanceMetres).toBe(0);
    expect(activity.status).toEqual({ kind: 'live', since: 0 });
  });

  it('transpose des statistiques partielles', () => {
    expect(toStats({})).toEqual({
      distanceMetres: 0,
      elapsedSeconds: 0,
      movingTimeSeconds: 0,
      averagePaceSecondsPerKm: undefined,
      currentPaceSecondsPerKm: undefined,
      elevationGain: 0,
      elevationLoss: 0,
      averageHeartRate: undefined,
      maxHeartRate: undefined,
    });
  });

  it('transpose un split et une trace réduits', () => {
    expect(toSplit({})).toEqual({
      kilometreIndex: 0,
      distanceMetres: 0,
      timeSeconds: 0,
      paceSecondsPerKm: 0,
      elevationGain: 0,
      averageHeartRate: undefined,
      complete: false,
    });
    expect(toTrack({})).toEqual({ polyline: '', pointCount: 0, pointsPurgedAt: undefined });
  });

  it('transpose un rejet sans numéro de séquence', () => {
    expect(toIngestionOutcome({ rejected: [{}] }).rejected[0]?.sequenceNumber).toBe(-1);
  });

  it('transpose un profil réduit à son identifiant', () => {
    const profile = toPublicProfile({ id: 'u1' });

    expect(profile.handle).toBe('');
    expect(profile.displayName).toBe('');
    expect(profile.bio).toBeUndefined();
    expect(profile.accountScope).toBe('PRIVATE');
  });

  it('transpose son propre profil réduit', () => {
    const me = toMyProfile({ id: 'u1' });

    expect(me.email).toBe('');
    expect(me.status).toBe('ACTIVE');
    expect(me.registeredAt).toBe(0);
  });

  it('transpose une physiologie vide', () => {
    expect(toPhysiology({})).toEqual({
      birthDate: undefined,
      biologicalSex: 'UNSPECIFIED',
      weightKilograms: undefined,
      heightCentimetres: undefined,
    });
  });

  it('transpose un bilan vide', () => {
    const totals = toRunnerTotals({});

    expect(totals.period).toBe('MONTH');
    expect(totals.since).toBeUndefined();
    expect(totals.activityCount).toBe(0);
    expect(totals.byType).toEqual([]);
  });

  it('transpose un total par type réduit', () => {
    const totals = toRunnerTotals({ byType: [{}] });

    expect(totals.byType[0]).toEqual({
      type: 'RUN',
      activityCount: 0,
      distanceMetres: 0,
      movingTimeSeconds: 0,
    });
  });

  it('transpose une carte de fil réduite', () => {
    const item = toFeedItem({
      activityId: 'a1',
      author: { id: 'u1' },
      status: 'Finished',
      endedAt: ENDED,
    });

    expect(item.title).toBe('');
    expect(item.startedAt).toBe(0);
    expect(item.likeCount).toBe(0);
    expect(item.commentCount).toBe(0);
    expect(item.author.handle).toBe('');
  });
});
