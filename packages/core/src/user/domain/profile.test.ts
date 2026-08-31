import { describe, expect, it } from 'vitest';
import { goalProgress, type RunnerTotals } from './profile';

const totals = (distanceMetres: number): RunnerTotals => ({
  period: 'WEEK',
  since: undefined,
  activityCount: 3,
  distanceMetres,
  movingTimeSeconds: 7_200,
  elevationGain: 120,
  byType: [],
});

describe('progression vers l’objectif', () => {
  it('rend la fraction parcourue', () => {
    expect(goalProgress(totals(27_200), 40_000)).toBeCloseTo(0.68, 5);
  });

  it('borne un objectif dépassé, pour ne pas dessiner deux tours d’anneau', () => {
    expect(goalProgress(totals(56_000), 40_000)).toBe(1);
  });

  it('rend zéro sans objectif', () => {
    expect(goalProgress(totals(10_000), 0)).toBe(0);
  });
});
