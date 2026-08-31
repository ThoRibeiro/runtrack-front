import type { SecureStore, Session } from '@runtrack/core';

/**
 * The session, in memory, with the secure store behind it.
 *
 * It exists so the single-flight refresh can ask "has someone already rotated
 * this token?" **synchronously**. Asking the store means awaiting, and between
 * the await and the answer a second refresh has already left — which is exactly
 * the replay that invalidates the whole family.
 */
export class SessionHolder {
  private session: Session | undefined;
  private loaded = false;

  constructor(private readonly store: SecureStore) {}

  async load(): Promise<Session | undefined> {
    if (!this.loaded) {
      this.session = await this.store.read();
      this.loaded = true;
    }
    return this.session;
  }

  current(): Session | undefined {
    return this.session;
  }

  async replace(session: Session): Promise<void> {
    this.session = session;
    this.loaded = true;
    await this.store.write(session);
  }

  async clear(): Promise<void> {
    this.session = undefined;
    this.loaded = true;
    await this.store.clear();
  }
}
