import { screen } from '@testing-library/react-native';
import { Text } from '../Text';
import { renderInTheme, THEMES } from './harness';

describe('Text', () => {
  it.each(THEMES)('ne désactive jamais la mise à l’échelle (thème %s)', async (theme) => {
    await renderInTheme(<Text testID="t">Distance</Text>, theme);

    // §5 : `allowFontScaling={false}` est interdit. Ne rien passer laisse la
    // valeur par défaut de React Native, qui est `true`.
    expect(screen.getByTestId('t')).not.toHaveProp('allowFontScaling', false);
  });

  it('peut porter un nom accessible différent du texte affiché', async () => {
    await renderInTheme(<Text accessibilityLabel="5 minutes 12 par kilomètre">5:12/km</Text>);

    expect(screen.getByLabelText('5 minutes 12 par kilomètre')).toBeOnTheScreen();
  });

  it('se retire de l’arbre d’accessibilité quand un parent le lit déjà', async () => {
    await renderInTheme(
      <Text decorative testID="t">
        76
      </Text>,
    );

    expect(screen.getByTestId('t', { includeHiddenElements: true })).toHaveProp(
      'accessibilityElementsHidden',
      true,
    );
  });

  it('n’est une région vivante que si on le demande — §5 n’en autorise qu’une', async () => {
    await renderInTheme(<Text testID="t">4,2 km</Text>);

    expect(screen.getByTestId('t')).not.toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('annonce poliment un changement quand il est déclaré région vivante', async () => {
    await renderInTheme(
      <Text liveRegion="polite" testID="t">
        4,2 kilomètres, 22 minutes
      </Text>,
    );

    // §5 : « polite », jamais « assertive » par défaut — une annonce qui coupe
    // la parole au lecteur d'écran est pire que pas d'annonce du tout.
    expect(screen.getByTestId('t')).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});
