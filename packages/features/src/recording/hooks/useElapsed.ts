import { useEffect, useState } from 'react';
import { useRuntime } from '../../runtime/RuntimeProvider';

/**
 * The seconds since the run started, ticking once a second.
 *
 * The server's `elapsedSeconds` only moves when a batch lands — every seven
 * seconds — and a duration that jumps in seven-second steps reads as a frozen
 * screen. So the clock is local, and everything else on the screen is the
 * server's (§6: distance and pace are its figures, not a local sum).
 *
 * §14: one interface update per second at most, whatever the GPS does. This is
 * that one, and it is the only thing on the recording screen that re-renders.
 */
export function useElapsedSeconds(startedAt: number | undefined, running: boolean): number {
  const runtime = useRuntime();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === undefined) {
      return undefined;
    }

    const compute = (): number => Math.max(0, Math.round((runtime.clock.now() - startedAt) / 1000));
    if (!running) return undefined;

    const stop = runtime.scheduler.every(1_000, () => {
      setElapsed(compute());
    });
    return stop;
  }, [startedAt, running, runtime]);

  return elapsed;
}
