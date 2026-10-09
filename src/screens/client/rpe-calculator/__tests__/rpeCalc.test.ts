import type { RpeChart } from '../../../../services/session.service';
import { chartReps, estimatedMax, isExtrapolated, loadFor, pctOf1RM } from '../rpeCalc';

// The first rows of the server's chart (ironlab-backend rpe-load.ts), as it arrives.
const chart: RpeChart = {
  rpe: [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6],
  pctByReps: [
    [100.0, 97.8, 95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3],
    [95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7],
    [92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1],
    [89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6],
    [86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6, 77.4, 76.2],
  ],
  nearFailureRpe: 8,
  nearFailureMaxReps: 8,
};

describe('RPE calculator', () => {
  it('answers "160×3 @ 8 — what\'s 5 @ 7?" off the engine\'s chart, on a loadable plate', () => {
    const max = estimatedMax(chart, { weight: 160, reps: 3, rpe: 8 })!;
    expect(max).toBeCloseTo(185.4, 1); // 160 / 0.863
    expect(loadFor(chart, max, { reps: 5, rpe: 7 }, 'kg')).toBe(145); // 185.4 × 78.6% = 145.7
  });

  it('rounds to 5lb in pounds — a pair of 2.5s, the smallest jump a pound gym loads', () => {
    const max = estimatedMax(chart, { weight: 315, reps: 3, rpe: 8 })!;
    expect(loadFor(chart, max, { reps: 5, rpe: 7 }, 'lb')! % 5).toBe(0);
  });

  it('a single at RPE 10 is its own max', () => {
    expect(estimatedMax(chart, { weight: 200, reps: 1, rpe: 10 })).toBe(200);
  });

  it('says nothing off the chart rather than clamping to its edge', () => {
    expect(pctOf1RM(chart, 6, 8)).toBeNull(); // past the rows this chart carries
    expect(pctOf1RM(chart, 3, 5.5)).toBeNull();
    expect(estimatedMax(chart, { weight: 0, reps: 3, rpe: 8 })).toBeNull();
  });

  // 2026-09-04: 102.5×8 @ RPE 6 anchored a tempo bench ABOVE the athlete's comp bench.
  // The calculator still answers, but flags the same sets the engine refuses to trust.
  it('flags a set far from failure as a rough estimate', () => {
    expect(isExtrapolated(chart, { weight: 102.5, reps: 8, rpe: 6 })).toBe(true);
    expect(isExtrapolated(chart, { weight: 100, reps: 10, rpe: 9 })).toBe(true);
    expect(isExtrapolated(chart, { weight: 160, reps: 3, rpe: 8 })).toBe(false);
  });

  it('offers exactly the rep counts the chart has rows for', () => {
    expect(chartReps(chart)).toEqual([1, 2, 3, 4, 5]);
  });
});
