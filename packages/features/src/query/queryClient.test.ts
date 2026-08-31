import { RunTrackError } from '@runtrack/core';
import { createQueryClient, shouldRetry } from './queryClient';

describe('politique de réessai', () => {
  it('ne réessaie pas ce que le serveur a répondu', () => {
    // Un 404 reste un 404, et réessayer un 429 aggrave la limite.
    expect(shouldRetry(0, new RunTrackError({ code: 'ACTIVITY_NOT_FOUND', message: '' }))).toBe(
      false,
    );
    expect(shouldRetry(0, new RunTrackError({ code: 'TOO_MANY_ATTEMPTS', message: '' }))).toBe(
      false,
    );
  });

  it('réessaie une requête qui n’a jamais eu de réponse', () => {
    expect(shouldRetry(0, new TypeError('Network request failed'))).toBe(true);
    expect(shouldRetry(1, new TypeError('Network request failed'))).toBe(true);
  });

  it('s’arrête après deux tentatives', () => {
    expect(shouldRetry(2, new TypeError('Network request failed'))).toBe(false);
  });

  it('ne rejoue jamais une mutation', () => {
    // Rejouer un like ou un commentaire parce que la réponse tardait est un
    // bug que l'utilisateur voit.
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});
