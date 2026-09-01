/**
 * The primitive palette: colours named by what they *are*, never by what they
 * are for. Nothing outside `../theme` may read this file — a screen that picks
 * `palette.blue500` has bypassed the theme and will be wrong in the dark and in
 * the running theme.
 *
 * ---
 *
 * **Why royal blue.** The owner's own mockups are blue and violet — three
 * references, three times the same family — and the accent is taken from the
 * sign-in one rather than invented beside it. `#2563EB` gives **5.17:1 on
 * white**, which is the property that matters: the accent is legible *as text*,
 * so one colour does fills and labels both. An accent that only passes 3:1 has
 * to be paired with a second, darker shade for text, and that pair is a rule
 * nobody remembers at the moment they need it.
 *
 * The blue-greys are pulled to the same hue rather than left neutral, so the
 * greys read as part of the accent's family instead of sitting beside it.
 *
 * Two things moved when the accent stopped being teal, and neither is visible
 * from the colour swatch alone:
 *
 *  - **the focus ring.** It used to be blue precisely so it could not be
 *    mistaken for a teal fill. On a blue button that same ring measured
 *    **1.10:1** — invisible. No single hue fixes it, because the focused
 *    control can sit on white *or* on the accent card, so the ring is now two
 *    strokes, `focusRing` over `focusRingInner`; whichever the ground, one of
 *    them contrasts. `../theme/contrast.test.ts` checks the pair on every
 *    background of every theme;
 *  - **the `count` pastille**, which was blue and would now read as the accent.
 *    Moved to cyan, and re-measured.
 *
 * Everything else is derived, and every pair is walked by the contrast test.
 */
export const palette = {
  // The accent, and the only chromatic colour the interface uses on purpose.
  blue500: '#2563EB', // 5.17:1 on white — fills AND text. The whole point.
  blue600: '#1D4ED8', // pressed states, and the label on a light tinted ground.
  blue400: '#7CA8FF', // the accent on a dark ground: 7.93:1.
  blue50: '#E9EFFD', // the tint under a highlighted card.
  blue900: '#0B1B3D', // its dark-theme counterpart.

  // The blue-greys, from the accent's own hue. They carry structure, not
  // meaning.
  slate800: '#15264D', // primary text: 14.83:1 on white.
  slate600: '#53627D', // secondary text: 6.16:1.
  slate500: '#7C8CA6', // field borders, meaningful icons: 3.41:1, non-text.
  slate400: '#8494B0', // a stronger separator: 3.07:1.
  slate200: '#C3CDDD', // surfaces, decorative rules.
  slate100: '#DCE3EE', // the faintest rule, on white.
  slate50: '#F3F6FB', // grouped rows, fields, the alternate surface.

  // Neutrals. Most of the screen is one of these two.
  white: '#FFFFFF',
  black: '#000000',
  canvasWeb: '#FBFCFE', // the page is wider on the web; a hair off white keeps cards visible.

  // The dark theme, built from `slate800` rather than from a neutral grey: a
  // dark that shares the accent's hue reads as the same product with the lights
  // off, which a neutral charcoal does not.
  ink900: '#0C1220',
  ink800: '#151C2B',
  ink700: '#1D2637',
  ink600: '#2A3549',
  ink400: '#6B7A94',
  ink200: '#9CAAC1',
  ink100: '#C3CDDD', // secondary text in the dark: 11.66:1.

  // Darker still: the running theme is read at arm's length, in full sun.
  night900: '#080D18',
  night800: '#121A28',
  night600: '#1F2A3D',
  night400: '#7A8AA3',
  night200: '#C3CDDD',

  // Metric pastilles.
  //
  // A coloured disc behind each icon is what makes a list of metrics scannable:
  // the eye finds the heart before it reads the word. The set is deliberately
  // cold — no orange anywhere — and each pair is a pale ground with a dark icon
  // on it, measured at 5:1 or better.
  heartSurface: '#FCE7F3',
  heartIcon: '#BE185D',
  heartSurfaceDark: '#33161D',
  heartIconDark: '#FF97AE',
  climbSurface: '#EDE9FE',
  climbIcon: '#5B21B6',
  climbSurfaceDark: '#1F1B3A',
  climbIconDark: '#A99CF0',
  countSurface: '#DBF3F9', // cyan, not blue: blue is now the accent.
  countIcon: '#0E6F86',
  countSurfaceDark: '#0D2630',
  countIconDark: '#7FD4EC',

  // Feedback. Absent from a five-colour palette and unavoidable: §5 forbids an
  // error carried by a red border alone, so the words need a colour too.
  //
  // The red is pulled to the cold side of red on purpose — **no orange anywhere
  // in this interface**, and a brick red reads as one at a glance.
  danger: '#A6203A', // 7.27:1 on white.
  dangerSurface: '#FAE8EC',
  dangerDark: '#FF8A9E', // 8.35:1 on the dark canvas.
  dangerSurfaceDark: '#33141C',
  success: '#1B6E4B', // 6.22:1 on white.
  successDark: '#5FCB97',

  // Information. Shares the accent's hue: an informational note is not an
  // alert, and giving it a colour of its own would imply it were one.
  infoSurface: '#E9EFFD',
  infoText: '#1D4ED8',
  infoSurfaceDark: '#111E33',
  infoTextDark: '#9CC0FF',

  // Focus ring, two strokes.
  //
  // A single hue cannot do this job once the accent is blue: the focused
  // control sits on white on one screen and on the accent card on the next, and
  // one colour cannot contrast with both. `focusRing` is the outer stroke and
  // `focusRingInner` the inner one; on a light ground the ink stroke carries
  // it, on a coloured or dark one the white stroke does.
  focusRing: '#0C1220',
  focusRingInner: '#FFFFFF',

  // Skeletons. Two steps apart and no more: a shimmer that contrasts is a
  // shimmer that draws the eye to what is not there yet.
  skeletonLight: '#EDF1F8',
  skeletonLightHighlight: '#F8FAFD',
  skeletonDark: '#1D2637',
  skeletonDarkHighlight: '#2A3549',

  // Translucency. A literal `rgba()` written in a component is exactly what the
  // design rules forbid, so the ones that exist live here.
  scrim: 'rgba(12, 18, 32, 0.48)',
  glassLight: 'rgba(255, 255, 255, 0.78)',
  /** A ring track drawn on the accent fill. */
  onAccentTrack: 'rgba(255, 255, 255, 0.28)',
  glassDark: 'rgba(18, 26, 40, 0.72)',
} as const;

export type PaletteColour = keyof typeof palette;
