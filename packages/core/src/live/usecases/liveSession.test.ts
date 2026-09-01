import { beforeEach, describe, expect, it } from 'vitest';
import { activityId } from '../../shared/identity/ids';
import { FixedClock } from '../../shared/time/clock';
import { FixedRandom } from '../../shared/random/random';
import { ManualScheduler } from '../../shared/time/scheduler';
import { EMPTY_STATS, FakeLiveStream } from '../../testing/fakes';
import { HEARTBEAT_TIMEOUT } from '../domain/backoff';
import type { LiveEvent, LiveMessage } from '../domain/liveEvent';
import { LiveSession } from './liveSession';

/**
 * §13 : « la reprise SSE : Last-Event-ID, doublons, instantané de repli ».
 */
const ACTIVITY = activityId('activity-1');

/** Avec un tirage figé à 0,5 et un recul initial d'une seconde. */
const FIRST_BACKOFF = 500;

/** Un analyseur minimal : ce que ferait `packages/api` à partir du JSON reçu. */
const parse = (message: LiveMessage): LiveEvent | undefined => {
  switch (message.event) {
    case 'position': {
      const data = message.data;
      if (typeof data !== 'object' || data === null || !('sequenceNumber' in data))
        return undefined;
      if (typeof data.sequenceNumber !== 'number') return undefined;
      return {
        kind: 'position',
        position: {
          sequenceNumber: data.sequenceNumber,
          position: { latitude: 48.85, longitude: 2.35 },
          elevationMetres: 30,
          recordedAt: 1_700_000_000_000 + data.sequenceNumber,
          heartRate: undefined,
        },
      };
    }
    case 'stats':
      return { kind: 'stats', stats: EMPTY_STATS };
    case 'status':
      return { kind: 'status', status: { kind: 'live', since: 1 } };
    case 'heartbeat':
      return { kind: 'heartbeat', at: 1 };
    default:
      return undefined;
  }
};

const position = (sequenceNumber: number, id?: string): LiveMessage => ({
  id,
  event: 'position',
  data: { sequenceNumber },
});

