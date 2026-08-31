/**
 * §5: 44 × 44 pt on iOS, 48 × 48 dp on Android. One value, the larger of the
 * two — a component cannot be accessible on one platform only.
 */
export const MINIMUM_TOUCH_TARGET = 48;

/** Space between two neighbouring targets, so a shaking hand does not miss. */
export const MINIMUM_TOUCH_GAP = 8;

/**
 * §5: the live screen must not announce every position. Aggregated statistics
 * are a polite live region, at most one announcement per this interval.
 */
export const LIVE_REGION_MINIMUM_INTERVAL_MS = 30_000;
