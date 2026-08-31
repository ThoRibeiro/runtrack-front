import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { useRuntime } from '../runtime/RuntimeProvider';
import { createSessionStore, type SessionState, type SessionStore } from './sessionStore';

const SessionContext = createContext<SessionStore | undefined>(undefined);

/**
 * Restoring the session is the one `useEffect` in this package, and it is not
 * a data fetch: it reads the Keychain once at launch, it has no cache, no
 * invalidation and no server behind it. §1 forbids `useEffect` **pour aller
 * chercher des données** — this is the mount-once side effect the rule leaves
 * in place, and there is exactly one of it.
 */
export function SessionProvider({ children }: { children: ReactNode }): ReactNode {
  const runtime = useRuntime();
  const store = useMemo(() => createSessionStore(runtime), [runtime]);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    void store.getState().restore();
  }, [store]);

  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
}

function useSessionStore(): SessionStore {
  const store = useContext(SessionContext);
  if (store === undefined) throw new Error('useSession hors d’un SessionProvider');
  return store;
}

export function useSession<T>(select: (state: SessionState) => T): T {
  return useStore(useSessionStore(), select);
}

export function useSessionStatus(): SessionState['status'] {
  return useSession((state) => state.status);
}

export function useSessionActions(): Pick<SessionState, 'adopt' | 'signOut' | 'restore'> {
  const store = useSessionStore();
  const adopt = useStore(store, (state) => state.adopt);
  const signOut = useStore(store, (state) => state.signOut);
  const restore = useStore(store, (state) => state.restore);
  return { adopt, signOut, restore };
}
