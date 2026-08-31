import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../shared/time/clock';
import {
  FakeActivityGateway,
  FakeLocationTracker,
  InMemoryPointBuffer,
  aFix,
  EMPTY_STATS,
} from '../../testing/fakes';
import { MAXIMUM_POINTS_PER_BATCH } from '../domain/batching';
import { Recorder } from './recorder';

/**
 * §13 nomme le tampon de points comme la première chose à tester, « parce que ça
 * casse en silence » : kill de l'app, reprise, rejeu, purge après accusé.
 */
describe('Recorder', () => {
  let gateway: FakeActivityGateway;
  let buffer: InMemoryPointBuffer;
  let tracker: FakeLocationTracker;
  let clock: FixedClock;
  let recorder: Recorder;

  beforeEach(() => {
    gateway = new FakeActivityGateway();
    buffer = new InMemoryPointBuffer();
    tracker = new FakeLocationTracker();
    clock = new FixedClock(1_700_000_000_000);
    recorder = new Recorder({ gateway, buffer, tracker, clock });
  });

  describe('démarrage', () => {
    it('démarre et lance le suivi GPS', async () => {
      const outcome = await recorder.start({
        type: 'RUN',
        title: 'Sortie du matin',
        visibility: 'FOLLOWERS',
      });

      expect(outcome.kind).toBe('started');
      expect(tracker.started).toBe(true);
    });

    it('refuse de démarrer sans la permission « toujours »', async () => {
      tracker = new FakeLocationTracker('denied');
      recorder = new Recorder({ gateway, buffer, tracker, clock });

      const outcome = await recorder.start({
        type: 'RUN',
        title: 'Sortie',
        visibility: 'PRIVATE',
      });

      expect(outcome.kind).toBe('permission-refused');
      expect(tracker.started).toBe(false);
    });

    it('abandonne la course quand l’horloge du téléphone dérive trop', async () => {
      // Le serveur date la course de son côté : vingt minutes d'écart, au-delà
      // des quinze tolérées. Le découvrir après dix kilomètres serait trop tard.
      clock = new FixedClock(1_700_000_000_000 - 20 * 60_000);
      recorder = new Recorder({ gateway, buffer, tracker, clock });

      const outcome = await recorder.start({
        type: 'RUN',
        title: 'Sortie',
        visibility: 'PRIVATE',
      });

      expect(outcome.kind).toBe('clock-unusable');
      expect(gateway.activity.status.kind).toBe('discarded');
      expect(tracker.started).toBe(false);
    });

    it('mémorise la course pour la reprise après un kill', async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });

      const interrupted = await buffer.interrupted();
      expect(interrupted?.activityId).toBe(gateway.activity.id);
    });
  });

  describe('capture', () => {
    beforeEach(async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });
    });

    it('écrit le point dans le tampon avant toute idée d’envoi', async () => {
      await recorder.record(aFix());

      expect(await buffer.pendingCount(gateway.activity.id)).toBe(1);
      expect(gateway.ingested).toHaveLength(0);
    });

    it('numérote les points de façon monotone', async () => {
      const first = await recorder.record(aFix());
      const second = await recorder.record(aFix());

      expect(first?.sequenceNumber).toBe(0);
      expect(second?.sequenceNumber).toBe(1);
    });

    it('ignore un point quand la course est en pause', async () => {
      await recorder.pause();

      expect(await recorder.record(aFix())).toBeUndefined();
      expect(await buffer.pendingCount(gateway.activity.id)).toBe(0);
    });

    it('ignore un point quand aucune course n’est en cours', async () => {
      const fresh = new Recorder({ gateway, buffer, tracker, clock });

      expect(await fresh.record(aFix())).toBeUndefined();
      expect(fresh.activity).toBeUndefined();
    });

    it('capte les positions que la plateforme pousse, sans qu’on l’appelle', async () => {
      // Le branchement entre le GPS et le tampon : c'est lui qui casse en
      // silence si le rappel n'est pas posé au démarrage.
      tracker.produce(aFix());
      await Promise.resolve();

      expect(recorder.activity?.id).toBe(gateway.activity.id);
      expect(await buffer.pendingCount(gateway.activity.id)).toBe(1);
    });
  });

  describe('envoi par lots', () => {
    beforeEach(async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });
    });

    it('ne fait rien quand le tampon est vide', async () => {
      expect(await recorder.flush()).toEqual([]);
      expect(gateway.ingested).toHaveLength(0);
    });

    it('purge le tampon jusqu’au dernier accusé, et pas au-delà', async () => {
      await recorder.record(aFix());
      await recorder.record(aFix());
      await recorder.record(aFix());

      gateway.nextOutcome = () => ({
        stats: EMPTY_STATS,
        lastAcceptedSequence: 1,
        acceptedCount: 2,
        rejected: [{ sequenceNumber: 2, reason: 'ACCURACY_TOO_LOW' }],
      });

      await recorder.flush();

      // Le point 2 est encore dû : il n'a pas été accepté.
      expect(await buffer.pendingCount(gateway.activity.id)).toBe(1);
    });

    it('rejoue le même lot sous la même clé après un échec réseau', async () => {
      await recorder.record(aFix());
      const failing = new Error('réseau coupé');
      gateway.nextOutcome = () => {
        throw failing;
      };

      await expect(recorder.flush()).rejects.toThrow(failing);
      // Rien n'a été purgé : le point est toujours dû.
      expect(await buffer.pendingCount(gateway.activity.id)).toBe(1);

      gateway.nextOutcome = undefined;
      await recorder.flush();

      const [first, second] = gateway.ingested;
      expect(first?.batch.idempotencyKey).toBe(second?.batch.idempotencyKey);
      expect(await buffer.pendingCount(gateway.activity.id)).toBe(0);
    });

    it('découpe un rejeu de tampon qui dépasse mille points', async () => {
      // §6 : « Un lot est plafonné à 1 000 points. Un rejeu de tampon après une
      // longue coupure les dépasse. Découpe. »
      for (let index = 0; index < MAXIMUM_POINTS_PER_BATCH + 250; index += 1) {
        await recorder.record(aFix());
      }

      await recorder.flush();

      expect(gateway.ingested).toHaveLength(2);
      expect(gateway.ingested[0]?.batch.points).toHaveLength(MAXIMUM_POINTS_PER_BATCH);
      expect(gateway.ingested[1]?.batch.points).toHaveLength(250);
    });

    it('signale un GPS sans fix après cinq rejets d’affilée', async () => {
      for (let index = 0; index < 5; index += 1) await recorder.record(aFix());

      gateway.nextOutcome = (batch) => ({
        stats: EMPTY_STATS,
        lastAcceptedSequence: -1,
        acceptedCount: 0,
        rejected: batch.points.map((point) => ({
          sequenceNumber: point.sequenceNumber,
          reason: 'ACCURACY_TOO_LOW' as const,
        })),
      });

      const warnings = await recorder.flush();

      expect(warnings).toContainEqual({ kind: 'no-gps-fix', consecutiveRejections: 5 });
    });

    it('signale les points encore en attente plutôt qu’une icône ambiguë', async () => {
      await recorder.record(aFix());
      await recorder.record(aFix());
      gateway.nextOutcome = () => ({
        stats: EMPTY_STATS,
        lastAcceptedSequence: 0,
        acceptedCount: 1,
        rejected: [],
      });

      const warnings = await recorder.flush();

      expect(warnings).toContainEqual({ kind: 'points-pending', count: 1 });
    });
  });

  describe('fin de course', () => {
    beforeEach(async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });
    });

    it('vide le tampon avant de terminer, sinon la fin de la course est perdue', async () => {
      await recorder.record(aFix());

      const finished = await recorder.finish();

      expect(gateway.ingested).toHaveLength(1);
      expect(finished?.status.kind).toBe('finished');
      expect(tracker.stopped).toBe(true);
    });

    it('abandonne sans rien envoyer', async () => {
      const discarded = await recorder.discard();

      expect(discarded?.status.kind).toBe('discarded');
      expect(gateway.ingested).toHaveLength(0);
    });

    it('met en pause puis reprend', async () => {
      expect((await recorder.pause())?.status.kind).toBe('paused');
      expect((await recorder.resume())?.status.kind).toBe('live');
    });

    it('ne transitionne pas sans course en cours', async () => {
      const fresh = new Recorder({ gateway, buffer, tracker, clock });

      expect(await fresh.pause()).toBeUndefined();
      expect(await fresh.finish()).toBeUndefined();
    });
  });

  describe('reprise après crash', () => {
    it('propose la course laissée en cours, avec ses points non envoyés', async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });
      await recorder.record(aFix());
      await recorder.record(aFix());

      // L'application est tuée : la session disparaît, le tampon reste.
      const afterKill = new Recorder({ gateway, buffer, tracker, clock });
      const resumable = await afterKill.resumable();

      expect(resumable?.recording.activityId).toBe(gateway.activity.id);
      expect(resumable?.pendingCount).toBe(2);
    });

    it('ne propose rien quand aucune course n’a été interrompue', async () => {
      expect(await recorder.resumable()).toBeUndefined();
    });

    it('reprend sans re-mesurer la dérive d’horloge', async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });
      const interrupted = await buffer.interrupted();

      if (interrupted === undefined) throw new Error('course interrompue attendue');
      const afterKill = new Recorder({ gateway, buffer, tracker, clock });
      const state = await afterKill.resumeInterrupted(interrupted);

      // §6 : la dérive est mesurée une fois, au démarrage. La reprise réutilise
      // celle-là — lui en donner une nouvelle décalerait la trace.
      expect(state?.skew).toEqual(interrupted.skew);
      expect(tracker.started).toBe(true);

      // Le rappel est reposé : la reprise réenregistre pour de bon.
      tracker.produce(aFix());
      await Promise.resolve();
      expect(await buffer.pendingCount(gateway.activity.id)).toBe(1);
    });

    it('vide le tampon puis lâche une course terminée côté serveur', async () => {
      await recorder.start({ type: 'RUN', title: 'Sortie', visibility: 'PUBLIC' });
      await recorder.record(aFix());
      const interrupted = await buffer.interrupted();

      gateway.activity = { ...gateway.activity, status: { kind: 'finished', since: 9 } };
      if (interrupted === undefined) throw new Error('course interrompue attendue');
      const afterKill = new Recorder({ gateway, buffer, tracker, clock });
      const state = await afterKill.resumeInterrupted(interrupted);

      expect(state).toBeUndefined();
      expect(gateway.ingested).toHaveLength(1);
      expect(await buffer.interrupted()).toBeUndefined();
    });
  });
});
