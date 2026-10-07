import type { ExerciseHistorySession } from '../../../../services/session.service';
import { e1rmTrend, headlineBests } from '../historyView';

const day = (e1rm: number | null, i: number): ExerciseHistorySession => ({
  sessionId: `s${i}`, completedAt: `2026-09-${String(10 + i).padStart(2, '0')}T10:00:00Z`, sets: [], topSet: null, e1rm,
});

describe('exercise history view', () => {
  it('draws no trend from two sessions — one heavy day is not a "+8%"', () => {
    expect(e1rmTrend([day(110, 2), day(100, 1)], 'kg')).toBeNull();
  });

  it('draws the trend oldest to newest, skipping days with no e1RM', () => {
    const trend = e1rmTrend([day(120, 4), day(null, 3), day(110, 2), day(100, 1)], 'kg')!;
    expect(trend.points).toEqual([100, 110, 120]);
    expect(trend.changePct).toBe(20);
  });

  it('draws it in pounds for a pound lifter', () => {
    const trend = e1rmTrend([day(102.06, 3), day(102.06, 2), day(102.06, 1)], 'lb')!;
    expect(trend.last).toBe(225);
  });

  it('headlines the records lifters talk about, not a 7RM', () => {
    const bests = [1, 3, 5, 7].map((reps) => ({ reps, weight: 100, completedAt: '' }));
    expect(headlineBests(bests).map((b) => b.reps)).toEqual([1, 3, 5]);
  });
});
