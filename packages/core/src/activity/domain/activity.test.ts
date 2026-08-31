import { describe, expect, it } from 'vitest';
import {
  acceptsPoints,
  canFinish,
  canPause,
  canRecordOn,
  canResume,
  isTerminal,
  type ActivityStatus,
} from './activity';

const statuses: ActivityStatus[] = [
  { kind: 'live', since: 1 },
  { kind: 'paused', since: 2 },
  { kind: 'finished', since: 3 },
  { kind: 'discarded', since: 4 },
];

describe('cycle de vie d’une course', () => {
  it('n’accepte des points qu’en cours', () => {
    expect(statuses.filter(acceptsPoints).map((s) => s.kind)).toEqual(['live']);
  });

  it('reconnaît les deux états terminaux', () => {
    expect(statuses.filter(isTerminal).map((s) => s.kind)).toEqual(['finished', 'discarded']);
  });

  it('ne met en pause qu’une course en cours', () => {
    expect(statuses.filter(canPause).map((s) => s.kind)).toEqual(['live']);
  });

  it('ne reprend qu’une course en pause', () => {
    expect(statuses.filter(canResume).map((s) => s.kind)).toEqual(['paused']);
  });

  it('termine depuis « en cours » comme depuis « en pause »', () => {
    expect(statuses.filter(canFinish).map((s) => s.kind)).toEqual(['live', 'paused']);
  });
});

describe('canRecordOn', () => {
  it('le web n’enregistre pas, et ce n’est pas une permission', () => {
    // §2 : un navigateur ne fait pas de géolocalisation en arrière-plan et
    // l'onglet s'endort. C'est un fait, pas une limite à contourner.
    expect(canRecordOn('web')).toBe(false);
    expect(canRecordOn('mobile')).toBe(true);
  });
});
