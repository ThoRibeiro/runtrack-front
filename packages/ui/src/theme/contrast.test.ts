import { darkTheme } from './dark';
import { LIGHT_CANVAS, lightTheme } from './light';
import { runTheme } from './run';
import {
  contrastPairs,
  contrastRatio,
  isLargeText,
  MINIMUM_RATIO,
  relativeLuminance,
} from './contrast';
import { palette } from '../tokens';
import type { Theme } from './theme';

/**
 * §5's guard rail: it walks every declared (text, background) pair of every
 * theme and checks the ratio. It is fast, and it catches the regression the day
 * someone lightens a grey — which is exactly how the brief's own `#8A8A8E`
 * turned out to be 3.44:1 rather than the 4.5:1 it needed.
 */

/** The surfaces a foreground can actually land on, per theme. */
function backgroundsOf(theme: Theme): readonly string[] {
  const { surface, surfaceAlt } = theme.colours;
  // The light canvas differs between web and native, and both must hold.
  const canvases =
    theme.name === 'light' ? [LIGHT_CANVAS.native, LIGHT_CANVAS.web] : [theme.colours.canvas];
  return [...new Set([...canvases, surface, surfaceAlt])];
}

const THEMES: [string, Theme][] = [
  ['clair', lightTheme],
  ['sombre', darkTheme],
  ['course', runTheme],
];

describe.each(THEMES)('thème %s', (_name, theme) => {
  const pairs = contrastPairs(theme, backgroundsOf(theme));

  it('déclare des paires à vérifier', () => {
    expect(pairs.length).toBeGreaterThan(20);
  });

  it('mesure l’anneau de focus sur l’aplat d’accent, pas seulement sur la page', () => {
    // La régression que le changement d'accent a produite : un anneau d'une
    // seule teinte y tombait à 1,10:1. Sans cette paire, rien ne l'aurait vu.
    const onAccent = pairs.filter(
      (pair) => pair.background === theme.colours.brand.solid && pair.label.startsWith('anneau'),
    );
    expect(onAccent).not.toHaveLength(0);
  });

  it.each(pairs)('$label', ({ foreground, background, requirement, alternative }) => {
    // Une paire à deux traits passe si l'un des deux ressort : les deux sont
    // dessinés en même temps, donc c'est le meilleur des deux que l'œil voit.
    const ratio = Math.max(
      contrastRatio(foreground, background),
      alternative === undefined ? 0 : contrastRatio(alternative, background),
    );
    expect(ratio).toBeGreaterThanOrEqual(MINIMUM_RATIO[requirement]);
  });
});

describe('le calcul lui-même', () => {
  it('donne 21:1 entre le noir et le blanc', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('est symétrique', () => {
    expect(contrastRatio('#2563EB', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#2563EB'),
      10,
    );
  });

  it('accepte la notation courte', () => {
    expect(relativeLuminance('#FFF')).toBeCloseTo(relativeLuminance('#FFFFFF'), 10);
  });

  it('refuse une couleur translucide plutôt que de rendre un chiffre faux', () => {
    expect(() => relativeLuminance('rgba(20, 20, 20, 0.45)')).toThrow(TypeError);
  });

  it('mesure ce qui a justifié la palette : l’accent passe AA comme texte', () => {
    // C'est la propriété qui a permis de supprimer la règle des deux teintes —
    // une seule couleur pour le remplissage et pour les mots.
    expect(contrastRatio(palette.blue500, '#FFFFFF')).toBeGreaterThanOrEqual(MINIMUM_RATIO.text);
  });

  it('et sur fond sombre, c’est la teinte claire qui passe, pas l’accent', () => {
    // L'accent y tombe sous AA : un remplissage, pas un mot. D'où `blue400`.
    expect(contrastRatio(palette.blue500, palette.ink900)).toBeLessThan(MINIMUM_RATIO.text);
    expect(contrastRatio(palette.blue400, palette.ink900)).toBeGreaterThanOrEqual(
      MINIMUM_RATIO.text,
    );
  });
});

describe('le seuil « texte large »', () => {
  it.each(['display', 'metric', 'title'] as const)('%s est du texte large', (token) => {
    expect(isLargeText(token)).toBe(true);
  });

  it.each(['body', 'caption'] as const)('%s ne l’est pas', (token) => {
    expect(isLargeText(token)).toBe(false);
  });
});
