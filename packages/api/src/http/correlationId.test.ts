import { describe, expect, it } from 'vitest';
import { defaultCorrelationIdFactory } from './correlationId';

describe('fabrique d’identifiants de corrélation', () => {
  it('produit un identifiant différent à chaque appel', () => {
    const ids = new Set(Array.from({ length: 50 }, () => defaultCorrelationIdFactory()));

    expect(ids.size).toBe(50);
  });

  it('produit une forme lisible dans un ticket', () => {
    expect(defaultCorrelationIdFactory()).toMatch(/^[0-9a-f-]{30,40}$/);
  });

  it('se replie quand la plateforme n’offre pas randomUUID', () => {
    // Hermes n'a pas toujours embarqué `crypto.randomUUID`.
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(defaultCorrelationIdFactory()).toMatch(/^[0-9a-f-]{30,40}$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});