describe('LiveSession', () => {
  let stream: FakeLiveStream;
  let scheduler: ManualScheduler;
  let session: LiveSession;

  beforeEach(() => {
    stream = new FakeLiveStream();
    scheduler = new ManualScheduler();
    session = new LiveSession(ACTIVITY, parse, {
      stream,
      scheduler,
      clock: new FixedClock(0),
      random: new FixedRandom(0.5),
    });
    session.open();
  });

  it('dessine l’instantané d’un coup : status, stats puis les positions', () => {
    stream.deliver({ event: 'status', data: {} });
    stream.deliver({ event: 'stats', data: {} });
    stream.deliver(position(0));
    stream.deliver(position(1));

    const snapshot = session.snapshot();
    expect(snapshot.status?.kind).toBe('live');
    expect(snapshot.stats).toEqual(EMPTY_STATS);
    expect(snapshot.positions).toHaveLength(2);
  });

  it('ignore un doublon : le serveur préfère un doublon à un trou, et nous aussi', () => {
    stream.deliver(position(4));
    stream.deliver(position(4));

    expect(session.snapshot().positions).toHaveLength(1);
  });

  it('remet un rejeu désordonné dans l’ordre des séquences', () => {
    stream.deliver(position(3));
    stream.deliver(position(1));
    stream.deliver(position(2));

    expect(session.snapshot().positions.map((p) => p.sequenceNumber)).toEqual([1, 2, 3]);
  });

  it('renvoie le dernier id reçu en Last-Event-ID à la reconnexion', () => {
    stream.deliver(position(0, 'evt-7'));
    stream.fail(new Error('connexion perdue'));
    // Recul de la première tentative : 0,5 × 1 s avec un tirage figé à 0,5.
    scheduler.advanceBy(FIRST_BACKOFF);

    expect(stream.openCount).toBe(2);
    expect(stream.lastEventIds).toEqual([undefined, 'evt-7']);
  });

  it('avance l’id même sur un événement qu’il ne comprend pas', () => {
    // Sans ça, une reprise repartirait d'un id plus ancien et le serveur
    // rejouerait tout ce qui se trouve entre les deux.
    stream.deliver({ id: 'evt-9', event: 'inconnu', data: {} });
    stream.fail(new Error('coupure'));
    scheduler.advanceBy(FIRST_BACKOFF);

    expect(stream.lastEventIds[1]).toBe('evt-9');
  });

  it('reconnecte sur le silence, pas sur une erreur explicite', () => {
    // §7 : l'absence de heartbeat pendant 45 s est le signal. Une connexion
    // morte ne signale rien du tout.
    expect(stream.openCount).toBe(1);

    scheduler.advanceBy(HEARTBEAT_TIMEOUT + 1);
    scheduler.advanceBy(FIRST_BACKOFF);

    expect(stream.openCount).toBe(2);
  });

  it('réarme le chien de garde à chaque heartbeat', () => {
    for (let index = 0; index < 5; index += 1) {
      scheduler.advanceBy(HEARTBEAT_TIMEOUT - 1_000);
      stream.deliver({ event: 'heartbeat', data: {} });
    }
    scheduler.advanceBy(1_000);

    expect(stream.openCount).toBe(1);
  });

  it('un heartbeat ne modifie rien d’affichable', () => {
    session.snapshot();
    stream.deliver({ event: 'heartbeat', data: {} });

    expect(session.hasChanged).toBe(false);
  });

  it('espace les reconnexions successives', () => {
    stream.fail(new Error('coupure'));
    // La deuxième tentative attend deux fois plus longtemps que la première :
    // avancer du seul premier recul ne suffit pas à la déclencher.
    scheduler.advanceBy(FIRST_BACKOFF);
    expect(stream.openCount).toBe(2);

    stream.fail(new Error('coupure'));
    scheduler.advanceBy(FIRST_BACKOFF);
    expect(stream.openCount).toBe(2);

    scheduler.advanceBy(FIRST_BACKOFF);
    expect(stream.openCount).toBe(3);
  });

  it('remet le compteur de tentatives à zéro dès qu’un message arrive', () => {
    stream.fail(new Error('coupure'));
    scheduler.advanceBy(FIRST_BACKOFF);
    expect(session.snapshot().reconnectAttempts).toBe(1);

    stream.deliver(position(0));

    expect(session.snapshot().reconnectAttempts).toBe(0);
    expect(session.snapshot().connected).toBe(true);
  });

  it('ne rend que la queue des positions au-delà d’une séquence', () => {
    // C'est ce que consomme la carte : elle dessine en impératif et ne veut que
    // ce qu'elle n'a pas encore tracé.
    stream.deliver(position(0));
    stream.deliver(position(1));
    stream.deliver(position(2));

    expect(session.positionsAfter(0).map((p) => p.sequenceNumber)).toEqual([1, 2]);
  });

  it('prévient son auditeur sans qu’il ait à interroger', () => {
    const seen: number[] = [];
    session.onChange((snapshot) => {
      seen.push(snapshot.positions.length);
    });

    stream.deliver(position(0));
    stream.deliver(position(1));

    expect(seen).toEqual([1, 2]);
  });

  it('marque le changement pour que l’écran puisse sauter un rendu', () => {
    expect(session.hasChanged).toBe(false);
    stream.deliver(position(0));
    expect(session.hasChanged).toBe(true);

    session.snapshot();

    expect(session.hasChanged).toBe(false);
  });

  it('se ferme sans laisser de minuterie derrière lui', () => {
    session.close();

    expect(stream.closed).toBeGreaterThan(0);
    expect(scheduler.scheduledCount).toBe(0);
    expect(session.snapshot().connected).toBe(false);
  });

  it('cesse de reconnecter quand la course est finie : il n’y a plus rien à suivre', () => {
    // Le serveur d'une course terminée rend l'état final puis raccroche. Sans
    // cette garde, chaque raccrochage relance une connexion qui recevra la même
    // chose, indéfiniment.
    const terminal = (message: LiveMessage): LiveEvent | undefined =>
      message.event === 'status'
        ? { kind: 'status', status: { kind: 'finished', since: 2 } }
        : parse(message);
    // Ses propres doublures : le chien de garde de la session du `beforeEach`
    // rouvrirait le flux partagé et ferait mentir le compte.
    const ownStream = new FakeLiveStream();
    const ownScheduler = new ManualScheduler();
    const finished = new LiveSession(ACTIVITY, terminal, {
      stream: ownStream,
      scheduler: ownScheduler,
      clock: new FixedClock(0),
      random: new FixedRandom(0.5),
    });
    finished.open();

    ownStream.deliver({ event: 'status', data: {} });
    ownStream.fail(new Error('le serveur a raccroché'));

    ownScheduler.advanceBy(60_000);
    expect(ownStream.openCount).toBe(1);

    const snapshot = finished.snapshot();
    expect(snapshot.ended).toBe(true);
    expect(snapshot.connected).toBe(false);
  });

  it('reconnecte tant que la course tourne encore', () => {
    const openedBefore = stream.openCount;

    stream.deliver({ event: 'status', data: {} });
    stream.fail(new Error('réseau coupé'));
    scheduler.advanceBy(FIRST_BACKOFF);

    expect(stream.openCount).toBe(openedBefore + 1);
    expect(session.snapshot().ended).toBe(false);
  });
});
