import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Session } from '@runtrack/core';
import type { Runtime } from '../runtime/runtime';

/**
 * §9: a light store for **client** state only — session, theme, activity in
 * progress. Nothing that comes from the server lives here; that is TanStack
 * Query's job, and copying it would create the inconsistency §9 warns about.
 *
 * `status` is three-valued on purpose. "Not authenticated" and "we have not
 * looked yet" are different things: conflating them redirects to the sign-in
 * screen for a fraction of a second on every cold start, which reads as a bug.
 */
export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

export interface SessionState {
  status: SessionStatus;
  session: Session | undefined;
  /** Reads the secure store once, at launch. */
  restore: () => Promise<void>;
  adopt: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

export type SessionStore = StoreApi<SessionState>;

export function createSessionStore(runtime: Runtime): SessionStore {
  return createStore<SessionState>((set, get) => ({
    status: 'restoring',
    session: undefined,

    restore: async () => {
      const session = await runtime.sessions.load();
      set(
        session === undefined
          ? { status: 'anonymous', session: undefined }
          : { status: 'authenticated', session },
      );
    },

    adopt: async (session: Session) => {
      await runtime.sessions.replace(session);
      set({ status: 'authenticated', session });
    },

    signOut: async () => {
      const current = get().session;
      // The screen must land on the sign-in page whatever the server says: a
      // logout that fails on the network is still a logout as far as this
      // device is concerned.
      if (current !== undefined) {
        try {
          await runtime.auth.logOut(current.refreshToken);
        } catch {
          // Deliberately swallowed — and the local session is cleared below,
          // which is the part that matters. Not an empty catch: the recovery
          // *is* the next two lines.
        }
      }
      await runtime.sessions.clear();
      set({ status: 'anonymous', session: undefined });
    },
  }));
}
