/**
 * Whether the phone has a network, and when it gets one back.
 *
 * §6 asks for a flush "toutes les 5 à 10 secondes, ou **au retour du réseau**",
 * and the second half is the interesting one: a runner leaves a tunnel with two
 * minutes of buffered points, and waiting out the next tick before sending them
 * is two more minutes of a screen that says "42 points en attente".
 *
 * A port rather than a global: `navigator.onLine` lies in a browser and does
 * not exist on a phone, and a use case that reads it cannot be tested offline.
 */
export interface NetworkMonitor {
  /** Best-effort, and allowed to be wrong: the flush is retried anyway. */
  isConnected(): Promise<boolean>;

  /** Called when connectivity comes back, never on a change that stays offline. */
  onRestored(listener: () => void): () => void;
}
