import type { LocationFix } from '../../activity/domain/track';
import type { Cancel } from '../../shared/time/scheduler';

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

  /**
   * Where the runner is *before* they start, so the screen can show it on a map
   * — a GPS shows you your dot before you ask for a route.
   *
   * Deliberately not `start`: no foreground service, no background mode, and
   * only the "while in use" permission. §6's "always" dialog stays where it
   * belongs, on the first run. A tracker that cannot locate — permission
   * refused, no sensor — returns a cancel that does nothing rather than
   * throwing: a missing dot must not stop anyone from running.
   */
  watchWhileVisible(onFix: (fix: LocationFix) => void): Promise<Cancel>;
}
