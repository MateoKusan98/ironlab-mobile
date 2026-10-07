import { warmupRamp } from '../warmup';

const gym = { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] };
const weights = (top: number, reps = 5, bar: typeof gym | null = gym) => warmupRamp(top, reps, bar).map((s) => s.weight);

describe('warm-up ramp', () => {
  // Mateo, 2026-10-07: "everything will jump 60 80 100 110 top set".
  it('ramps to a 110 top set in round jumps: bar, 60, 80, 100', () => {
    expect(weights(110)).toEqual([20, 60, 80, 100]);
  });

  it('never prescribes a warm-up like 67.5, 105 or 135 — only multiples of ten', () => {
    for (const top of [97.5, 132.5, 152.5, 172.5, 187.5, 232.5, 262.5]) {
      const ramp = weights(top);
      expect({ top, ramp: ramp.filter((w) => w % 10 !== 0) }).toEqual({ top, ramp: [] });
    }
  });

  it('gives a heavy deadlift more steps than a light row, and keeps the last jump close', () => {
    const deadlift = weights(230);
    expect(deadlift).toEqual([20, 60, 100, 140, 170, 210]);
    expect(weights(80).length).toBeLessThan(deadlift.length);
  });

  it('climbs, stays under the top set and leaves a real step to it', () => {
    for (const top of [50, 62.5, 85, 120, 175, 300]) {
      const ramp = weights(top);
      ramp.slice(1).forEach((w, i) => expect(w).toBeGreaterThan(ramp[i]));
      expect(ramp[ramp.length - 1]).toBeLessThanOrEqual(top - 5);
    }
  });

  it('drops the reps as the bar gets heavier, ending on a single before a heavy top set', () => {
    const ramp = warmupRamp(170, 3, gym);
    expect(ramp[0]).toEqual({ weight: 20, reps: 10 });
    expect(ramp[ramp.length - 1].reps).toBe(1);
  });

  it('takes one jump fewer before a high-rep set', () => {
    expect(weights(110, 10).length).toBe(weights(110, 3).length - 1);
  });

  it('has nothing to ramp through when the work set is the empty bar', () => {
    expect(warmupRamp(20, 10, gym)).toEqual([]);
  });

  it('skips a jump this gym cannot load rather than inventing one', () => {
    // Only 20s: 60 and 100 load (20 / 40 a side); the 130 jump does not, nor does 120.
    const twentiesOnly = { bar: 20, plates: [20] };
    expect(weights(150, 5, twentiesOnly)).toEqual([20, 60, 100]);
  });
});

describe('warm-ups in pounds (2026-10-07)', () => {
  const lbGym = { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] };
  const weights = (top: number, reps: number) => warmupRamp(top, reps, lbGym, 'lb').map((s) => s.weight);

  it('ramps a 315 the way a pound gym loads it — 135, 225, 275, never 132.3', () => {
    expect(weights(315, 5)).toEqual([45, 135, 225, 275]);
  });

  it('only ever lands on plate-round pound loads', () => {
    const round = new Set([45, 65, 95, 135, 185, 225, 275, 315, 365, 405, 455, 495]);
    for (const top of [155, 225, 280, 365, 405, 500]) {
      for (const w of weights(top, 3)) expect(round.has(w)).toBe(true);
    }
  });
});
