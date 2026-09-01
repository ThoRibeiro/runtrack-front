import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Visibility } from '@runtrack/core';
import type { KeyValueStore } from '../query/persistence';

/**
 * The client-side preferences (§9: a light store for client state only).
 *
 * Three things live here, and none of them is server state:
 *
 *  - **the theme.** "System" is a real third value, not the absence of a
 *    choice: a runner who picked dark once should stay dark when their phone
 *    switches at sunset, and one who picked nothing should follow it;
 *  - **whether the welcome screen has been seen.** It is what makes it show
 *    once, on a fresh install, and never again;
 *  - **the default visibility of a new activity.** The *account's* visibility is
 *    the server's business; this is the value the recorder starts from, and it
 *    belongs to the phone.
 *
 * It is written through the same key/value store as the query cache — one
 * storage abstraction, two users — and every failure to read or write is
 * swallowed: a preference that cannot be saved costs a re-pick, and crashing
 * over it would be absurd.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: ThemeChoice;
  welcomeSeen: boolean;
  defaultVisibility: Visibility;
}

export interface PreferencesState extends Preferences {
  /** Reads the store once, at launch. */
  restore: () => Promise<void>;
  /** True until `restore` has answered — see the comment on `SessionStatus`. */
  loading: boolean;
  setTheme: (theme: ThemeChoice) => Promise<void>;
  setDefaultVisibility: (visibility: Visibility) => Promise<void>;
  markWelcomeSeen: () => Promise<void>;
}

export type PreferencesStore = StoreApi<PreferencesState>;

export const PREFERENCES_KEY = 'runtrack-preferences';

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  welcomeSeen: false,
  // Fails closed, like every visibility in this application: a run nobody chose
  // to publish is shown to followers, not to the world.
  defaultVisibility: 'FOLLOWERS',
};

const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
const VISIBILITIES: readonly Visibility[] = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'];

/**
 * Reads stored preferences, field by field.
 *
 * Anything unrecognised falls back to its default rather than being trusted: an
 * older build, a hand-edited value or a half-written file must not put the
 * application in a state it has no code for.
 */
export function parsePreferences(raw: string | null): Preferences {
  if (raw === null) return DEFAULT_PREFERENCES;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;

    // `Reflect.get` is typed `any`; narrowing to `unknown` at the boundary is
    // what makes the fallbacks below actual checks rather than decoration.
    const theme: unknown = Reflect.get(parsed, 'theme');
    const visibility: unknown = Reflect.get(parsed, 'defaultVisibility');
    const seen: unknown = Reflect.get(parsed, 'welcomeSeen');

    return {
      theme: THEMES.find((candidate) => candidate === theme) ?? DEFAULT_PREFERENCES.theme,
      welcomeSeen: seen === true,
      defaultVisibility:
        VISIBILITIES.find((candidate) => candidate === visibility) ??
        DEFAULT_PREFERENCES.defaultVisibility,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function createPreferencesStore(store: KeyValueStore): PreferencesStore {
  return createStore<PreferencesState>((set, get) => {
    const write = async (next: Preferences): Promise<void> => {
      try {
        await store.setItem(PREFERENCES_KEY, JSON.stringify(next));
      } catch {
        // A preference that cannot be saved costs a re-pick.
      }
    };

    const update = async (change: Partial<Preferences>): Promise<void> => {
      const { theme, welcomeSeen, defaultVisibility } = get();
      const next: Preferences = { theme, welcomeSeen, defaultVisibility, ...change };
      set(next);
      await write(next);
    };

    return {
      ...DEFAULT_PREFERENCES,
      loading: true,

      restore: async () => {
        try {
          const raw = await store.getItem(PREFERENCES_KEY);
          set({ ...parsePreferences(raw), loading: false });
        } catch {
          set({ ...DEFAULT_PREFERENCES, loading: false });
        }
      },

      setTheme: (theme: ThemeChoice) => update({ theme }),
      setDefaultVisibility: (defaultVisibility: Visibility) => update({ defaultVisibility }),
      markWelcomeSeen: () => update({ welcomeSeen: true }),
    };
  });
}
