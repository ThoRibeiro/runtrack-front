import type { ActivityId, InterruptedRecording, PointBuffer, RecordedPoint } from '@runtrack/core';

/**
 * A buffer that is still opening.
 *
 * Opening a SQLite file is asynchronous; building the runtime is not — it
 * happens at module load, before anything is rendered. Rather than making the
 * whole composition root asynchronous (and every screen wait on it), the buffer
 * is handed the promise and awaits it on each call.
 *
 * The cost is one already-resolved `await` per point after the first, which is
 * a microtask. The alternative — a buffer that is `undefined` for the first few
 * hundred milliseconds — puts a null check in the one path §6 says must never
 * drop anything.
 */
export class LazyPointBuffer implements PointBuffer {
  constructor(private readonly opening: Promise<PointBuffer>) {}

  async reserveSequenceNumber(activity: ActivityId): Promise<number> {
    return (await this.opening).reserveSequenceNumber(activity);
  }

  async append(activity: ActivityId, point: RecordedPoint): Promise<void> {
    await (await this.opening).append(activity, point);
  }

  async pending(activity: ActivityId, limit: number): Promise<readonly RecordedPoint[]> {
    return (await this.opening).pending(activity, limit);
  }

  async pendingCount(activity: ActivityId): Promise<number> {
    return (await this.opening).pendingCount(activity);
  }

  async purgeUpTo(activity: ActivityId, sequenceNumber: number): Promise<void> {
    await (await this.opening).purgeUpTo(activity, sequenceNumber);
  }

  async interrupted(): Promise<InterruptedRecording | undefined> {
    return (await this.opening).interrupted();
  }

  async remember(recording: InterruptedRecording): Promise<void> {
    await (await this.opening).remember(recording);
  }

  async forget(activity: ActivityId): Promise<void> {
    await (await this.opening).forget(activity);
  }
}
