import { secureStoreForPlatform } from '@runtrack/adapters';
import { NativeMapSurface } from '@runtrack/adapters/map/native';
import {
  ExpoLocationTracker,
  ExpoNetworkMonitor,
  LazyPointBuffer,
  openRecordingDatabase,
  useBufferInBackground,
} from '@runtrack/adapters/recording/native';
import { ExpoPushRegistry } from '@runtrack/adapters/notification/native';
import { createRuntime, type Runtime } from '@runtrack/features';

/**
 * Built once, at module load, and shared by every screen.
 *
 * The base URL comes from the environment because it differs between a
 * simulator, a device on the same Wi-Fi and production. `process.env` is typed
 * as `any` here — the shells carry no Node types — so the value is checked
 * rather than trusted.
 *
 * The map surface is injected here and not resolved inside `@runtrack/adapters`
 * (§8): a `Platform.OS` test would leave both implementations in both bundles,
 * and MapLibre has no business being shipped to a phone.
 *
 * Recording is mobile-only (§2). Importing the recording entry point registers
 * the background location task, which is why it happens here and at module
 * load: the system may relaunch the app straight into that task.
 */
const configured: unknown = process.env['EXPO_PUBLIC_API_URL'];
const baseUrl =
  typeof configured === 'string' && configured !== '' ? configured : 'http://localhost:8080';

const opening = openRecordingDatabase();
const buffer = new LazyPointBuffer(opening);

// The task needs a buffer of its own: when the system relaunches the app into
// it, no screen exists and the fixes have to be written straight to SQLite.
void opening.then((opened) => {
  useBufferInBackground(opened);
});

export const runtime: Runtime = createRuntime({
  baseUrl,
  secureStore: secureStoreForPlatform(),
  clock: { now: () => Date.now() },
  map: NativeMapSurface,
  network: new ExpoNetworkMonitor(),
  recording: {
    buffer,
    tracker: new ExpoLocationTracker(),
  },
  // Le registre reçoit la passerelle d'appareils que le runtime construit :
  // une seule pile HTTP, et rien à muter après coup.
  push: (devices) => new ExpoPushRegistry(devices),
});
