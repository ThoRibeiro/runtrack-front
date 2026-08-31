import type { KeyStorage } from './webSecureStore';

/**
 * A `KeyStorage` that keeps references, exactly as a browser's structured clone
 * does for a `CryptoKey`.
 *
 * It ships in `src` rather than beside a test because the shells need it too:
 * a demo mode, a screenshot run, an end-to-end test that must not persist a
 * session between cases.
 */
export class MemoryKeyStorage implements KeyStorage {
  private readonly entries = new Map<string, unknown>();

  read(key: string): Promise<unknown> {
    return Promise.resolve(this.entries.get(key));
  }

  write(key: string, value: unknown): Promise<void> {
    this.entries.set(key, value);
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }

  /** What actually landed in storage, for the tests that look at it. */
  peek(key: string): unknown {
    return this.entries.get(key);
  }
}
