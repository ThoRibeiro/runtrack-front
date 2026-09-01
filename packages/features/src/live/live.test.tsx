import { act, screen, waitFor } from '@testing-library/react-native';
import { activityId } from '@runtrack/core';
import { anActivity } from '../testing/fakes';
import { aRuntime, renderWithRuntime, type Harness } from '../testing/harness';
import { LiveScreen } from './screens/LiveScreen';

const noop = (): void => undefined;

/** Un battement, une position, un lot de statistiques : ce que le serveur envoie. */
function deliverPosition(harness: Harness, sequenceNumber: number, id?: string): void {
  harness.live.deliver({
    id,
    event: 'position',
    data: {
      sequenceNumber,
      latitude: 48.8566 + sequenceNumber * 0.0001,
      longitude: 2.3522,
      elevation: 35,
      recordedAt: new Date(1_700_000_000_000 + sequenceNumber * 1000).toISOString(),
    },
  });
}

function deliverStats(harness: Harness, distanceMeters: number): void {
  harness.live.deliver({
    id: `s-${String(distanceMeters)}`,
    event: 'stats',
    data: { distanceMeters, elapsedSeconds: 600, averagePaceSecondsPerKm: 300 },
  });
}

/** Le battement d'une seconde du hook : c'est lui qui autorise un rendu. */
async function tick(harness: Harness, times = 1): Promise<void> {
  for (let beat = 0; beat < times; beat += 1) {
    await act(async () => {
      harness.scheduler.advanceBy(1_000);
      await Promise.resolve();
    });
  }
}

/**
 * Un réseau qui reste coupé : chaque tentative de reconnexion échoue à son tour.
 *
 * Sans ça, un simple `fail()` ne se voit pas à l'écran — le recul initial vaut
 * une demi-seconde et la reconnexion réussit avant le battement suivant. C'est
 * voulu : l'état ne doit pas clignoter pour une coupure d'une demi-seconde.
 */
async function stayOffline(harness: Harness, millis: number): Promise<void> {
  await act(async () => {
    harness.live.fail(new Error('réseau coupé'));
    for (let elapsed = 0; elapsed < millis; elapsed += 100) {
      const before = harness.live.openCount;
      harness.scheduler.advanceBy(100);
      if (harness.live.openCount > before) harness.live.fail(new Error('réseau coupé'));
    }
    await Promise.resolve();
  });
}

function liveScreen() {
  return <LiveScreen id={activityId('a1')} onBack={noop} onOpenSummary={noop} />;
}

function aLiveHarness(): Harness {
  const harness = aRuntime();
  harness.activities.activity = anActivity({ status: { kind: 'live', since: 1_700_000_000_000 } });
  return harness;
}

