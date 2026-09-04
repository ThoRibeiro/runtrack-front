import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * The dark theme, declared token by token — never an automatic inversion.
 *
 * Its greys are built from the accent's hue rather than from a neutral
 * charcoal: a dark that shares the family reads as the same product with the
 * lights off, and a neutral one reads as a different application.
 *
 * The accent lightens to `blue400`. `blue500` gives 3.68:1 on this ground —
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
    focusRing: palette.focusRing,
    focusRingInner: palette.focusRingInner,
    scrim: palette.scrim,
    glass: palette.glassDark,

    brand: {
      fill: palette.blue400,
      onFill: palette.night900,
      solid: palette.blue500,
      onSolid: palette.white,
      text: palette.blue400,
      surface: palette.blue900,
      track: palette.ink600,
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
      pace: { fill: palette.blue900, on: palette.blue400, line: palette.blue400 },
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
