import { screen } from '@testing-library/react-native';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { FloatingIconButton } from '../FloatingIconButton';
import { Icon } from '../Icon';
import { IconAction } from '../IconAction';
import { renderInTheme } from './harness';

/** §15: an icon-only button without an `accessibilityLabel` is forbidden. */
describe('boutons à icône seule', () => {
  it('le bouton flottant porte le nom qu’on lui donne', async () => {
    await renderInTheme(<FloatingIconButton icon="arrow-left" accessibilityLabel="Retour" />);

    expect(screen.getByRole('button', { name: 'Retour' })).toBeOnTheScreen();
  });

  it('l’action ronde prend son libellé comme nom accessible', async () => {
    await renderInTheme(<IconAction icon="share" label="Partager" onPress={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Partager' })).toBeOnTheScreen();
  });

  it('l’action ronde annonce qu’elle est active', async () => {
    await renderInTheme(<IconAction icon="live" label="En direct" active />);

    expect(screen.getByRole('button', { name: 'En direct' })).toBeSelected();
  });

  it('une icône est décorative par défaut', async () => {
    await renderInTheme(<Icon name="heart" colour="#000000" testID="icone" />);

    expect(screen.getByTestId('icone', { includeHiddenElements: true })).toHaveProp(
      'aria-hidden',
      true,
    );
    expect(screen.queryByTestId('icone')).toBeNull();
  });
});

describe('Avatar', () => {
  it('s’annonce par le nom de la personne, jamais « avatar »', async () => {
    await renderInTheme(<Avatar name="Thomas Ribeiro" />);

    expect(screen.getByLabelText('Thomas Ribeiro')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/avatar/i)).not.toBeOnTheScreen();
  });

  it('replie sur les initiales sans photo', async () => {
    await renderInTheme(<Avatar name="Thomas Ribeiro" />);

    expect(screen.getByText('TR', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('ne coupe pas un caractère composé en deux', async () => {
    await renderInTheme(<Avatar name="Émile" />);

    expect(screen.getByText('É', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('Badge', () => {
  it('dit ce qu’il compte', async () => {
    await renderInTheme(<Badge count={3} label="notifications non lues" />);

    expect(screen.getByLabelText('3 notifications non lues')).toBeOnTheScreen();
  });

  it('plafonne l’affichage sans mentir sur le sens', async () => {
    await renderInTheme(<Badge count={512} label="notifications non lues" max={99} />);

    expect(screen.getByLabelText('99+ notifications non lues')).toBeOnTheScreen();
  });

  it('disparaît à zéro plutôt que d’afficher un rond vide', async () => {
    await renderInTheme(<Badge count={0} label="notifications non lues" />);

    expect(screen.queryByLabelText(/notifications/)).not.toBeOnTheScreen();
  });
});
