import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen } from '@testing-library/react-native';
import { Logo } from '../Logo';
import { renderInTheme, THEMES } from './harness';

describe('Logo', () => {
  it('reste muet quand le nom est écrit à côté', async () => {
    await renderInTheme(<Logo testID="mark" />);

    // Une marque qui répète le mot posé à côté d'elle fait dire deux fois la
    // même chose au lecteur d'écran. `includeHiddenElements` est nécessaire
    // *parce que* c'est le cas : sans cette option la requête ne la trouve pas,
    // ce qui est déjà la preuve qu'elle est bien hors de l'arbre accessible.
    expect(screen.getByTestId('mark', { includeHiddenElements: true })).toHaveProp(
      'aria-hidden',
      true,
    );
    expect(screen.queryByTestId('mark')).toBeNull();
  });

  it('s’annonce quand elle est seule', async () => {
    await renderInTheme(<Logo label="RunTrack" testID="mark" />);

    expect(screen.getByTestId('mark')).toHaveProp('accessibilityLabel', 'RunTrack');
    expect(screen.getByTestId('mark')).not.toHaveProp('aria-hidden', true);
  });

  // Un seul rendu par test : deux arbres montés dans le même test laissent
  // l'écran partagé vide pour tous les tests suivants du fichier, et l'échec
  // se lit alors très loin de sa cause.
  it('pose une tuile derrière la marque en variante icône', async () => {
    await renderInTheme(<Logo variant="tile" testID="tile" />);

    expect(JSON.stringify(screen.toJSON())).toContain('RNSVGRect');
  });

  it('ne pose rien derrière elle en variante marque', async () => {
    await renderInTheme(<Logo variant="mark" testID="mark" />);

    expect(JSON.stringify(screen.toJSON())).not.toContain('RNSVGRect');
  });

  it.each(THEMES)('se dessine dans le thème %s', async (name) => {
    await renderInTheme(<Logo label="RunTrack" testID="mark" />, name);

    expect(screen.getByTestId('mark')).toBeOnTheScreen();
  });
});

describe('les icônes livrées', () => {
  /**
   * Le script qui produit les PNG porte sa propre copie du tracé — il tourne
   * sous Node et ne peut pas importer un module TSX. Cette copie est le
   * problème : le jour où la marque change d'un seul côté, l'icône de
   * l'application et le logo de l'écran divergent sans que rien ne le dise.
   */
  it('génère les PNG à partir du tracé exact du composant', () => {
    const read = (path: string): string => readFileSync(join(__dirname, path), 'utf8');
    const pathOf = (source: string): string | undefined => /M13 44[^']*/.exec(source)?.[0];

    const component = pathOf(read('../Logo.tsx'));

    expect(component).toBeDefined();
    expect(pathOf(read('../../../../../scripts/build-logo-assets.mjs'))).toBe(component);
  });
});
