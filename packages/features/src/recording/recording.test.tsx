import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { aFix } from '@runtrack/core/testing';
import { anActivity } from '../testing/fakes';
import { aRuntime, renderRecording, type Harness } from '../testing/harness';
import { RunScreen } from './screens/RunScreen';
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
    await renderRecording(<RunScreen onFinished={noop} />, harness);

    // Ouvrir le formulaire ne demande rien au système ; l'explication y est,
    // au-dessus du bouton qui, lui, déclenchera la boîte.
    await userEvent.press(await screen.findByTestId('prepare-start'));

    expect(await screen.findByText(/en permanence/)).toBeOnTheScreen();
    expect(harness.tracker.starts).toBe(0);
  });

  it('ouvre la carte en grand, et ne demande le reste qu’au départ', async () => {
    const harness = aRuntime();
    await renderRecording(<RunScreen onFinished={noop} />, harness);

    expect(await screen.findByTestId('run-map')).toBeOnTheScreen();
    // Le formulaire n'occupe pas l'écran tant qu'on n'a pas dit qu'on partait.
    expect(screen.queryByTestId('prepare-title')).toBeNull();
  });

  it('démarre la course sans quitter la carte, et montre les trois commandes', async () => {
    const harness = aRuntime();
    await renderRecording(<RunScreen onFinished={noop} />, harness);

    await userEvent.press(screen.getByTestId('prepare-start'));
    await userEvent.press(await screen.findByTestId('prepare-confirm'));

    await waitFor(() => {
      expect(harness.tracker.started).toBe(true);
    });
    // La même carte, la même page : seul ce qui flotte au-dessus a changé.
    expect(screen.getByTestId('run-map')).toBeOnTheScreen();
    expect(screen.getByTestId('recording-pause')).toBeOnTheScreen();
    expect(screen.getByTestId('recording-finish')).toBeOnTheScreen();
    expect(screen.getByTestId('recording-discard')).toBeOnTheScreen();
    expect(screen.queryByTestId('prepare-start')).toBeNull();
  });

  it('dit quoi faire quand la permission est refusée, sans bouton grisé', async () => {
    const harness = aRuntime();
    harness.tracker.deny();
    await renderRecording(<RunScreen onFinished={noop} onOpenSettings={noop} />, harness);

    await userEvent.press(screen.getByTestId('prepare-start'));
    await userEvent.press(await screen.findByTestId('prepare-confirm'));

    expect(await screen.findByTestId('prepare-refusal')).toBeOnTheScreen();
    expect(screen.getByTestId('prepare-settings')).toBeOnTheScreen();
  });

  it('montre où l’on est avant de partir, sans rien enregistrer', async () => {
    const harness = aRuntime();
    await renderRecording(<RunScreen onFinished={noop} />, harness);
    await screen.findByTestId('run-map');

    await act(async () => {
      harness.tracker.produceWhileVisible(aFix());
      await Promise.resolve();
    });

    // Le point est posé sur la carte, et le service de fond n'a pas démarré :
    // regarder où l'on est ne déclenche pas la boîte « en permanence » (§6).
    expect(harness.map.markerLabels).toContain('Position actuelle du coureur');
    expect(harness.tracker.starts).toBe(0);
    expect(harness.map.traces).toHaveLength(0);
  });

  it('repropose la boîte système tant que le système accepte de la montrer', async () => {
    const harness = aRuntime();
    // « Pendant l'utilisation » seulement : la course s'arrêterait écran
    // verrouillé, mais rien n'est perdu — la demande peut être rejouée.
    harness.tracker.grantWhileInUse();
    await renderRecording(<RunScreen onFinished={noop} onOpenSettings={noop} />, harness);

    await userEvent.press(screen.getByTestId('prepare-start'));
    await userEvent.press(await screen.findByTestId('prepare-confirm'));

    const again = await screen.findByTestId('prepare-allow');
    expect(screen.queryByTestId('prepare-settings')).toBeNull();

    harness.tracker.allow();
    await userEvent.press(again);

    await waitFor(() => {
      expect(harness.tracker.started).toBe(true);
    });
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

    await renderRecording(<RunScreen onFinished={noop} />, harness);

    expect(await screen.findByTestId('prepare-resumable')).toBeOnTheScreen();
    expect(screen.getByText(/1 point attend/)).toBeOnTheScreen();
  });

  it('fait disparaître pour de bon une course que le serveur ne veut plus', async () => {
    const harness = aRuntime();
    // Une course déjà terminée côté serveur, dont les points restent en local :
    // c'est l'état que laissait la version où « terminer » échouait.
    harness.activities.activity = anActivity({
      status: { kind: 'finished', since: 1_700_000_100_000 },
    });
    const activity = harness.activities.activity;
    await harness.buffer.remember({
      activityId: activity.id,
      skew: { offset: 0 },
      startedAt: 1_700_000_000_000,
    });
    await harness.buffer.append(activity.id, { ...aFix(), sequenceNumber: 0 });
    harness.activities.nextOutcome = () => {
      throw new Error('ACTIVITY_ALREADY_ENDED');
    };

    await renderRecording(<RunScreen onFinished={noop} />, harness);
    await userEvent.press(await screen.findByTestId('prepare-drop'));

    await waitFor(() => {
      expect(screen.queryByTestId('prepare-resumable')).toBeNull();
    });
    // Et surtout : elle ne revient pas à la prochaine ouverture.
    expect(await harness.buffer.interrupted()).toBeUndefined();
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
    await renderRecording(<RunScreen onFinished={noop} />, harness);
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
  async function startRunning(harness: Harness, onFinished = noop): Promise<void> {
    await renderRecording(<RunScreen onFinished={onFinished} />, harness);
    await userEvent.press(screen.getByTestId('prepare-start'));
    await userEvent.press(await screen.findByTestId('prepare-confirm'));
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

  it('dit pourquoi des points sont refusés, plutôt que de rester à zéro', async () => {
    const harness = aRuntime();
    // Le serveur accepte le premier point et refuse les suivants : c'est le cas
    // d'un GPS qui saute — sur simulateur, d'une position qui se téléporte.
    harness.activities.nextOutcome = (batch) => ({
      stats: harness.activities.activity.stats,
      lastAcceptedSequence: 0,
      acceptedCount: 1,
      rejected: batch.points.slice(1).map((point) => ({
        sequenceNumber: point.sequenceNumber,
        reason: 'IMPLAUSIBLE_SPEED' as const,
      })),
    });

    await startRunning(harness);
    await fix(harness, 1);
    await fix(harness, 2);
    await fix(harness, 3);
    await beat(harness);

    // Sans cela : 0,0 km à l'écran, et rien qui l'explique.
    expect(await screen.findByTestId('warn-points-refused')).toBeOnTheScreen();
    expect(screen.getByText(/saut de position/)).toBeOnTheScreen();
  });

  it('trace la ligne du parcours au fur et à mesure', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    const drawnBefore = harness.map.traces.length;

    await fix(harness, 1);
    await fix(harness, 2);

    // Une position, un ajout : la ligne s'allonge point par point, et rien
    // n'attend le battement d'envoi pour être dessiné.
    expect(harness.map.traces.length - drawnBefore).toBe(2);
    expect(harness.map.markerLabels).toContain('Position actuelle du coureur');
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

  it('efface le tracé de la course terminée', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    await fix(harness, 1);
    await fix(harness, 2);
    const drawnDuring = harness.map.traces.length;

    await userEvent.press(screen.getByTestId('recording-finish'));
    await userEvent.press(await screen.findByTestId('recording-confirm-confirm'));

    // La carte revient à celle d'avant le départ : sans cela, le tracé de la
    // sortie précédente reste sous le bouton « Démarrer ».
    await waitFor(() => {
      expect(harness.map.traces.length).toBeGreaterThan(drawnDuring);
    });
    expect(harness.map.traces[harness.map.traces.length - 1]).toEqual([]);
  });

  it('ne repropose pas la course qu’on vient de terminer', async () => {
    const harness = aRuntime();
    await startRunning(harness);
    await fix(harness, 1);

    await userEvent.press(screen.getByTestId('recording-finish'));
    await userEvent.press(await screen.findByTestId('recording-confirm-confirm'));

    // L'écran redevient celui du départ ; « une course était en cours » juste
    // après l'avoir finie, c'est une application qui ne suit pas.
    await waitFor(() => {
      expect(screen.getByTestId('prepare-start')).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('prepare-resumable')).toBeNull();
  });

  it('demande confirmation avant de terminer : un appui de travers au km 18', async () => {
    const harness = aRuntime();
    const finished = jest.fn();
    await renderRecording(<RunScreen onFinished={finished} />, harness);
    await userEvent.press(screen.getByTestId('prepare-start'));
    await userEvent.press(await screen.findByTestId('prepare-confirm'));
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
