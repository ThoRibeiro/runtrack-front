import { RunTrackError, activityId } from '@runtrack/core';
import { screen, userEvent } from '@testing-library/react-native';
import { aFeedItem } from '../../testing/fakes';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { FeedScreen } from './FeedScreen';

const noop = (): void => undefined;

describe('FeedScreen', () => {
  it('lit une carte d’un bloc, pas en morceaux', async () => {
    // §5 : « Camille, Sortie du matin, 12,4 kilomètres, 1 heure 2 minutes » et
    // non cinq fragments sans lien.
    const harness = aRuntime();
    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);

    const card = await screen.findByLabelText(
      'Camille, Sortie du matin, 12,4 kilomètres, 1 heure 2 minutes',
    );
    expect(card).toBeOnTheScreen();
  });

  it('ouvre la course qu’on touche', async () => {
    const harness = aRuntime();
    const onOpenActivity = jest.fn();
    await renderWithRuntime(<FeedScreen onOpenActivity={onOpenActivity} />, harness);

    await userEvent.press(await screen.findByTestId('feed-card-a1'));

    expect(onOpenActivity).toHaveBeenCalledWith(activityId('a1'));
  });

  it('dit que le fil est vide plutôt que d’afficher une page blanche', async () => {
    const harness = aRuntime();
    harness.feed.pages = [{ items: [] }];
    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);

    expect(await screen.findByLabelText(/Votre fil est vide/)).toBeOnTheScreen();
  });

  it('signale une course en cours autrement que par la couleur', async () => {
    const harness = aRuntime();
    harness.feed.pages = [
      { items: [aFeedItem({ status: { kind: 'live', since: 1 }, endedAt: undefined })] },
    ];
    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);

    // Deux porteurs : la puce et la phrase de la carte. Les deux comptent —
    // §15 interdit que l'information tienne à la seule couleur.
    const card = await screen.findByTestId('feed-card-a1');
    expect(card.props['accessibilityLabel']).toContain('En direct');
    expect(screen.getAllByLabelText('En direct').length).toBeGreaterThan(0);
  });

  it('dit ce que le serveur a refusé', async () => {
    const harness = aRuntime();
    harness.feed.read = () =>
      Promise.reject(new RunTrackError({ code: 'BLOCKED', message: 'un blocage vous en empêche' }));
    await renderWithRuntime(<FeedScreen onOpenActivity={noop} />, harness);

    const alert = await screen.findByRole('alert');
    expect(alert.props['accessibilityLabel']).toContain('un blocage vous en empêche');
  });
});
