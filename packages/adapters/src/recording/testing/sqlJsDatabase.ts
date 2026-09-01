import initSqlJs, { type Database } from 'sql.js';
import type { SqlDatabase, SqlValue } from '../sqlDatabase';

/**
 * A real SQLite engine, in memory, for the buffer's tests.
 *
 * `sql.js` is SQLite compiled to WebAssembly: same parser, same semantics, no
 * native build step. It is a development dependency and never reaches a bundle —
 * on a device the same class of object comes from `expo-sqlite`.
 *
 * Testing the buffer against a double instead would prove nothing: what breaks
 * in a write-ahead buffer is the SQL itself, and a double agrees with whatever
 * the test already believes.
 */
export class SqlJsDatabase implements SqlDatabase {
  private constructor(private db: Database) {}

  static async open(): Promise<SqlJsDatabase> {
    const engine = await initSqlJs();
    return new SqlJsDatabase(new engine.Database());
  }

  /**
   * Closes and re-opens on the same bytes — the phone being killed and
   * relaunched. §13: "kill de l'app, reprise, rejeu, purge après accusé".
   */
  async restart(): Promise<void> {
    const bytes = this.db.export();
    this.db.close();
    const engine = await initSqlJs();
    this.db = new engine.Database(bytes);
  }

  execAsync(sql: string): Promise<void> {
    // `PRAGMA journal_mode = WAL` is meaningless in memory and sql.js rejects
    // it; the rest of the schema is ordinary DDL.
    this.db.exec(sql.replace(/PRAGMA[^;]+;/g, ''));
    return Promise.resolve();
  }

  runAsync(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    this.db.run(sql, [...params]);
    return Promise.resolve();
  }

  getAllAsync<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
    const statement = this.db.prepare(sql);
    statement.bind([...params]);
    const rows: Row[] = [];
    while (statement.step()) {
      // `getAsObject` is typed as a record of SQL values, which is what a
      // driver returns; the row shape is asserted by the test that reads it.
      // This is the same boundary conversion `HttpClient` makes, in a double.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const row = statement.getAsObject() as Row;
      rows.push(row);
    }
    statement.free();
    return Promise.resolve(rows);
  }

  async getFirstAsync<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> {
    const rows = await this.getAllAsync<Row>(sql, params);
    return rows[0] ?? null;
  }
}
