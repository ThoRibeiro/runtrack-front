import { render, screen } from '@testing-library/react-native';
import { Gallery } from './Gallery';

/**
 * The gallery mounts every component in every state at once, so this is the
 * cheapest broad regression net there is: a component that throws on a long
 * label, an empty series or a missing prop fails here before it reaches a
 * screen.
 *
 * It is not a substitute for the manual VoiceOver pass §5 requires. Automatic
 * tools cover about a third of the criteria; "les quatre fragments décousus" is
 * in the other two thirds.
 */
describe('Galerie', () => {
  it('monte, et tous ses états avec elle', async () => {
    await render(<Gallery />);

    expect(screen.getByTestId('gallery-scroll')).toBeOnTheScreen();
  });

  it('ne laisse aucun bouton sans nom accessible', async () => {
    await render(<Gallery />);

    for (const button of screen.getAllByRole('button')) {
      const label: unknown = button.props['accessibilityLabel'];
      expect(typeof label === 'string' && label.length > 0).toBe(true);
    }
  });

  it('expose les quatre onglets et un seul actif', async () => {
    await render(<Gallery />);

    const tabs = screen.getAllByRole('tab');
    const selected = tabs.filter((tab) => {
      const state: unknown = tab.props['accessibilityState'];
      return (
        typeof state === 'object' &&
        state !== null &&
        'selected' in state &&
        state.selected === true
      );
    });

    expect(tabs.length).toBeGreaterThanOrEqual(4);
    // Un onglet de thème actif, un onglet de période actif, un onglet de barre
    // active : trois groupes, un actif chacun.
    expect(selected).toHaveLength(3);
  });
});
