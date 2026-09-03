import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  Recorder,
  type Activity,
  type ActivityStats,
  type ActivityType,
  type Cancel,
  type GeoPoint,
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
 * put ten thousand points through React. `trace` and `onPoint` are how a map
 * gets at it — a snapshot to draw on mount, then a subscription — and neither
 * of them changes when a point arrives, so neither re-renders anything.
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
  /**
   * Whether the system will still show the permission dialog. False once the
   * runner has refused outright — the only way back is the settings app, and
   * offering a button that opens nothing is worse than saying so.
   */
  canAskPermissionAgain: boolean;
  /** A run a crash left behind, offered at launch (§6). */
  resumable: ResumableRecording | undefined;

  /** The run so far, read when a map mounts. Never rendered (§7). */
  trace: () => readonly GeoPoint[];
  /** Each position as it is captured, straight to the map. */
  onPoint: (listener: (point: GeoPoint) => void) => Cancel;

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
        // Rien n'est perdu : les points restent dans le tampon. Mais le nombre
        // affiché est le vrai — « 0 point en attente » après un envoi qui vient
        // d'échouer était un chiffre faux, et il masquait la panne.
        set({ warnings: [{ kind: 'points-pending', count: await recorder.pendingCount() }] });
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
      stopWatchingNetwork = runtime.network.onRestored(() => {
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
      canAskPermissionAgain: true,
      resumable: undefined,

      trace: () => recorder.trace,
      onPoint: (listener) => recorder.onPointRecorded(listener),

      lookForInterrupted: async () => {
        set({ resumable: await recorder.resumable() });
      },

      start: async (command) => {
        set({ status: 'starting', refusal: undefined, warnings: [] });
        const outcome = await recorder.start({ ...command });

        if (outcome.kind === 'permission-refused') {
          // "While in use" is a half-yes: the background dialog has not been
          // answered yet, so asking again is a dialog, not a dead end.
          set({
            status: 'refused',
            refusal: 'permission',
            canAskPermissionAgain: outcome.permission !== 'denied',
          });
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
        // `resumable` repart à zéro : la course qu'on vient de terminer n'a plus
        // rien à reprendre, et la laisser afficherait « une course était en
        // cours » sur l'écran de départ, juste après l'avoir finie.
        set({
          status: 'idle',
          activity: undefined,
          stats: undefined,
          warnings: [],
          resumable: undefined,
        });
        return finished;
      },

      discard: async () => {
        await recorder.discard();
        stopBeating();
        set({
          status: 'idle',
          activity: undefined,
          stats: undefined,
          warnings: [],
          resumable: undefined,
        });
      },

      resumeInterrupted: async () => {
        const offered = await recorder.resumable();
        if (offered === undefined) return;

        let state;
        try {
          state = await recorder.resumeInterrupted(offered.recording);
        } catch {
          // §15 : le catch a une raison. La course est injoignable — hors ligne,
          // ou supprimée côté serveur — et laisser l'erreur remonter afficherait
          // « une course était en cours » indéfiniment. On lâche prise, en
          // gardant les points : `dropInterrupted` est le geste qui les efface.
          set({ status: 'idle', resumable: undefined });
          return;
        }

        if (state === undefined) {
          // Finished or discarded server-side while the phone was off. The
          // recorder has already flushed what it could, and forgotten the rest.
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
        // Ce qui peut encore partir part — la fin d'une vraie course a de la
        // valeur — mais le tampon est vidé même si le serveur refuse tout.
        if (offered !== undefined) await recorder.dropInterrupted(offered.recording);
        stopBeating();
        set({ status: 'idle', resumable: undefined, activity: undefined });
      },
    };
  });
}
