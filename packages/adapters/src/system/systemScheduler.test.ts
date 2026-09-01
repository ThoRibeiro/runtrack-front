import { SystemRandom, SystemScheduler } from './systemScheduler';

describe('SystemScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exécute une fois après le délai', () => {
    const run = jest.fn();
    new SystemScheduler().after(50, run);

    jest.advanceTimersByTime(49);
    expect(run).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('répète à intervalle régulier jusqu’à l’annulation', () => {
    const run = jest.fn();
    const cancel = new SystemScheduler().every(10, run);

    jest.advanceTimersByTime(35);
    expect(run).toHaveBeenCalledTimes(3);

    cancel();
    jest.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('supporte une annulation répétée, comme le port le promet', () => {
    const run = jest.fn();
    const scheduler = new SystemScheduler();
    const cancelOnce = scheduler.after(10, run);
    const cancelEvery = scheduler.every(10, run);

    cancelOnce();
    cancelOnce();
    cancelEvery();
    cancelEvery();
    jest.advanceTimersByTime(100);

    expect(run).not.toHaveBeenCalled();
  });
});

describe('SystemRandom', () => {
  it('tire dans [0, 1)', () => {
    const random = new SystemRandom();

    for (let draw = 0; draw < 100; draw += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
