import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { LocationFix, LocationPermission, LocationTracker } from '@runtrack/core';
import { deliverFixes, onLocationFixes, persistFixes } from './backgroundLocation';
import type { PointBuffer } from '@runtrack/core';

/**
 * The GPS on iOS and Android (§6).
 *
 * Everything difficult here is platform paperwork, and getting it wrong costs a
 * run rather than a pixel:
 *
 *  - **the "always" permission is asked in two steps.** Android refuses to even
 *    show the background dialog before foreground access is granted, so asking
 *    for background first silently returns "denied" and the runner never sees
 *    a prompt;
 *  - **the foreground service is mandatory.** Since Android 14 a background
 *    location update without a persistent notification and
 *    `foregroundServiceType="location"` is not throttled — it is refused;
 *  - **`pausesUpdatesAutomatically` is off.** iOS is happy to decide a runner
 *    who stopped at a red light is done moving, and stop delivering. It resumes
 *    eventually, and the trace has a hole in the middle;
 *  - **`activityType: Fitness`** tells iOS what kind of movement to expect,
 *    which is what keeps updates coming while the screen is locked.
 *
 * The task is defined at module scope because that is the only place it can be:
 * the system may relaunch the app *into* the task, before any component exists.
 */
export const LOCATION_TASK = 'runtrack-location-updates';

/** Below this, a fix is noise — a phone indoors reports hundreds of metres. */
const ACCEPTABLE_ACCURACY_METRES = 100;

interface LocationTaskData {
  locations?: Location.LocationObject[];
}

export function toFix(location: Location.LocationObject): LocationFix {
  const fix: LocationFix = {
    position: { latitude: location.coords.latitude, longitude: location.coords.longitude },
    elevationMetres: location.coords.altitude ?? 0,
    // The device's own clock, and it drifts — `ClockSkew` corrects it later.
    recordedAt: location.timestamp,
    accuracyMetres: location.coords.accuracy ?? ACCEPTABLE_ACCURACY_METRES,
  };
  return fix;
}

/**
 * Where the buffer comes from when the app is not running.
 *
 * Set once at launch by the composition root. It is a module-level slot rather
 * than a constructor argument because the task has no constructor — it is
 * called by the system on a bundle that may have just been re-imported.
 */
let bufferForBackground: PointBuffer | undefined;

export function useBufferInBackground(buffer: PointBuffer): void {
  bufferForBackground = buffer;
}

// The payload is typed as possibly absent: the platform delivers an empty body
// on some wake-ups, and the declaration promising otherwise is optimistic.
TaskManager.defineTask<LocationTaskData | undefined>(LOCATION_TASK, async ({ data, error }) => {
  // A task error is a platform failure — permission revoked mid-run, service
  // killed. There is nothing to write and nothing to retry from here; the
  // screen finds out through the absence of new points.
  if (error !== null || data === undefined) return;

  const fixes = (data.locations ?? []).map(toFix);
  // Someone is listening: the recorder is alive and will write them itself.
  if (deliverFixes(fixes)) return;

  const buffer = bufferForBackground;
  if (buffer === undefined) return;
  await persistFixes(buffer, fixes);
});

function toPermission(
  foreground: Location.PermissionStatus,
  background: Location.PermissionStatus,
): LocationPermission {
  if (foreground !== Location.PermissionStatus.GRANTED) {
    return foreground === Location.PermissionStatus.DENIED ? 'denied' : 'undetermined';
  }
  return background === Location.PermissionStatus.GRANTED
    ? 'granted-always'
    : 'granted-while-in-use';
}

export class ExpoLocationTracker implements LocationTracker {
  private stopListening: (() => void) | undefined;

  async permission(): Promise<LocationPermission> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    return toPermission(foreground.status, background.status);
  }

  /**
   * §6: asked when the runner starts their first activity, after an
   * explanation the shell shows — never on first launch.
   */
  async requestAlwaysPermission(): Promise<LocationPermission> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      return foreground.status === Location.PermissionStatus.DENIED ? 'denied' : 'undetermined';
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    return toPermission(foreground.status, background.status);
  }

  async start(onFix: (fix: LocationFix) => void): Promise<void> {
    this.stopListening?.();
    this.stopListening = onLocationFixes((fixes) => {
      for (const fix of fixes) onFix(fix);
    });

    const alreadyRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (alreadyRunning) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      // A second between fixes, and no distance filter: a runner waiting at a
      // light still owes the trace its elapsed time.
      timeInterval: 1000,
      distanceInterval: 0,
      activityType: Location.LocationActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'RunTrack enregistre votre course',
        notificationBody: 'Le suivi continue même écran verrouillé.',
        // Mandatory since Android 14, and the whole reason background updates
        // are delivered at all.
        killServiceOnDestroy: false,
      },
    });
  }

  async stop(): Promise<void> {
    this.stopListening?.();
    this.stopListening = undefined;

    if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  }
}
