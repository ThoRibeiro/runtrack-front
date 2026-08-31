import { screen, userEvent } from '@testing-library/react-native';
import { TabBar } from '../TabBar';
import { Tabs } from '../Tabs';
import { renderInTheme } from './harness';

const ITEMS = [
  { key: 'home', icon: 'home', label: 'Accueil' },
  { key: 'feed', icon: 'users', label: 'Fil' },
  { key: 'notifications', icon: 'bell', label: 'Alertes', badgeCount: 12 },
  { key: 'profile', icon: 'user', label: 'Profil' },
] as const;

describe('TabBar', () => {
  it('dit lequel est actif autrement que par la couleur', async () => {
    await renderInTheme(<TabBar items={ITEMS} activeKey="feed" onSelect={() => undefined} />);

    expect(screen.getByRole('tab', { name: 'Fil' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Profil' })).not.toBeSelected();
  });

  it('porte le compteur de non-lus dans une pastille nommée', async () => {
    await renderInTheme(<TabBar items={ITEMS} activeKey="home" onSelect={() => undefined} />);

    expect(screen.getByLabelText('12 non lus, Alertes')).toBeOnTheScreen();
  });

  it('signale la sélection', async () => {
    const onSelect = jest.fn();
    await renderInTheme(<TabBar items={ITEMS} activeKey="home" onSelect={onSelect} />);

    await userEvent.press(screen.getByRole('tab', { name: 'Profil' }));

    expect(onSelect).toHaveBeenCalledWith('profile');
  });
});

describe('Tabs', () => {
  it('nomme le groupe et l’onglet actif', async () => {
    await renderInTheme(
      <Tabs
        label="Période"
        options={[
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
        ]}
        value="week"
        onValueChange={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Période')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Semaine' })).toBeSelected();
  });
});
