import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { DevicePlatform } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';
import { useSessionStatus } from '../../session/SessionProvider';

/**
 * Push registration (§12).
 *
 * Two distinct moments, and conflating them is the mistake the brief warns
 * about:
 *
 *  - **at launch**, the token is re-registered *if permission already exists*.
 *    It changes on its own — a reinstall, a restored backup — and the server
 *    treats a repeat as a no-op. Nothing is asked, nothing is shown;
 *  - **when the runner asks for it**, after a screen has shown what
 *    notifications buy, the permission is requested. Never on first launch: the
 *    system dialog is one-shot, and a refusal on a prompt nobody understood
 *    only comes back through the settings app.
 */
export type PushState = 'unsupported' | 'unknown' | 'registered' | 'refused';

function platformOf(): DevicePlatform {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

export function usePushRegistration(): { state: PushState; enable: () => Promise<void> } {
  const runtime = useRuntime();
  const client = useQueryClient();
  const status = useSessionStatus();
  const push = runtime.push;
  const [state, setState] = useState<PushState>(push === undefined ? 'unsupported' : 'unknown');
  const registered = useRef(false);

  // Reading a token and telling the server about it is a subscription's setup,
  // not a data fetch (§15) — there is nothing to cache and nothing to refetch.
  useEffect(() => {
    if (push === undefined || status !== 'authenticated' || registered.current) return;
    registered.current = true;

    void (async () => {
      const token = await push.currentToken();
      if (token === undefined) return;
      await push.register({ token, platform: platformOf() });
      setState('registered');
      await client.invalidateQueries({ queryKey: queryKeys.devices });
    })();
  }, [push, status, client]);

  const enable = useCallback(async () => {
    if (push === undefined) return;

    const granted = await push.requestPermission();
    if (!granted) {
      setState('refused');
      return;
    }

    const token = await push.currentToken();
    if (token === undefined) {
      // Permission granted but no token: a simulator, or a device the push
      // service has not answered for yet. Saying "refused" here would be a lie.
      setState('unknown');
      return;
    }

    await push.register({ token, platform: platformOf() });
    setState('registered');
    await client.invalidateQueries({ queryKey: queryKeys.devices });
  }, [push, client]);

  return { state, enable };
}
