import { screen } from '@testing-library/react-native';
import { MetricCard } from '../MetricCard';
import { Sparkline } from '../Sparkline';
import { renderInTheme } from './harness';

/**
 * The requirement of §5 that automatic tools never catch: the card reads as one
 * sentence, not as four disconnected fragments.
 */
describe('MetricCard', () => {
  it('se lit d’un bloc, unité prononcée en toutes lettres', async () => {
    await renderInTheme(
      <MetricCard
        title="Fréquence cardiaque"
        value="76"
        unit="bpm"
        spokenUnit="battements par minute"
        status="Stable"
        icon="heart"
        accent="heart"
      />,
    );

    expect(
      screen.getByLabelText('Fréquence cardiaque, 76 battements par minute, Stable'),
    ).toBeOnTheScreen();
  });

  it('n’expose pas ses fragments séparément au lecteur d’écran', async () => {
    await renderInTheme(
      <MetricCard title="Dénivelé" value="284" unit="m" spokenUnit="mètres" icon="mountain" />,
    );

    // Le texte est bien rendu — il est simplement marqué décoratif, donc le
    // lecteur n'annonce que le bloc.
    expect(screen.getByText('284', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByLabelText('284')).not.toBeOnTheScreen();
  });

  it('tolère l’absence d’unité et d’état', async () => {
    await renderInTheme(<MetricCard title="Sorties" value="4" icon="activity" />);

    expect(screen.getByLabelText('Sorties, 4')).toBeOnTheScreen();
  });

  it('cache le micro-graphique au lecteur d’écran', async () => {
    await renderInTheme(
      <MetricCard
        title="Allure"
        value="5:12"
        unit="/km"
        icon="trending-up"
        accent="pace"
        chart={<Sparkline values={[1, 2, 3]} width={100} height={30} testID="spark" />}
      />,
    );

    expect(screen.getByTestId('spark', { includeHiddenElements: true })).toHaveProp(
      'accessibilityElementsHidden',
      true,
    );
  });
});
