import * as SQLite from 'expo-sqlite';
import type { SqlDatabase, SqlValue } from './sqlDatabase';
import { SqlitePointBuffer } from './sqlitePointBuffer';

/**
 * The real database, on a device.
 *
 * One file, opened once at launch and never closed: §6 wants a fix written
 * before anything else happens to it, and re-opening a database on every point
 * would put a file system round-trip in that path.
 *
 * The adaptation below is written method by method rather than asserted:
 * `expo-sqlite` types its parameter lists as required and variadic, which is
 * not quite the shape the buffer declares, and a cast would hide the day one of
 * these signatures changes (§15).
 */
export const DATABASE_NAME = 'runtrack-recording.db';

export function adapt(database: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: async (sql, params: readonly SqlValue[] = []) => {
      await database.runAsync(sql, [...params]);
    },
    getAllAsync: <Row>(sql: string, params: readonly SqlValue[] = []) =>
      database.getAllAsync<Row>(sql, [...params]),
    getFirstAsync: <Row>(sql: string, params: readonly SqlValue[] = []) =>
      database.getFirstAsync<Row>(sql, [...params]),
  };
}

export async function openRecordingDatabase(): Promise<SqlitePointBuffer> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return SqlitePointBuffer.open(adapt(database));
}
