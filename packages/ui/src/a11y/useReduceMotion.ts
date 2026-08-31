import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * §4/§5: `Reduce Motion` is respected by *replacing* movement, not by removing
 * it. A decorative animation disappears; a functional transition becomes a
 * cross-fade, so the user still sees that something changed.
 *
 * People prone to motion sickness turn this on for real. It is not a corner case.
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
