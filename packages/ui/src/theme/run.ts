import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * The running theme, and the recording screen is the only screen wearing it.
 *
 * The reason has not changed: the light palette is made to be looked at sitting
 * down, and this screen is read at arm's length, in full sun, while running,
 * and it stays lit for three hours.
 *
 * It goes darker than the general dark theme — `night900` against `ink900` —
 * because contrast is what survives sunlight, and it takes the accent one step
 * lighter still: `blue400` on this ground is 8.4:1, which is what a number read
 * at arm's length with a moving arm needs.
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
    textInverse: palette.slate800,

    border: palette.night600,
    borderStrong: palette.night400,
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
      track: palette.night600,
      onFillTrack: palette.onAccentTrack,
    },

    // Sourd, et c'est le seul thème où ça l'est : on lit des chiffres à bout de
    // bras en plein soleil, et quatre couleurs de pastille y sont du bruit.
    accent: {
      heart: { fill: palette.night600, on: palette.night200 },
      pace: { fill: palette.night600, on: palette.night200, line: palette.blue400 },
      climb: { fill: palette.night600, on: palette.night200 },
      count: { fill: palette.night600, on: palette.night200 },
    },

    info: { surface: palette.infoSurfaceDark, text: palette.infoTextDark },
    danger: {
      surface: palette.dangerSurfaceDark,
      text: palette.dangerDark,
      solid: palette.danger,
      onSolid: palette.white,
    },
    success: { surface: palette.night600, text: palette.successDark },
    skeleton: { base: palette.skeletonDark, highlight: palette.skeletonDarkHighlight },
  },
  ...scales,
};
