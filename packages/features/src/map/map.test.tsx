import { AccessibilityInfo } from 'react-native';
import { activityId, encodePolyline, type GeoPoint, type Split } from '@runtrack/core';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { aRuntime, renderWithRuntime } from '../testing/harness';
import { ActivityScreen } from '../activity/screens/ActivityScreen';

const noop = (): void => undefined;

/** Two kilometres due east, one fix every hundred metres. */
function aTrack(count = 21): GeoPoint[] {
  const latitude = 48.8606;
  const metresPerDegree = 111_320 * Math.cos((latitude * Math.PI) / 180);
  return Array.from({ length: count }, (_, index) => ({
    latitude,
    longitude: 2.3376 + (index * 100) / metresPerDegree,
  }));
}

function aSplit(overrides: Partial<Split> = {}): Split {
  return {
    kilometreIndex: 1,
    distanceMetres: 1000,
    timeSeconds: 300,
    paceSecondsPerKm: 300,
    elevationGain: 12,
    averageHeartRate: undefined,
    complete: true,
    ...overrides,
  };
}

function harnessWithTrack(points = aTrack(), splits: readonly Split[] = []) {
  const harness = aRuntime();
  harness.activities.trackData = {
    polyline: encodePolyline(points),
    pointCount: points.length,
    pointsPurgedAt: undefined,
  };
  harness.activities.splitList = splits;
  return harness;
}

const activityScreen = (): React.ReactElement => (
  <ActivityScreen id={activityId('a1')} onBack={noop} onFollowLive={noop} onShare={noop} />
);

describe('la carte d’une course', () => {
  it('décode la trace et la donne à la carte en une fois', async () => {
    const points = aTrack();
    const harness = harnessWithTrack(points);

    await renderWithRuntime(activityScreen(), harness);

    await waitFor(() => {
      expect(harness.map.traces).not.toHaveLength(0);
    });
    // §7 : dessinée d'un coup, jamais point par point.
    expect(harness.map.traces).toHaveLength(1);
    expect(harness.map.traces[0]).toHaveLength(points.length);
    expect(harness.map.fits).toBeGreaterThan(0);
  });

  it('nomme le départ et l’arrivée : §5, un repère porte du sens', async () => {
    const harness = harnessWithTrack();

    await renderWithRuntime(activityScreen(), harness);

    await waitFor(() => {
      expect(harness.map.markerLabels).toEqual(['Départ', 'Arrivée']);
    });
  });

  it('annonce la carte comme une image nommée, pas comme un rectangle muet', async () => {
    const harness = harnessWithTrack();

    await renderWithRuntime(activityScreen(), harness);

    expect(await screen.findByLabelText('Carte du parcours')).toBeOnTheScreen();
  });

  it('dit que le tracé est purgé plutôt que de tourner indéfiniment', async () => {
    const harness = aRuntime();
    harness.activities.trackData = {
      polyline: '',
      pointCount: 0,
      pointsPurgedAt: 1_700_000_000_000,
    };

    await renderWithRuntime(activityScreen(), harness);

    // L'état vide s'annonce d'un bloc, titre et raison ensemble.
    expect(await screen.findByLabelText(/Tracé indisponible/)).toBeOnTheScreen();
    expect(screen.queryByTestId('map-decoding')).toBeNull();
  });

  it('pose un repère par kilomètre une fois les splits chargés', async () => {
    const harness = harnessWithTrack(aTrack(), [
      aSplit({ kilometreIndex: 1 }),
      aSplit({ kilometreIndex: 2 }),
    ]);
    await renderWithRuntime(activityScreen(), harness);
    await waitFor(() => {
      expect(harness.map.markerLabels).toEqual(['Départ', 'Arrivée']);
    });

    await userEvent.press(await screen.findByTestId('activity-splits-toggle'));

    await waitFor(() => {
      expect(harness.map.markerLabels).toEqual(['Départ', 'Kilomètre 1', 'Kilomètre 2', 'Arrivée']);
    });
  });

  it('numérote les kilomètres comme le serveur : à partir de 1', async () => {
    const harness = harnessWithTrack(aTrack(), [aSplit({ kilometreIndex: 1 })]);
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');

    await userEvent.press(screen.getByTestId('activity-splits-toggle'));

    expect(await screen.findByLabelText('Kilomètre 1, 5:00')).toBeOnTheScreen();
  });

  it('cadre le kilomètre que l’on touche, et l’annonce — la carte a bougé hors du champ', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const harness = harnessWithTrack(aTrack(), [aSplit({ kilometreIndex: 1 })]);
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-splits-toggle'));
    await screen.findByLabelText('Kilomètre 1, 5:00');
    const framesBefore = harness.map.fits;

    await userEvent.press(screen.getByLabelText('Kilomètre 1, 5:00'));

    expect(harness.map.fits).toBe(framesBefore + 1);
    expect(announce).toHaveBeenCalledWith('Kilomètre 1 affiché sur la carte');
    announce.mockRestore();
  });

  it('laisse inerte un kilomètre partiel : il n’a pas de repère à montrer', async () => {
    const harness = harnessWithTrack(aTrack(), [
      aSplit({ kilometreIndex: 1 }),
      aSplit({ kilometreIndex: 2, distanceMetres: 380, complete: false }),
    ]);
    await renderWithRuntime(activityScreen(), harness);
    await screen.findByTestId('activity-screen');
    await userEvent.press(screen.getByTestId('activity-splits-toggle'));

    const partial = await screen.findByLabelText('Kilomètre 2, 5:00 (partiel)');
    expect(partial.props['onStartShouldSetResponder']).toBeUndefined();
  });

  it('propose de recentrer dès que l’utilisateur déplace la vue, et pas avant', async () => {
    const harness = harnessWithTrack();
    await renderWithRuntime(activityScreen(), harness);
    await waitFor(() => {
      expect(harness.map.traces).not.toHaveLength(0);
    });
    expect(screen.queryByTestId('map-recentre')).toBeNull();

    // Le pan vient de la carte, hors de tout événement React : le vidage des
    // mises à jour est asynchrone, d'où le `act` asynchrone.
    await act(async () => {
      harness.map.pan();
      // Le vidage de la mise à jour est asynchrone : sans ce tour de boucle,
      // `act` rend la main avant le rendu et le bouton n'existe pas encore.
      await Promise.resolve();
    });

    const recentre = await screen.findByTestId('map-recentre');
    const framesBefore = harness.map.fits;
    await userEvent.press(recentre);

    expect(harness.map.fits).toBe(framesBefore + 1);
    await waitFor(() => {
      expect(screen.queryByTestId('map-recentre')).toBeNull();
    });
  });
});
