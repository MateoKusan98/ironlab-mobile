import { daysSince, formatLastSets } from '../lastTime';

describe('last time line', () => {
  it('collapses straight sets the way a lifter writes them', () => {
    expect(formatLastSets([
      { reps: 5, weight: 160, rpe: 7.5 },
      { reps: 5, weight: 160, rpe: 8 },
      { reps: 5, weight: 160, rpe: 8 },
    ])).toBe('3×5 @ 160kg · RPE 8');
  });

  it('keeps a top set and its back-offs as separate groups', () => {
    expect(formatLastSets([
      { reps: 3, weight: 170, rpe: 8.5 },
      { reps: 5, weight: 150, rpe: 7 },
      { reps: 5, weight: 150, rpe: 7 },
    ])).toBe('1×3 @ 170kg, 2×5 @ 150kg · RPE 8.5');
  });

  it('shows a bodyweight movement without a load, and no RPE when none was logged', () => {
    expect(formatLastSets([{ reps: 10, weight: null, rpe: null }, { reps: 8, weight: 0, rpe: null }])).toBe('1×10, 1×8');
  });

  it('prints plate-precision loads without trailing zeros', () => {
    expect(formatLastSets([{ reps: 3, weight: 162.5, rpe: null }])).toBe('1×3 @ 162.5kg');
  });

  it('counts calendar days, not 24-hour blocks', () => {
    const now = new Date(2026, 9, 7, 8, 0).getTime();
    expect(daysSince(new Date(2026, 9, 6, 21, 0).toISOString(), now)).toBe(1);
    expect(daysSince(new Date(2026, 9, 7, 7, 0).toISOString(), now)).toBe(0);
    expect(daysSince('garbage', now)).toBeNull();
  });
});
