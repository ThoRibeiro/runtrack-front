import { useEffect, useState, type ReactNode } from 'react';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { Persister } from '@tanstack/query-persist-client-core';
import { useRuntime } from '../runtime/RuntimeProvider';
import { shouldPersistQuery } from './persistence';

/**
 * The offline half of §9, in one place.
 *
 * Two things happen here, and both are about telling the truth:
 *
 *  - **TanStack Query is told whether there is a network.** Its `onlineManager`
 *    defaults to a browser listener that does not exist in React Native, so
 *    without this a phone in a tunnel keeps firing requests and every screen
 *    spins. Wired to the `NetworkMonitor` port, a paused query is *knowably*
 *    paused, which is what lets a screen say "hors ligne" instead;
 *  - **what was already read stays readable**, and only that: the last feed
 *    page and the activities already opened (§9), through an allow-list.
 *
 * `maxAge` is a day. Longer and a runner opens the application to a feed from
 * last week presented as current; shorter and the offline story stops working
 * on the commute home.
 */
const CACHE_MAX_AGE_MILLIS = 24 * 60 * 60 * 1000;

export interface OfflineProviderProps {
  client: QueryClient;
  persister: Persister;
  children: ReactNode;
}

export function OfflineProvider({ client, persister, children }: OfflineProviderProps): ReactNode {
  const runtime = useRuntime();

  useEffect(() => {
    let alive = true;

    // The manager's own listener is browser-only. Setting it from the port is
    // what makes "paused" mean the same thing on both shells.
    void runtime.network.isConnected().then((connected) => {
      if (alive) onlineManager.setOnline(connected);
    });

    const stop = runtime.network.onRestored(() => {
      onlineManager.setOnline(true);
    });

    return () => {
      alive = false;
      stop();
    };
  }, [runtime]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MILLIS,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * Whether the application currently believes it has a network.
 *
 * Reads the same manager TanStack Query pauses on, so a screen and its queries
 * can never disagree — which is the bug this replaces: a banner saying
 * "connecté" over a list that has been waiting for two minutes.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  return online;
}
