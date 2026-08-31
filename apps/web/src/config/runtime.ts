import { secureStoreForPlatform } from '@runtrack/adapters';
import { createRuntime, type Runtime } from '@runtrack/features';

/**
 * Built once, at module load, and shared by every screen.
 *
 * The base URL comes from the environment because it differs between a
 * simulator, a device on the same Wi-Fi and production. `process.env` is typed
 * as `any` here — the shells carry no Node types — so the value is checked
 * rather than trusted.
 */
const configured: unknown = process.env['EXPO_PUBLIC_API_URL'];
const baseUrl =
  typeof configured === 'string' && configured !== '' ? configured : 'http://localhost:8080';

export const runtime: Runtime = createRuntime({
  baseUrl,
  secureStore: secureStoreForPlatform(),
  clock: { now: () => Date.now() },
});
