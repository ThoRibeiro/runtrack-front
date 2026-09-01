/**
 * Handing the thread back, so a long decode never holds a frame hostage.
 *
 * The two platforms have different cheapest ways to do it, and the difference
 * matters here: on the web `setTimeout(…, 0)` is clamped to about 4 ms, which
 * would turn twenty slices into eighty milliseconds of doing nothing at all.
 * A `MessageChannel` message is a macrotask like a timer — so the browser can
 * paint between two slices — but without the clamp.
 */
export type Yielder = () => Promise<void>;

/** The web one: a macrotask without the four-millisecond timer clamp. */
export function messageChannelYielder(): Yielder {
  return () =>
    new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(undefined);
    });
}

/** The portable one. React Native has no `MessageChannel`. */
export function timeoutYielder(): Yielder {
  return () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
}

export function yielderForPlatform(): Yielder {
  return typeof MessageChannel === 'function' ? messageChannelYielder() : timeoutYielder();
}
