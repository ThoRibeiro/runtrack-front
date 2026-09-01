import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { aFix } from '@runtrack/core/testing';
import { anActivity } from '../testing/fakes';
import { aRuntime, renderRecording, type Harness } from '../testing/harness';
import { PrepareScreen } from './screens/PrepareScreen';
import { RecordingScreen } from './screens/RecordingScreen';
import { FLUSH_INTERVAL_MILLIS } from './recordingStore';

const noop = (): void => undefined;

/** Fait avancer le battement d'envoi de §6. */
async function beat(harness: Harness, times = 1): Promise<void> {
  for (let tick = 0; tick < times; tick += 1) {
    await act(async () => {
      harness.scheduler.advanceBy(FLUSH_INTERVAL_MILLIS);
      await Promise.resolve();
    });
  }
}

/** Le GPS pousse une position, comme la plateforme le ferait. */
async function fix(harness: Harness, seconds: number): Promise<void> {
  await act(async () => {
    harness.tracker.produce({
      ...aFix(),
      recordedAt: 1_700_000_000_000 + seconds * 1000,
    });
    await Promise.resolve();
  });
}

describe('la préparation', () => {
  it('explique la permission avant de la demander : la boîte système ne se rejoue pas', async () => {
    const harness = aRuntime();
    await renderRecording(<PrepareScreen onStarted={noop} />, harness);

    expect(await screen.findByTestId('prepare-screen')).toBeOnTheScreen();
    expect(screen.getByText(/en permanence/)).toBeOnTheScreen();
    // Rien n'a encore été demandé au système : l'explication vient d'abord.
    expect(harness.tracker.starts).toBe(0);
  });

  it('démarre la course et lance le suivi', async () => {
    const harness = aRuntime();
    const started = jest.fn();
    await renderRecording(<PrepareScreen onStarted={started} />, harness);

    await userEvent.press(screen.getByTestId('prepare-start'));

    await waitFor(() => {
      expect(harness.tracker.started).toBe(true);
    });
    expect(started).toHaveBeenCalled();
  });

  it('dit quoi faire quand la permission est refusée, sans bouton grisé', async () => {
    const harness = aRuntime();
    harness.tracker.deny();
    await renderRecording(<PrepareScreen onStarted={noop} onOpenSettings={noop} />, harness);

    await userEvent.press(screen.getByTestId('prepare-start'));

    expect(await screen.findByTestId('prepare-refusal')).toBeOnTheScreen();
    expect(screen.getByTestId('prepare-settings')).toBeOnTheScreen();
  });

  it('propose la course qu’un crash a laissée, avec ses points en attente', async () => {
    const harness = aRuntime();
    await harness.buffer.remember({
      activityId: harness.activities.activity.id,
      skew: { offset: 0 },
      startedAt: 1_700_000_000_000,
    });
    await harness.buffer.append(harness.activities.activity.id, {
      ...aFix(),
      sequenceNumber: 0,
    });

    await renderRecording(<PrepareScreen onStarted={noop} />, harness);

    expect(await screen.findByTestId('prepare-resumable')).toBeOnTheScreen();
    expect(screen.getByText(/1 point attend/)).toBeOnTheScreen();
  });

  it('reprend la course interrompue et renvoie ses points', async () => {
    const harness = aRuntime();
    // Toujours vivante côté serveur : le téléphone a redémarré, pas la course.
    harness.activities.activity = anActivity({
      status: { kind: 'live', since: 1_700_000_000_000 },
      endedAt: undefined,
    });
    const activity = harness.activities.activity;
    await harness.buffer.remember({
      activityId: activity.id,
      skew: { offset: 0 },
      startedAt: 1_700_000_000_000,
    });
    await harness.buffer.append(activity.id, { ...aFix(), sequenceNumber: 0 });
    await renderRecording(<PrepareScreen onStarted={noop} />, harness);
    await screen.findByTestId('prepare-resumable');

    await userEvent.press(screen.getByTestId('prepare-resume'));

    await waitFor(() => {
      expect(harness.tracker.started).toBe(true);
    });
    // Les points d'avant le crash repartent au premier battement.
    await beat(harness);
    expect(harness.activities.ingested.length).toBeGreaterThan(0);
  });
});

