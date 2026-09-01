import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  Recorder,
  type Activity,
  type ActivityStats,
  type ActivityType,
  type Cancel,
  type InterruptedRecording,
  type RecordingWarning,
  type Visibility,
} from '@runtrack/core';
import type { Runtime } from '../runtime/runtime';

/**
 * The client-side state of a run in progress (§9: session, theme, activity in
 * progress — and nothing that comes from the server).
 *
 * The store owns two things the `Recorder` deliberately does not:
 *
 *  - **the flush schedule.** §6 says every five to ten seconds, or when the
 *    network comes back. Batching belongs to the recorder; *when* belongs here,
 *    because it is a platform concern — a timer and a connectivity listener;
 *  - **what the screen is allowed to see.** A recorder is an object with
 *    methods; a screen needs a value that changes.
 *
 * There is no `positions` field, and that is on purpose: the trace is drawn on
 * the map imperatively, exactly as in §7. A run of three hours would otherwise
 * put ten thousand points through React.
 */
export type RecordingStatus =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'finishing'
  /** The permission was refused, or the phone's clock is unusable. */
  | 'refused';

export type RecordingRefusal = 'permission' | 'clock';

export interface ResumableRecording {
  recording: InterruptedRecording;
  pendingCount: number;
}

export interface RecordingState {
  status: RecordingStatus;
  activity: Activity | undefined;
  stats: ActivityStats | undefined;
  warnings: readonly RecordingWarning[];
  refusal: RecordingRefusal | undefined;
  /** A run a crash left behind, offered at launch (§6). */
  resumable: ResumableRecording | undefined;

  lookForInterrupted: () => Promise<void>;
  start: (command: { type: ActivityType; title: string; visibility: Visibility }) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<Activity | undefined>;
  discard: () => Promise<void>;
  resumeInterrupted: () => Promise<void>;
  /** Sends what is buffered, then forgets the run. */
  dropInterrupted: () => Promise<void>;
}

export type RecordingStore = StoreApi<RecordingState>;

/** §6: "toutes les 5 à 10 secondes". Seven is inside it and not on a boundary. */
export const FLUSH_INTERVAL_MILLIS = 7_000;

export function createRecordingStore(runtime: Runtime): RecordingStore {
  const capability = runtime.recording;
  if (capability === undefined) {
    // §2: the web does not record, and a store that pretends otherwise would
    // produce the greyed-out "démarrer une course" button the brief forbids.
    throw new Error('Cette plateforme n’enregistre pas de course.');
  }

  const recorder = new Recorder({
    gateway: runtime.activities,
    buffer: capability.buffer,
    tracker: capability.tracker,
    clock: runtime.clock,
  });

  let stopFlushing: Cancel | undefined;
  let stopWatchingNetwork: (() => void) | undefined;

  return createStore<RecordingState>((set) => {
    /**
     * One flush. Failures are swallowed on purpose: a batch that does not go
     * through stays in the buffer and leaves again on the next beat — that is
     * the entire offline story of §9, and surfacing an error for it would
     * teach the runner to ignore errors.
     */
    const flush = async (): Promise<void> => {
      try {
        const warnings = await recorder.flush();
        set({ warnings, stats: recorder.stats });
      } catch {
        // Nothing is lost: the points are still buffered.
        set({ warnings: [{ kind: 'points-pending', count: 0 }] });
      }
    };

    const beat = (): void => {
      stopFlushing?.();
      stopWatchingNetwork?.();
      stopFlushing = runtime.scheduler.every(FLUSH_INTERVAL_MILLIS, () => {
        void flush();
      });
      // §6: "ou au retour du réseau". Leaving a tunnel with two minutes of
      // points buffered should not wait for the next tick.
      stopWatchingNetwork = capability.network.onRestored(() => {
        void flush();
      });
    };

    const stopBeating = (): void => {
      stopFlushing?.();
      stopWatchingNetwork?.();
      stopFlushing = undefined;
      stopWatchingNetwork = undefined;
    };

    return {
      status: 'idle',
      activity: undefined,
      stats: undefined,
      warnings: [],
      refusal: undefined,
      resumable: undefined,

      lookForInterrupted: async () => {
        set({ resumable: await recorder.resumable() });
      },

      start: async (command) => {
        set({ status: 'starting', refusal: undefined, warnings: [] });
        const outcome = await recorder.start({ ...command });

        if (outcome.kind === 'permission-refused') {
          set({ status: 'refused', refusal: 'permission' });
          return;
        }
        if (outcome.kind === 'clock-unusable') {
          set({ status: 'refused', refusal: 'clock' });
          return;
        }

        beat();
        set({
          status: 'recording',
          activity: outcome.state.activity,
          stats: recorder.stats,
          warnings: outcome.state.warnings,
          resumable: undefined,
        });
      },

      pause: async () => {
        const paused = await recorder.pause();
        // The beat keeps going while paused: points captured before the pause
        // may still be owed to the server.
        set({ status: 'paused', activity: paused });
      },

      resume: async () => {
        const resumed = await recorder.resume();
        set({ status: 'recording', activity: resumed });
      },

      finish: async () => {
        set({ status: 'finishing' });
        const finished = await recorder.finish();
        stopBeating();
        set({ status: 'idle', activity: undefined, stats: undefined, warnings: [] });
        return finished;
      },

      discard: async () => {
        await recorder.discard();
        stopBeating();
        set({ status: 'idle', activity: undefined, stats: undefined, warnings: [] });
      },

      resumeInterrupted: async () => {
        const offered = await recorder.resumable();
        if (offered === undefined) return;

        const state = await recorder.resumeInterrupted(offered.recording);
        if (state === undefined) {
          // Finished or discarded server-side while the phone was off. The
          // recorder has already flushed what was left.
          set({ status: 'idle', resumable: undefined });
          return;
        }

        beat();
        set({
          status: 'recording',
          activity: state.activity,
          stats: recorder.stats,
          warnings: state.warnings,
          resumable: undefined,
        });
      },

      dropInterrupted: async () => {
        const offered = await recorder.resumable();
        if (offered !== undefined) {
          // Resumed only to be let go: the flush inside `resumeInterrupted`
          // is what sends the points a crash left behind, and dropping them
          // unsent would lose the end of a run for nothing.
          await recorder.resumeInterrupted(offered.recording);
          await recorder.discard();
        }
        stopBeating();
        set({ status: 'idle', resumable: undefined, activity: undefined });
      },
    };
  });
}
