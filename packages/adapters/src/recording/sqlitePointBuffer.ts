import type { ActivityId, InterruptedRecording, PointBuffer, RecordedPoint } from '@runtrack/core';
import { activityId as toActivityId } from '@runtrack/core';
import type { SqlDatabase } from './sqlDatabase';

/**
 * The persistent buffer of §6: **points go to SQLite first, never to memory**.
 *
 * That sentence is the whole design. A run lasts up to three hours with the
 * screen locked, and an application the system kills mid-run must lose nothing —
 * so a fix is written before it is anything else, and sending is a separate
 * concern that happens later, or not at all.
 *
 * Two columns carry more weight than they look:
 *
 *  - **`next_sequence` lives beside the recording, not in memory.** §6 requires
 *    the sequence number to survive a kill, because it is what carries
 *    idempotency server-side: a restarted app that began again at zero would
 *    have its points rejected as duplicates, silently, for the rest of the run;
 *  - **a purge never touches it.** Purging is about what the server has
 *    acknowledged; numbering is about what the phone has captured. Tying the
 *    two together is the classic way to lose a run to a tunnel.
 */
interface PointRow {
  sequence_number: number;
  latitude: number;
  longitude: number;
  elevation: number;
  recorded_at: number;
  accuracy: number;
  heart_rate: number | null;
  cadence: number | null;
}

interface RecordingRow {
  activity_id: string;
  skew_offset: number;
  started_at: number;
}

interface CountRow {
  total: number;
}

interface SequenceRow {
  next_sequence: number;
}

export const SCHEMA = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS recordings (
    activity_id TEXT PRIMARY KEY,
    skew_offset INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    next_sequence INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS points (
    activity_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation REAL NOT NULL,
    recorded_at INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    heart_rate INTEGER,
    cadence INTEGER,
    PRIMARY KEY (activity_id, sequence_number)
  );
`;

export class SqlitePointBuffer implements PointBuffer {
  constructor(private readonly db: SqlDatabase) {}

  /** Idempotent: called at every launch, including the ones that find a run. */
  static async open(db: SqlDatabase): Promise<SqlitePointBuffer> {
    await db.execAsync(SCHEMA);
    return new SqlitePointBuffer(db);
  }

  /**
   * Reserves the next number, in one statement.
   *
   * `UPDATE … RETURNING` rather than a read followed by a write: two fixes can
   * be reserved from different turns of the event loop, and a read-then-write
   * hands them the same number — two points with the same sequence, one of
   * which the server drops as a duplicate.
   *
   * The row is created if it is missing, so a fix that arrives before
   * `remember` still gets a number rather than throwing away a position.
   */
  async reserveSequenceNumber(activity: ActivityId): Promise<number> {
    await this.db.runAsync(
      `INSERT INTO recordings (activity_id, skew_offset, started_at, next_sequence)
       VALUES (?, 0, 0, 0)
       ON CONFLICT(activity_id) DO NOTHING`,
      [activity],
    );

    const row = await this.db.getFirstAsync<SequenceRow>(
      `UPDATE recordings SET next_sequence = next_sequence + 1
       WHERE activity_id = ?
       RETURNING next_sequence - 1 AS next_sequence`,
      [activity],
    );

    if (row === null) throw new Error('Numéro de séquence non réservé.');
    return row.next_sequence;
  }

  async append(activity: ActivityId, point: RecordedPoint): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO points (
         activity_id, sequence_number, latitude, longitude, elevation,
         recorded_at, accuracy, heart_rate, cadence
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(activity_id, sequence_number) DO NOTHING`,
      [
        activity,
        point.sequenceNumber,
        point.position.latitude,
        point.position.longitude,
        point.elevationMetres,
        point.recordedAt,
        point.accuracyMetres,
        point.heartRate ?? null,
        point.cadence ?? null,
      ],
    );
  }

  async pending(activity: ActivityId, limit: number): Promise<readonly RecordedPoint[]> {
    const rows = await this.db.getAllAsync<PointRow>(
      `SELECT sequence_number, latitude, longitude, elevation, recorded_at,
              accuracy, heart_rate, cadence
       FROM points WHERE activity_id = ?
       ORDER BY sequence_number ASC LIMIT ?`,
      [activity, limit],
    );
    return rows.map(toRecordedPoint);
  }

  async pendingCount(activity: ActivityId): Promise<number> {
    const row = await this.db.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS total FROM points WHERE activity_id = ?',
      [activity],
    );
    return row?.total ?? 0;
  }

  /**
   * Up to and including — `<=`, and the server's `lastAcceptedSequence` is the
   * last number it *took*. A `<` here leaves one point behind forever; a purge
   * past it throws away a point nobody has acknowledged.
   */
  async purgeUpTo(activity: ActivityId, sequenceNumber: number): Promise<void> {
    await this.db.runAsync('DELETE FROM points WHERE activity_id = ? AND sequence_number <= ?', [
      activity,
      sequenceNumber,
    ]);
  }

  async interrupted(): Promise<InterruptedRecording | undefined> {
    // The most recent one. There should only ever be one — a phone records a
    // single run at a time — but "should" is not a guarantee worth relying on
    // after a crash.
    const row = await this.db.getFirstAsync<RecordingRow>(
      'SELECT activity_id, skew_offset, started_at FROM recordings ORDER BY started_at DESC LIMIT 1',
    );
    if (row === null) return undefined;

    return {
      activityId: toActivityId(row.activity_id),
      skew: { offset: row.skew_offset },
      startedAt: row.started_at,
    };
  }

  /**
   * Records that a run is in progress. Deliberately leaves `next_sequence`
   * alone on conflict: resuming an interrupted run must continue its numbering,
   * not restart it.
   */
  async remember(recording: InterruptedRecording): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO recordings (activity_id, skew_offset, started_at, next_sequence)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(activity_id) DO UPDATE
       SET skew_offset = excluded.skew_offset, started_at = excluded.started_at`,
      [recording.activityId, recording.skew.offset, recording.startedAt],
    );
  }

  async forget(activity: ActivityId): Promise<void> {
    await this.db.runAsync('DELETE FROM points WHERE activity_id = ?', [activity]);
    await this.db.runAsync('DELETE FROM recordings WHERE activity_id = ?', [activity]);
  }
}

function toRecordedPoint(row: PointRow): RecordedPoint {
  return {
    sequenceNumber: row.sequence_number,
    position: { latitude: row.latitude, longitude: row.longitude },
    elevationMetres: row.elevation,
    recordedAt: row.recorded_at,
    accuracyMetres: row.accuracy,
    heartRate: row.heart_rate ?? undefined,
    cadence: row.cadence ?? undefined,
  };
}
