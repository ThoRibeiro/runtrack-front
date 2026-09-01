import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useStore } from 'zustand';
import type { ThemeName } from '@runtrack/ui';
import type { KeyValueStore } from '../query/persistence';
import {
  createPreferencesStore,
  type PreferencesState,
  type PreferencesStore,
} from './preferencesStore';

const PreferencesContext = createContext<PreferencesStore | undefined>(undefined);

/**
 * Reads the stored preferences once, at launch.
 *
 * Same exemption as `SessionProvider`: a mount-once read of local storage is
 * not the data fetch §1 forbids — there is no cache, no invalidation and no
 * server behind it.
 */
export function PreferencesProvider({
  storage,
  children,
}: {
  storage: KeyValueStore;
  children: ReactNode;
}): ReactNode {
  const store = useMemo(() => createPreferencesStore(storage), [storage]);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    void store.getState().restore();
  }, [store]);

  return <PreferencesContext.Provider value={store}>{children}</PreferencesContext.Provider>;
}

function usePreferencesStore(): PreferencesStore {
  const store = useContext(PreferencesContext);
  if (store === undefined) throw new Error('usePreferences hors d’un PreferencesProvider');
  return store;
}

export function usePreferences<T>(select: (state: PreferencesState) => T): T {
  return useStore(usePreferencesStore(), select);
}

export function usePreferenceActions(): Pick<
  PreferencesState,
  'setTheme' | 'setDefaultVisibility' | 'markWelcomeSeen'
> {
  const store = usePreferencesStore();
  return {
    setTheme: useStore(store, (state) => state.setTheme),
    setDefaultVisibility: useStore(store, (state) => state.setDefaultVisibility),
    markWelcomeSeen: useStore(store, (state) => state.markWelcomeSeen),
  };
}

/**
 * The theme to actually paint, from the choice and the system.
 *
 * "System" is resolved here rather than stored: a phone that switches at sunset
 * has to move the application with it, which a stored `'dark'` would not do.
 * The running theme is never returned — that screen picks it explicitly, and it
 * is the only one that does (§3).
 */
export function useResolvedTheme(): ThemeName {
  const choice = usePreferences((state) => state.theme);
  const system = useColorScheme();

  if (choice === 'light') return 'light';
  if (choice === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}
