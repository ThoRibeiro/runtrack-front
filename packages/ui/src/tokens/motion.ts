/**
 * Motion is a token, exactly like colour (§4). A screen never writes its own
 * duration: twelve slightly different springs is what happens when it does.
 */
export const duration = {
  fast: 150, // a press, a colour change
  base: 250, // the default transition
  slow: 400, // a sheet opening, a screen transition
} as const;

/** Cubic-bézier control points, consumed by Reanimated's `Easing.bezier`. */
export const easing = {
  /** Entering the screen: fast out, gentle in. */
  decelerate: [0.05, 0.7, 0.1, 1] as const,
  /** Leaving: gentle out, fast in. */
  accelerate: [0.3, 0, 0.8, 0.15] as const,
  /** Both ends, for something that moves and comes back. */
  standard: [0.2, 0, 0, 1] as const,
} as const;

/**
 * Spring configurations. A gesture-driven movement uses a spring, never a
 * duration: a duration cannot carry the velocity of the wrist that released it.
 */
export const spring = {
  /** Press feedback and small movements. */
  snappy: { damping: 20, stiffness: 300, mass: 0.6 },
  /** A sheet that follows the finger and settles. */
  sheet: { damping: 24, stiffness: 220, mass: 0.9 },
} as const;

/** Scale a pressable shrinks to. Small enough to feel, not enough to jump. */
export const pressScale = 0.97;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
export type SpringToken = keyof typeof spring;
