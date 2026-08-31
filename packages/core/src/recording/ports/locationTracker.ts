import type { LocationFix } from '../../activity/domain/track';

/**
 * The GPS. Three radically different implementations behind it: a foreground
 * service on Android, background modes on iOS, and nothing at all on the web —
 * §2 says the web cannot record, and that is a fact rather than a limitation to
 * work around.
 */
export type LocationPermission =
  'granted-always' | 'granted-while-in-use' | 'denied' | 'undetermined';

export interface LocationTracker {
  permission(): Promise<LocationPermission>;

  /**
   * §6: asked at the right moment — when the runner starts their first
   * activity, after an explanation, never on first launch.
   */
  requestAlwaysPermission(): Promise<LocationPermission>;

  /** Starts the foreground service / background updates. */
  start(onFix: (fix: LocationFix) => void): Promise<void>;

  stop(): Promise<void>;
}
