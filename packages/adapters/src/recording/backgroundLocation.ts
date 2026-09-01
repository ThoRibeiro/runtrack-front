import type { LocationFix, PointBuffer } from '@runtrack/core';

/**
 * The bridge between a background task and the running application, and the
 * one place where §6's promise — "une application tuée par le système ne doit
 * rien perdre" — is actually kept.
 *
 * The problem it solves: on Android and iOS, location updates are delivered to
 * a **task**, not to a component. When the app is alive that task can hand the
 * fixes to whoever is listening. When the system has killed the app and
 * relaunched only the JavaScript to run the task, nobody is listening — the
 * module has just been re-imported, the recorder does not exist, and the fix
 * would be dropped.
 *
 * So the task has two modes, and this decides between them: **deliver if
 * someone is there, persist if nobody is**. The persisting path needs nothing
 * but the buffer: the activity in progress is in the buffer's own table, the
 * sequence number comes from it, and sending is somebody else's problem for
 * later. That is exactly why §6 puts the buffer before the network.
 */
export type FixListener = (fixes: readonly LocationFix[]) => void;

const listeners = new Set<FixListener>();

export function onLocationFixes(listener: FixListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True when a live application took the fixes; false when nobody was there. */
export function deliverFixes(fixes: readonly LocationFix[]): boolean {
  if (listeners.size === 0 || fixes.length === 0) return false;
  for (const listener of listeners) listener(fixes);
  return true;
}

/**
 * The fallback: write straight to the buffer, for the run the buffer says is in
 * progress. Reserves each number before writing, exactly as the recorder does —
 * the number carries idempotency, and skipping it here would break the run
 * silently from the first background delivery.
 */
export async function persistFixes(
  buffer: PointBuffer,
  fixes: readonly LocationFix[],
): Promise<number> {
  if (fixes.length === 0) return 0;

  const recording = await buffer.interrupted();
  // No run in progress: updates that outlived their activity. Dropping them is
  // right — they belong to nothing.
  if (recording === undefined) return 0;

  let written = 0;
  for (const fix of fixes) {
    const sequenceNumber = await buffer.reserveSequenceNumber(recording.activityId);
    await buffer.append(recording.activityId, { ...fix, sequenceNumber });
    written += 1;
  }
  return written;
}
