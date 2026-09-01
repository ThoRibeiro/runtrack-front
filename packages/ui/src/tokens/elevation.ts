/**
 * Almost nothing, and now genuinely nothing on a card.
 *
 * The direction is a flat interface where surfaces are told apart by a hairline
 * and by the ground beneath them — the way an instrument panel does it. A card
 * that floats is a card asking for attention, and on a screen where every card
 * floats, none of them gets any.
 *
 * The sheet keeps a trace of shadow, because it genuinely is above the page and
 * slides over it: that one is motion, not decoration.
 */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sheet: {
    shadowColor: '#0A0F12',
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 6,
  },
} as const;

export type ElevationToken = keyof typeof elevation;
