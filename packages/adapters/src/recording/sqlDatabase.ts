/**
 * The slice of a SQLite driver the buffer uses.
 *
 * It is `expo-sqlite`'s own shape, written out here so that the buffer can be
 * tested against a real SQLite engine rather than a hand-written double. §13
 * asks for "kill de l'app, reprise, rejeu, purge après accusé" to be tested,
 * and a double that answers whatever the test wants proves none of that: the
 * bugs in a buffer are in the SQL — a `<` where a `<=` belongs, a counter reset
 * by a purge — and only an engine catches those.
 */
export type SqlValue = string | number | null;

export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly SqlValue[]): Promise<void>;
  getAllAsync<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
  getFirstAsync<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row | null>;
}
