import { screen } from '@testing-library/react-native';
import { ProgressRing } from '../ProgressRing';
import { renderInTheme } from './harness';

describe('ProgressRing', () => {
  it('annonce une phrase, pas un nombre isolé', async () => {
    await renderInTheme(<ProgressRing progress={0.68} label="Objectif de la semaine" />);

    const ring = screen.getByRole('progressbar', { name: 'Objectif de la semaine, 68 %' });
    expect(ring).toBeOnTheScreen();
    expect(ring).toHaveAccessibilityValue({ min: 0, max: 100, now: 68 });
  });

  it('borne une progression aberrante plutôt que de dessiner faux', async () => {
    await renderInTheme(<ProgressRing progress={1.4} label="Objectif" />);

    expect(screen.getByRole('progressbar', { name: 'Objectif, 100 %' })).toBeOnTheScreen();
  });

  it('borne aussi par le bas', async () => {
    await renderInTheme(<ProgressRing progress={-0.2} label="Objectif" />);

    expect(screen.getByRole('progressbar', { name: 'Objectif, 0 %' })).toBeOnTheScreen();
  });
});
