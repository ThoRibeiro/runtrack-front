import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { useRuntime } from '../runtime/RuntimeProvider';
import { createRecordingStore, type RecordingState, type RecordingStore } from './recordingStore';

const RecordingContext = createContext<RecordingStore | undefined>(undefined);

/**
 * Mounted by the mobile shell only (§2).
 *
 * The one effect looks for a run a crash left behind, once, at launch. Same
 * exemption as `SessionProvider`: it is a mount-once read of local storage, not
 * a data fetch, and §6 requires it — "au lancement, si une course était en
 * cours, on la propose à la reprise".
 */
export function RecordingProvider({ children }: { children: ReactNode }): ReactNode {
  const runtime = useRuntime();
  const store = useMemo(() => createRecordingStore(runtime), [runtime]);
  const looked = useRef(false);

  useEffect(() => {
    if (looked.current) return;
    looked.current = true;
    void store.getState().lookForInterrupted();
  }, [store]);

  return <RecordingContext.Provider value={store}>{children}</RecordingContext.Provider>;
}

function useRecordingStore(): RecordingStore {
  const store = useContext(RecordingContext);
  if (store === undefined) throw new Error('useRecording hors d’un RecordingProvider');
  return store;
}

export function useRecording<T>(select: (state: RecordingState) => T): T {
  return useStore(useRecordingStore(), select);
}

export function useRecordingActions(): Pick<
  RecordingState,
  'start' | 'pause' | 'resume' | 'finish' | 'discard' | 'resumeInterrupted' | 'dropInterrupted'
> {
  const store = useRecordingStore();
  return {
    start: useStore(store, (state) => state.start),
    pause: useStore(store, (state) => state.pause),
    resume: useStore(store, (state) => state.resume),
    finish: useStore(store, (state) => state.finish),
    discard: useStore(store, (state) => state.discard),
    resumeInterrupted: useStore(store, (state) => state.resumeInterrupted),
    dropInterrupted: useStore(store, (state) => state.dropInterrupted),
  };
}
