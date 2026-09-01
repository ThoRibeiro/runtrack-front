import type { NetworkMonitor } from '@runtrack/core';

/**
 * Connectivity in a browser (§9).
 *
 * `navigator.onLine` is famously weak — it says whether the machine has *a*
 * network interface, not whether anything answers on it. A captive portal in a
 * hotel reports online and serves nothing. It is still worth reading: it is
 * right about the case that matters most, the tab that just lost its Wi-Fi, and
 * being wrong the other way costs one failed request that was going to fail
 * anyway.
 *
 * The port promises the offline→online **edge**, not every change. `online` and
 * `offline` events are exactly that, which makes this the short adapter.
 */
export class BrowserNetworkMonitor implements NetworkMonitor {
  isConnected(): Promise<boolean> {
    // A runtime without `navigator` — a server render, a test — is treated as
    // connected: refusing to try would be worse than trying and failing.
    return Promise.resolve(typeof navigator === 'undefined' || navigator.onLine);
  }

  onRestored(listener: () => void): () => void {
    if (typeof globalThis.addEventListener !== 'function') return () => undefined;

    globalThis.addEventListener('online', listener);
    return () => {
      globalThis.removeEventListener('online', listener);
    };
  }
}

/**
 * A monitor that never knows. Used where the platform offers nothing: every
 * request is attempted, and failure is the only signal.
 */
export class AlwaysOnlineMonitor implements NetworkMonitor {
  isConnected(): Promise<boolean> {
    return Promise.resolve(true);
  }

  onRestored(): () => void {
    return () => undefined;
  }
}
