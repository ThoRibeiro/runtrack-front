import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backoffDelay, type Cancel } from '@runtrack/core';
import { useRuntime } from '../runtime/RuntimeProvider';
import { queryKeys } from '../query/keys';
import { useSessionStatus } from '../session/SessionProvider';

/**
 * The inbox, live (§12).
 *
 * What it does is small and what it deliberately does **not** do is the point:
 *
 *  - it never shows a system banner. §12: "l'application au premier plan
 *    n'affiche pas de bannière système : elle met à jour la pastille et l'écran
 *    concerné". So an arriving notification invalidates two queries and
 *    nothing else — the badge changes, an open inbox refreshes, and a runner
 *    reading a screen is not interrupted by the operating system;
 *  - it holds no state. The notifications themselves come from the inbox
 *    query, which is server state — §9 forbids copying that into a store, and
 *    a stream that kept its own list would be exactly that copy.
 *
 * Reconnection reuses §7's backoff with jitter. Without the jitter, every
 * client reconnects in the same second after a deployment.
 */
export function NotificationStreamProvider({ children }: { children: ReactNode }): ReactNode {
  const runtime = useRuntime();
  const client = useQueryClient();
  const status = useSessionStatus();
  const lastEventId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // An inbox belongs to an account: there is nothing to open without one.
    if (status !== 'authenticated') return undefined;

    let subscription: { close: () => void } | undefined;
    let retry: Cancel | undefined;
    let attempts = 0;
    let stopped = false;

    const refresh = (): void => {
      void client.invalidateQueries({ queryKey: queryKeys.unreadCount });
      void client.invalidateQueries({ queryKey: queryKeys.notifications });
    };

    const connect = (): void => {
      if (stopped) return;
      subscription = runtime.notificationStream.open({
        lastEventId: lastEventId.current,
        onMessage: (message) => {
          // The id advances even for an event this build ignores: resuming
          // from an older one makes the server replay everything in between.
          if (message.id !== undefined) lastEventId.current = message.id;
          attempts = 0;
          // A heartbeat's only job is to have arrived.
          if (message.event === 'notification') refresh();
        },
        onError: () => {
          subscription?.close();
          subscription = undefined;
          const delay = backoffDelay(attempts, runtime.random);
          attempts += 1;
          retry = runtime.scheduler.after(delay, connect);
        },
      });
    };

    connect();

    return () => {
      stopped = true;
      retry?.();
      subscription?.close();
    };
  }, [runtime, client, status]);

  return children;
}
