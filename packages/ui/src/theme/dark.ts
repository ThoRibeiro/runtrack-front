import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * The dark theme, declared token by token — never an automatic inversion.
 *
 * Its greys are built from the accent's hue rather than from a neutral
 * charcoal: a dark that shares the family reads as the same product with the
 * lights off, and a neutral one reads as a different application.
 *
 * The accent lightens to `teal400`. `teal500` gives 3.79:1 on this ground —
 * enough for a fill, not for a word — and an accent that cannot be read as text
 * would put the two-colour rule back that the palette just removed.
 */
export const darkTheme: Theme = {
  name: 'dark',
  isDark: true,
  colours: {
    canvas: palette.ink900,
    surface: palette.ink800,
    surfaceAlt: palette.ink700,

    text: palette.white,
    textMuted: palette.ink100,
    textInverse: palette.slate800,

    border: palette.ink700,
    borderStrong: palette.ink400,
    focusRing: palette.focusDark,
    scrim: palette.scrim,
    glass: palette.glassDark,

    brand: {
      fill: palette.teal400,
      onFill: palette.night900,
      solid: palette.teal500,
      onSolid: palette.white,
      text: palette.teal400,
      surface: palette.teal900,
      track: palette.ink600,
      gradientEnd: palette.teal500,
      onFillTrack: palette.onAccentTrack,
    },

    /**
     * One pale disc per metric, with a dark icon on it.
     *
     * The colour is a landmark, never the message: §15 forbids information
     * carried by colour alone, and every metric card also states its name in
     * words. Each pair is measured — see `contrast.test.ts`.
     */
    accent: {
      heart: { fill: palette.heartSurfaceDark, on: palette.heartIconDark },
      pace: { fill: palette.teal900, on: palette.teal400, line: palette.teal400 },
      climb: { fill: palette.climbSurfaceDark, on: palette.climbIconDark },
      count: { fill: palette.countSurfaceDark, on: palette.countIconDark },
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
