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

  it('porte la mise en page qu’on lui donne, et pas seulement le geste', async () => {
    await renderInTheme(<Button label="Suivre" onPress={() => undefined} style={{ flex: 1 }} />);

    const button = screen.getByRole('button', { name: 'Suivre' });
    // Les deux sur le *même* nœud, et c'est tout l'objet du test : l'animation
    // de pression a longtemps vécu sur une vue enveloppante sans flex, qui
    // ramenait chaque bouton à sa largeur naturelle. Deux boutons censés se
    // partager une ligne se tassaient à gauche, et une rangée d'onglets aussi.
    expect(button).toHaveStyle({ flex: 1 });
    expect(button).toHaveStyle({ transform: [{ scale: 1 }] });
  });
});
