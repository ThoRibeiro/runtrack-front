import { screen } from '@testing-library/react-native';
import { List } from '../List';
import { Text } from '../Text';
import { renderInTheme } from './harness';

/**
 * §15: "un spinner sans état d'erreur ni état vide à côté". The three states are
 * props of the same component, so a caller cannot ship one and forget the rest.
 */
describe('List', () => {
  const renderItem = ({ item }: { item: string }) => <Text>{item}</Text>;

  it('affiche l’état vide plutôt qu’une page blanche', async () => {
    await renderInTheme(
      <List
        data={[]}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        emptyTitle="Aucune course pour l’instant"
        emptyDescription="Votre première sortie apparaîtra ici."
      />,
    );

    expect(
      screen.getByLabelText('Aucune course pour l’instant. Votre première sortie apparaîtra ici.'),
    ).toBeOnTheScreen();
  });

  it('affiche une erreur qui dit ce qui s’est passé', async () => {
    await renderInTheme(
      <List
        data={undefined}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        emptyTitle="Vide"
        error={{ title: 'Course introuvable', message: 'Son partage a été retiré.' }}
      />,
    );

    expect(
      screen.getByRole('alert', { name: 'Course introuvable. Son partage a été retiré.' }),
    ).toBeOnTheScreen();
  });

  it('attend en disant ce qu’elle attend', async () => {
    await renderInTheme(
      <List
        data={undefined}
        loading
        renderItem={renderItem}
        keyExtractor={(item) => item}
        emptyTitle="Vide"
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Chargement' })).toBeOnTheScreen();
  });

  it('rend les éléments qu’on lui donne', async () => {
    await renderInTheme(
      <List
        data={['Sortie du matin', 'Fractionné']}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        emptyTitle="Vide"
      />,
    );

    expect(screen.getByText('Sortie du matin')).toBeOnTheScreen();
  });

});
