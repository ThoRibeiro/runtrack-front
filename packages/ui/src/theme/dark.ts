import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * The general dark theme. Declared token by token, like the running theme and
 * for the same reason: an automatic inversion turns the violet climb pastille
 * into something that means nothing.
 *
 * It is not the running theme. This one is read sitting down; §3's running
 * theme is read at arm's length, and it is darker and larger everywhere.
 */
export const darkTheme: Theme = {
  name: 'dark',
  isDark: true,
  colours: {
    canvas: palette.ink900,
    surface: palette.ink800,
    surfaceAlt: palette.ink700,

    text: palette.ink50,
    textMuted: palette.ink200,
    textInverse: palette.neutral900,

    border: palette.ink600,
    borderStrong: palette.ink400,
    focusRing: palette.brand300,
    scrim: palette.scrim,
    glass: palette.glassDark,

    brand: {
      fill: palette.brand500,
      onFill: palette.white,
      solid: palette.brand600,
      onSolid: palette.white,
      // The orange has to lighten here: #C8391A on #1C1C1F is unreadable.
      text: palette.brand300,
      surface: palette.brand900,
      track: palette.ink600,
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
    success: { surface: palette.ink700, text: palette.successDark },
    skeleton: { base: palette.skeletonDark, highlight: palette.skeletonDarkHighlight },
  },
  ...scales,
};