describe('LiveScreen', () => {
  it('ouvre le flux de la course et dessine l’instantané d’un coup', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');

    deliverPosition(harness, 1);
    deliverPosition(harness, 2);
    deliverPosition(harness, 3);
    await tick(harness);

    expect(harness.live.openCount).toBe(1);
    // §7 : un seul appel à la carte pour les trois points, pas trois.
    expect(harness.map.traces).toHaveLength(1);
    expect(harness.map.traces[0]).toHaveLength(3);
  });

  it('n’ajoute ensuite que ce qui est arrivé depuis', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');
    deliverPosition(harness, 1);
    await tick(harness);

    deliverPosition(harness, 2);
    deliverPosition(harness, 3);
    await tick(harness);

    expect(harness.map.traces).toHaveLength(2);
    expect(harness.map.traces[1]).toHaveLength(2);
  });

  it('ignore un doublon : le serveur préfère un doublon à un trou', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');

    deliverPosition(harness, 1);
    deliverPosition(harness, 1);
    deliverPosition(harness, 2);
    await tick(harness);

    expect(harness.map.traces[0]).toHaveLength(2);
  });

  it('ne rend pas l’écran plus d’une fois par seconde, quoi que fasse le GPS', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');

    // Dix positions dans la même seconde : le serveur en envoie une par seconde,
    // mais un rejeu après reconnexion en livre bien davantage d'un coup.
    for (let sequence = 1; sequence <= 10; sequence += 1) deliverPosition(harness, sequence);
    deliverStats(harness, 2_400);
    await tick(harness);

    expect(harness.map.traces).toHaveLength(1);
    expect(await screen.findByLabelText('Distance, 2,4 kilomètres')).toBeOnTheScreen();
  });

  it('affiche les statistiques agrégées, chacune nommée', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');

    deliverStats(harness, 5_000);
    await tick(harness);

    expect(await screen.findByLabelText('Distance, 5,0 kilomètres')).toBeOnTheScreen();
    expect(screen.getByLabelText('Durée, 10 minutes')).toBeOnTheScreen();
    expect(screen.getByLabelText('Allure, 5 minutes 0 par kilomètre')).toBeOnTheScreen();
  });

  it('n’annonce jamais le flux de positions, et résume au plus toutes les 30 secondes', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');
    const announcement = screen.getByTestId('live-announcement');

    deliverStats(harness, 1_000);
    await tick(harness);
    const first: unknown = announcement.props['children'];

    deliverStats(harness, 2_000);
    await tick(harness, 5);

    // L'horloge du harness est figée : moins de trente secondes se sont
    // écoulées, donc la région vivante n'a rien de nouveau à dire.
    const second: unknown = announcement.props['children'];
    expect(second).toBe(first);
    expect(announcement.props['accessibilityLiveRegion']).toBe('polite');
  });

  it('dit qu’il reconnecte plutôt que de faire tourner un spinner', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');
    deliverPosition(harness, 1);
    await tick(harness);

    await stayOffline(harness, 3_000);

    expect(await screen.findByLabelText(/Reconnexion/)).toBeOnTheScreen();
    expect(harness.live.openCount).toBeGreaterThan(1);
  });

  it('renvoie le dernier identifiant reçu en reprenant', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');
    deliverPosition(harness, 1, '1710-4');

    await act(async () => {
      harness.live.fail(new Error('réseau coupé'));
      // Le recul initial vaut une seconde, tiré à 0,5 par le harness.
      harness.scheduler.advanceBy(1_000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(harness.live.openCount).toBe(2);
    });
    expect(harness.live.lastEventIds[1]).toBe('1710-4');
  });

  it('n’ouvre aucun flux pour une course déjà terminée', async () => {
    const harness = aRuntime();
    harness.activities.activity = anActivity({
      status: { kind: 'finished', since: 1_700_003_862_000 },
    });
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');

    expect(harness.live.openCount).toBe(0);
    expect(await screen.findByLabelText(/Course terminée/)).toBeOnTheScreen();
    expect(screen.getByTestId('live-summary')).toBeOnTheScreen();
  });

  it('propose le résumé quand la course se termine sous les yeux du spectateur', async () => {
    const harness = aLiveHarness();
    await renderWithRuntime(liveScreen(), harness);
    await screen.findByTestId('live-screen');

    await act(async () => {
      harness.live.deliver({
        id: 'st-1',
        event: 'status',
        data: { status: 'Finished', since: '2026-01-01T11:00:00Z' },
      });
      harness.live.fail(new Error('le serveur a raccroché'));
      await Promise.resolve();
    });
    await tick(harness);

    expect(await screen.findByTestId('live-summary')).toBeOnTheScreen();
    // Et il n'y a pas de nouvelle tentative : il n'y a plus rien à suivre.
    await act(async () => {
      harness.scheduler.advanceBy(60_000);
      await Promise.resolve();
    });
    expect(harness.live.openCount).toBe(1);
  });

  it('dit ce qui manque quand la course est introuvable', async () => {
    const harness = aRuntime();
    harness.activities.onById = () => Promise.reject(new Error('boum'));
    await renderWithRuntime(liveScreen(), harness);

    expect(await screen.findByTestId('live-error')).toBeOnTheScreen();
    expect(harness.live.openCount).toBe(0);
  });
});
