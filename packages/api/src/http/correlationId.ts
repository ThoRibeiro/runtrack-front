/**
 * §11: an `X-Correlation-Id` generated client-side and sent on every request.
 * It is what the user quotes when they report a problem, and the server echoes
 * it back into the problem document.
 *
 * It is injectable rather than hard-wired to `crypto.randomUUID` for two
 * reasons: Hermes has not always shipped it, and a test that cannot fix the id
 * cannot assert that it travelled.
 */
export type CorrelationIdFactory = () => string;

const HEX = '0123456789abcdef';

/**
 * A UUID v4 when the platform offers one, a random-enough identifier otherwise.
 * This is a correlation id, not a secret: it never has to be unguessable.
 */
export const defaultCorrelationIdFactory: CorrelationIdFactory = () => {
  // Optional at every step: the DOM library promises `crypto.randomUUID`
  // unconditionally, and Hermes has not always shipped either. A missing
  // correlation id must not fail a request, so the probe stays.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const uuid = globalThis.crypto?.randomUUID?.();
  if (typeof uuid === 'string') return uuid;

  let id = '';
  for (let index = 0; index < 32; index += 1) {
    id += HEX[Math.floor(Math.random() * 16)] ?? '0';
    if (index === 7 || index === 11 || index === 15 || index === 19) id += '-';
  }
  return id;
};
