import * as Network from 'expo-network';
import type { NetworkMonitor } from '@runtrack/core';

/**
 * §6's "ou au retour du réseau", on a device.
 *
 * The edge is what matters, not the state: a listener fires on every change,
 * including offline-to-offline transitions between two cell towers. Flushing on
 * those does nothing but wake the radio. So the previous state is remembered
 * here, and only the offline→online **edge** is reported.
 */
export class ExpoNetworkMonitor implements NetworkMonitor {
  private connected = true;

  async isConnected(): Promise<boolean> {
    const state = await Network.getNetworkStateAsync();
    this.connected = state.isInternetReachable ?? state.isConnected ?? false;
    return this.connected;
  }

  onRestored(listener: () => void): () => void {
    const subscription = Network.addNetworkStateListener((state) => {
      const nowConnected = state.isInternetReachable ?? state.isConnected ?? false;
      const wasOffline = !this.connected;
      this.connected = nowConnected;
      if (wasOffline && nowConnected) listener();
    });

    return () => {
      subscription.remove();
    };
  }
}
