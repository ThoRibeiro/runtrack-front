import type { Millis } from './duration';

/** Cancels a scheduled callback. Calling it twice is harmless. */
export type Cancel = () => void;

/**
 * Deferred execution as a port. `setTimeout` exists everywhere, but a use case
 * that calls it directly cannot be tested without waiting in real time — and
 * §7's watchdog waits 45 seconds, §6's flush waits 10.
 */
export interface Scheduler {
  after(delay: Millis, run: () => void): Cancel;
  every(interval: Millis, run: () => void): Cancel;
}

/** A scheduler the tests drive by hand, alongside `FixedClock`. */
export class ManualScheduler implements Scheduler {
  private nextId = 0;
  private readonly pending = new Map<
    number,
    { dueAt: Millis; interval: Millis | undefined; run: () => void }
  >();
  private now: Millis = 0;

  after(delay: Millis, run: () => void): Cancel {
    return this.schedule(delay, undefined, run);
  }

  every(interval: Millis, run: () => void): Cancel {
    return this.schedule(interval, interval, run);
  }

  private schedule(delay: Millis, interval: Millis | undefined, run: () => void): Cancel {
    const id = this.nextId++;
    this.pending.set(id, { dueAt: this.now + delay, interval, run });
    return () => {
      this.pending.delete(id);
    };
  }

  /** Moves time forward and runs whatever came due, in order. */
  advanceBy(elapsed: Millis): void {
    const target = this.now + elapsed;
    for (;;) {
      const due = [...this.pending.entries()]
        .filter(([, task]) => task.dueAt <= target)
        .sort((a, b) => a[1].dueAt - b[1].dueAt)[0];
      if (due === undefined) break;

      const [id, task] = due;
      this.now = task.dueAt;
      if (task.interval === undefined) this.pending.delete(id);
      else this.pending.set(id, { ...task, dueAt: task.dueAt + task.interval });
      task.run();
    }
    this.now = target;
  }

  get scheduledCount(): number {
    return this.pending.size;
  }
}
