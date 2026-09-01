/**
 * The mobile-only half of §6.
 *
 * Importing this module **registers a system task**, which is why it is not in
 * the package's main entry point: a web bundle has no business defining a
 * background location task, and §2 is explicit that the web does not record.
 * Keeping the buffer here too is what stops SQLite from being shipped to a
 * browser that will never open it.
 */
export {
  ExpoLocationTracker,
  LOCATION_TASK,
  toFix,
  useBufferInBackground,
} from './expoLocationTracker';
export { adapt, openRecordingDatabase, DATABASE_NAME } from './expoSqlite';
export { ExpoNetworkMonitor } from './expoNetworkMonitor';
export { LazyPointBuffer } from './lazyPointBuffer';
export { SCHEMA, SqlitePointBuffer } from './sqlitePointBuffer';
export { deliverFixes, onLocationFixes, persistFixes } from './backgroundLocation';
export type { FixListener } from './backgroundLocation';
export type { SqlDatabase, SqlValue } from './sqlDatabase';
