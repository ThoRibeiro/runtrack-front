import { screen, userEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { renderInTheme, THEMES } from './harness';

describe('Button', () => {
  it('porte un rôle, un nom et un état', async () => {
    await renderInTheme(<Button label="Démarrer une course" onPress={() => undefined} />);

    const button = screen.getByRole('button', { name: 'Démarrer une course' });
    expect(button).toBeOnTheScreen();
    expect(button).toBeEnabled();
  });

  it('annonce qu’il travaille pendant le chargement', async () => {
    await renderInTheme(<Button label="Enregistrement" loading onPress={() => undefined} />);

    const button = screen.getByRole('button', { name: 'Enregistrement' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
  });

  it('n’appelle pas onPress quand il est désactivé', async () => {
    const onPress = jest.fn();
    await renderInTheme(<Button label="Indisponible" disabled onPress={onPress} />);

    await userEvent.press(screen.getByRole('button', { name: 'Indisponible' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('appelle onPress quand il est actif', async () => {
    const onPress = jest.fn();
    await renderInTheme(<Button label="Partager" onPress={onPress} />);

    await userEvent.press(screen.getByRole('button', { name: 'Partager' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('accepte un nom accessible distinct du libellé visible', async () => {
    await renderInTheme(
      <Button
        label="Tout voir"
        accessibilityLabel="Tout voir : dernières courses"
        onPress={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Tout voir : dernières courses' })).toBeOnTheScreen();
  });

  it.each(THEMES)('reste un bouton nommé dans le thème %s', async (theme) => {
    await renderInTheme(<Button label="Partager" onPress={() => undefined} />, theme);

    expect(screen.getByRole('button', { name: 'Partager' })).toBeOnTheScreen();
  });
});
