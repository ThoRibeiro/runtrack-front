import {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { duration, easing } from '../tokens';

/**
 * §4: list and screen transitions are declared once here and consumed by
 * `entering` / `exiting` / `layout`. A screen that writes its own is the same
 * mistake as a screen that writes its own colour.
 *
 * Each preset comes in two shapes. `Reduce Motion` does not remove the
 * transition — it replaces the movement with a fade, so the change is still
 * visible to someone who cannot watch things slide.
 */
const curve = Easing.bezier(...easing.standard);

const full = {
  listItemIn: FadeIn.duration(duration.base).easing(curve),
  listItemOut: FadeOut.duration(duration.fast).easing(curve),
  listLayout: LinearTransition.duration(duration.base).easing(curve),
  sheetIn: SlideInDown.duration(duration.slow).easing(Easing.bezier(...easing.decelerate)),
  sheetOut: SlideOutDown.duration(duration.base).easing(Easing.bezier(...easing.accelerate)),
} as const;

const reduced = {
  listItemIn: FadeIn.duration(duration.fast),
  listItemOut: FadeOut.duration(duration.fast),
  listLayout: LinearTransition.duration(0),
  sheetIn: FadeIn.duration(duration.fast),
  sheetOut: FadeOut.duration(duration.fast),
} as const;

export const transitions = { full, reduced } as const;

/** The union of both sets, so neither needs a conversion to fit the other. */
export type TransitionSet = {
  [K in keyof typeof full]: (typeof full)[K] | (typeof reduced)[K];
};

export function transitionsFor(reduceMotion: boolean): TransitionSet {
  return reduceMotion ? reduced : full;
}
