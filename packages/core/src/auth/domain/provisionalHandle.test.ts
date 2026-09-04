import { describe, expect, it } from 'vitest';
import { userId } from '../../shared/identity/ids';
import { hasProvisionalHandle, provisionalHandleFor } from './provisionalHandle';

const MARIE = userId('0198c4d2-7f31-7a42-9c55-1b2c3d4e5f60');

describe('provisional handle', () => {
  /** The exact rule the server applies when it opens a federated account. */
  it('derives the handle from the first eight hexadecimal characters', () => {
    expect(provisionalHandleFor(MARIE)).toBe('runner-0198c4d2');
  });

  it('recognises an account that has not chosen its handle yet', () => {
    expect(hasProvisionalHandle({ id: MARIE, handle: 'runner-0198c4d2' })).toBe(true);
  });

  it('leaves alone an account whose owner has picked a name', () => {
    expect(hasProvisionalHandle({ id: MARIE, handle: 'marie' })).toBe(false);
  });

  /**
   * A handle that merely looks derived is not: only the one this very account
   * would have been given counts, so someone else's does not trigger the screen.
   */
  it('does not mistake another account’s derived handle for its own', () => {
    expect(hasProvisionalHandle({ id: MARIE, handle: 'runner-deadbeef' })).toBe(false);
  });
});
