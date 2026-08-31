import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * The running theme, and the recording screen is the only screen that wears it.
 *
 * §3 is explicit about why it exists: the light palette is made to be looked at
 * sitting down, and this screen is read at arm's length, in full sun, while
 * running, and it stays lit for three hours. It keeps the same `brand.fill`,
 * which gives 5.18:1 on this background — the identity survives and the
 * legibility improves.
 */
export const runTheme: Theme = {
  name: 'run',
  isDark: true,
  colours: {
    canvas: palette.night900,
    surface: palette.night800,
    surfaceAlt: palette.night800,

    text: palette.white,
    textMuted: palette.night200,
    textInverse: palette.neutral900,

    border: palette.night600,
    borderStrong: palette.night400,
    focusRing: palette.white,
    scrim: palette.scrim,
    glass: palette.glassDark,

    brand: {
      fill: palette.brand500,
      onFill: palette.white,
      solid: palette.brand600,
      onSolid: palette.white,
      // 5.18:1 on the canvas: the accent orange is readable as text here, which
      // it never is on white. That is the whole point of a declared theme.
      text: palette.brand500,
      surface: palette.brand950,
      track: palette.night600,
    },

    accent: {
      heart: { fill: palette.heart, on: palette.neutral900 },
      pace: { fill: palette.pace, on: palette.neutral900, line: palette.paceLineDark },
      climb: { fill: palette.climbLight, on: palette.neutral900 },
    },

    info: { surface: palette.infoSurfaceDark, text: palette.infoTextDark },
    danger: {
      surface: palette.dangerSurfaceDark,
      text: palette.dangerDark,
      solid: palette.danger,
      onSolid: palette.white,
    },
    success: { surface: palette.night800, text: palette.successDark },
    skeleton: { base: palette.night600, highlight: palette.night800 },
  },
  ...scales,
};
