/**
 * The primitive palette: colours named by what they *are*, never by what they
 * are for. Nothing outside `../theme` may read this file — a screen that picks
 * `palette.brand500` has bypassed the theme and will be wrong in the dark and
 * in the running theme.
 *
 * Every value that carries text was chosen by measuring, not by eye. The three
 * that differ from the brief are marked, and `../theme/contrast.test.ts` is
 * what keeps them honest.
 */
export const palette = {
  // Orange — the single accent of the reference.
  brand500: '#EE4A22', // fills, ring, map trace, active tab, pastilles. 3.72:1 on white — non-text only.
  brand600: '#C8391A', // a surface that carries a white label: 5.18:1 against #FFFFFF.
  brand700: '#BE3618', // ORANGE TEXT. The brief says #C8391A, which gives 4.39:1 on brand-50 — below AA on the very card the reference puts orange text on. Measured, not guessed.
  brand50: '#FDE8E1', // tinted background of the highlight card.
  brand900: '#3A1A12', // its dark-theme counterpart.
  brand950: '#2A100A', // and its running-theme counterpart: the accent orange is TEXT there, so the tint has to go darker still (4.79:1).
  brand300: '#FF7A57', // orange text on a dark background.

  // Neutrals.
  white: '#FFFFFF',
  black: '#000000',
  neutral0: '#FFFFFF',
  neutral25: '#FAF7F6', // web canvas, where the page is wider
  neutral50: '#F5F5F5', // form rows, fields, grouped containers
  neutral100: '#ECECEC', // decorative separator — never carries meaning, hence no ratio to meet
  neutral500: '#8A8A8E', // the brief's text-muted. Kept for FIELD BORDERS (3.44:1), not for text.
  neutral600: '#6A6A6D', // secondary TEXT: 5.39:1 on white, 4.57:1 on the tinted card.
  neutral900: '#141414',

  // Dark neutrals — the general dark theme.
  ink900: '#121214',
  ink800: '#1C1C1F',
  ink700: '#26262B',
  ink600: '#33333A',
  ink400: '#7A7A85',
  ink200: '#A8A8B2',
  ink50: '#F2F2F3',

  // Darker still — the running theme reads at arm's length, in full sun.
  night900: '#0E0E10',
  night800: '#1A1A1D',
  night600: '#2E2E34',
  night400: '#8A8A94',
  night200: '#B4B4BC',

  // Metric accents. The disc is decoration; the icon on it carries the meaning,
  // so what must clear 3:1 is the icon against the disc, not the disc against
  // the card. `climb` is the one that needs a white icon rather than a dark one.
  heart: '#FDBE1E',
  pace: '#8FD4C4',
  paceLine: '#279C86', // the sparkline stroke: 3.39:1 on white, a meaningful non-text element
  paceLineDark: '#4ECBB0',
  climb: '#8250E8',
  climbLight: '#A583F0', // on a dark background, where the violet has to lighten to stay legible

  // Information pill.
  infoSurface: '#E8EDFB',
  infoText: '#3E5CC4', // the brief's #4C6FE7 gives 3.79:1 on its own background. Measured.
  infoSurfaceDark: '#1E2A4A',
  infoTextDark: '#9DB4F5',

  // Error and success. Absent from the brief, unavoidable for ErrorState, Toast
  // and form errors — §5 forbids carrying an error by a red border alone.
  danger: '#C0271C',
  dangerSurface: '#FDE7E4',
  dangerDark: '#FF8A7A',
  dangerSurfaceDark: '#3A1714',
  success: '#1B7A4B',
  successDark: '#6FD79E',

  // Focus ring (web keyboard navigation). Deliberately not orange: it must be
  // told apart from a brand fill at a glance.
  focus: '#1B4FD8',

  // Translucency. The round buttons floating over a photo or a map, and the
  // scrim behind a modal. They sit here rather than in a theme because a
  // literal `rgba()` written in a component is exactly what §3 forbids.
  scrim: 'rgba(20, 20, 20, 0.45)',
  glassLight: 'rgba(255, 255, 255, 0.82)',
  glassDark: 'rgba(20, 20, 20, 0.55)',

  // Skeletons. Low contrast on purpose: a skeleton that pulses hard reads as an
  // error rather than as a wait.
  skeletonLight: '#EFEFEF',
  skeletonLightHighlight: '#F7F7F7',
  skeletonDark: '#26262B',
  skeletonDarkHighlight: '#33333A',
} as const;

export type PaletteColour = (typeof palette)[keyof typeof palette];
