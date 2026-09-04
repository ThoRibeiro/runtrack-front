import { screen, userEvent } from '@testing-library/react-native';
import { Tabs } from '../Tabs';
import { renderInTheme } from './harness';

const noop = (): void => undefined;

describe('Tabs', () => {
  const views = [
    { value: 'grid' as const, label: 'Grille', icon: 'grid' as const },
    { value: 'list' as const, label: 'Liste', icon: 'list' as const },
  ];

  it('garde son nom quand le mot devient une icône', async () => {
    // §5 : une icône seule à l'écran, mais jamais pour le lecteur — sans cela
    // l'onglet s'annoncerait « bouton », deux fois de suite.
    await renderInTheme(
      <Tabs appearance="underline" options={views} value="grid" onValueChange={noop} label="Vue" />,
    );

    expect(screen.getByRole('tab', { name: 'Grille' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Liste' })).toBeOnTheScreen();
  });

  it('dit lequel est actif, et lui seul', async () => {
    await renderInTheme(
      <Tabs appearance="underline" options={views} value="list" onValueChange={noop} label="Vue" />,
    );

    const selected = screen.getAllByRole('tab').filter((tab) => {
      const state: unknown = tab.props['accessibilityState'];
      return (
        typeof state === 'object' &&
        state !== null &&
        'selected' in state &&
        state.selected === true
      );
    });

    expect(selected).toHaveLength(1);
    expect(selected[0]?.props['accessibilityLabel']).toBe('Liste');
  });

  it('rend la valeur pressée', async () => {
    const onValueChange = jest.fn();
    await renderInTheme(
      <Tabs
        appearance="underline"
        options={views}
        value="grid"
        onValueChange={onValueChange}
        label="Vue"
      />,
    );

    await userEvent.press(screen.getByRole('tab', { name: 'Liste' }));

    expect(onValueChange).toHaveBeenCalledWith('list');
  });

  it('ne dit pas la sélection par le seul marqueur', async () => {
    // §5 : ce qui glisse est décoratif. L'état vit sur l'onglet, sinon un
    // lecteur d'écran n'a que quatre boutons identiques à annoncer.
    await renderInTheme(
      <Tabs appearance="underline" options={views} value="list" onValueChange={noop} label="Vue" />,
    );

    const marked = screen.getAllByRole('tab').map((tab) => {
      const state: unknown = tab.props['accessibilityState'];
      const named: unknown = tab.props['accessibilityLabel'];
      const selected =
        typeof state === 'object' &&
        state !== null &&
        'selected' in state &&
        state.selected === true;
      return `${typeof named === 'string' ? named : '?'} ${selected ? 'sélectionné' : 'non'}`;
    });

    expect(marked).toEqual(['Grille non', 'Liste sélectionné']);
  });

  it('affiche encore le mot quand aucune icône n’est donnée', async () => {
    await renderInTheme(
      <Tabs
        options={[
          { value: 'week', label: 'Semaine' },
          { value: 'year', label: 'Année' },
        ]}
        value="week"
        onValueChange={noop}
        label="Période"
      />,
    );

    expect(screen.getByText('Semaine', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
