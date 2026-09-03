import { screen } from '@testing-library/react-native';
import { TrackThumbnail } from '../TrackThumbnail';
import { renderInTheme } from './harness';

/** Une boucle : deux rues, un retour. Assez pour avoir une forme. */
const LOOP = [
  { latitude: 50.63, longitude: 3.06 },
  { latitude: 50.634, longitude: 3.062 },
  { latitude: 50.633, longitude: 3.068 },
  { latitude: 50.629, longitude: 3.066 },
  { latitude: 50.63, longitude: 3.06 },
];

describe('TrackThumbnail', () => {
  it('dessine le parcours reçu', async () => {
    await renderInTheme(<TrackThumbnail points={LOOP} testID="track" />);

    // Un chemin SVG, pas une carte montée vingt fois dans une liste : la
    // vignette ne rend rien d'autre qu'un tracé.
    expect(screen.getByTestId('track')).toBeOnTheScreen();
    expect(screen.queryByText('Trace indisponible')).toBeNull();
    expect(screen.toJSON()).toMatchObject({ type: 'View' });
  });

  it('ne dessine rien quand il n’y a pas de trace, et le dit s’il le faut', async () => {
    await renderInTheme(
      <TrackThumbnail points={undefined} emptyLabel="Trace indisponible" testID="track" />,
    );

    expect(screen.getByText('Trace indisponible')).toBeOnTheScreen();
  });

  it('ne dessine rien pour une course immobile : un point n’a pas de forme', async () => {
    await renderInTheme(
      <TrackThumbnail
        points={[{ latitude: 50.63, longitude: 3.06 }]}
        emptyLabel="Trace indisponible"
        testID="track"
      />,
    );

    expect(screen.getByText('Trace indisponible')).toBeOnTheScreen();
  });

  it('s’annonce quand elle porte du sens, se tait quand elle est décorative', async () => {
    await renderInTheme(
      <TrackThumbnail points={LOOP} accessibilityLabel="Parcours de la course" testID="track" />,
    );

    expect(screen.getByLabelText('Parcours de la course')).toBeOnTheScreen();
  });
});