describe('pendant la course', () => {
  async function startRunning(harness: Harness): Promise<void> {
    await renderRecording(
      <>
        <PrepareScreen onStarted={noop} />
        <RecordingScreen onFinished={noop} onDiscarded={noop} />
      </>,
      harness,
    );
    await userEvent.press(screen.getByTestId('prepare-start'));
    await waitFor(() => {
      expect(harness.tracker.started).toBe(true);
    });
  }

  it('écrit chaque position dans le tampon avant tout envoi', async () => {
    const harness = aRuntime();
    await startRunning(harness);

    await fix(harness, 1);
    await fix(harness, 2);

    // §6 : les points vont d'abord dans le tampon. Rien n'est encore parti.
    expect(await harness.buffer.pendingCount(harness.activities.activity.id)).toBe(2);
    expect(harness.activities.ingested).toHaveLength(0);
  });

  it('envoie par lots sur le battement, puis purge ce que le serveur a accepté', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    await fix(harness, 1);
    await fix(harness, 2);

    await beat(harness);

    expect(harness.activities.ingested).toHaveLength(1);
    expect(harness.activities.ingested[0]?.points).toHaveLength(2);
    expect(await harness.buffer.pendingCount(harness.activities.activity.id)).toBe(0);
  });

  it('envoie dès le retour du réseau, sans attendre le battement suivant', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    await fix(harness, 1);

    await act(async () => {
      harness.network.restore();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(harness.activities.ingested).toHaveLength(1);
    });
  });

  it('garde les points quand l’envoi échoue : c’est toute l’histoire du hors-ligne', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    await fix(harness, 1);
    harness.activities.nextOutcome = () => {
      throw new Error('réseau coupé');
    };

    await beat(harness);

    expect(await harness.buffer.pendingCount(harness.activities.activity.id)).toBe(1);
  });

  it('dit combien de points attendent plutôt que d’afficher une icône ambiguë', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    await fix(harness, 1);
    await fix(harness, 2);
    // Le serveur n'accepte que le premier.
    harness.activities.nextOutcome = () => ({
      stats: harness.activities.activity.stats,
      lastAcceptedSequence: 0,
      acceptedCount: 1,
      rejected: [],
    });

    await beat(harness);

    expect(await screen.findByTestId('warn-points-pending')).toHaveTextContent(
      '1 point en attente',
    );
  });

  it('prévient quand le GPS n’a pas de position, avant dix kilomètres pour rien', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    for (let index = 1; index <= 6; index += 1) await fix(harness, index);
    harness.activities.nextOutcome = (batch) => ({
      stats: harness.activities.activity.stats,
      lastAcceptedSequence: -1,
      acceptedCount: 0,
      rejected: batch.points.map((point) => ({
        sequenceNumber: point.sequenceNumber,
        reason: 'ACCURACY_TOO_LOW' as const,
      })),
    });

    await beat(harness);

    expect(await screen.findByTestId('warn-no-gps-fix')).toBeOnTheScreen();
  });

  it('coupe le GPS en pause et le rallume à la reprise', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    const startsBefore = harness.tracker.starts;

    await userEvent.press(screen.getByTestId('recording-pause'));
    await waitFor(() => {
      expect(harness.tracker.stops).toBe(1);
    });
    expect(await screen.findByLabelText(/En pause/)).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId('recording-pause'));
    await waitFor(() => {
      expect(harness.tracker.starts).toBe(startsBefore + 1);
    });
  });

  it('demande confirmation avant de terminer : un appui de travers au km 18', async () => {
    const harness = aRuntime();
    const finished = jest.fn();
    await renderRecording(
      <>
        <PrepareScreen onStarted={noop} />
        <RecordingScreen onFinished={finished} onDiscarded={noop} />
      </>,
      harness,
    );
    await userEvent.press(screen.getByTestId('prepare-start'));
    await waitFor(() => {
      expect(harness.tracker.started).toBe(true);
    });
    await fix(harness, 1);

    await userEvent.press(screen.getByTestId('recording-finish'));
    expect(await screen.findByText('Terminer la course ?')).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId('recording-confirm-confirm'));

    await waitFor(() => {
      expect(finished).toHaveBeenCalled();
    });
    // §6 : terminer vide le tampon d'abord — la fin de la course serait perdue.
    expect(harness.activities.ingested).toHaveLength(1);
    expect(harness.tracker.stopped).toBe(true);
  });
});
