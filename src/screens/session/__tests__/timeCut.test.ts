import { applyTimeCut, minutesLeft, planTimeCut } from '../timeCut';
import type { Exercise, LocalSet } from '../workoutState';

let uid = 0;
const set = (over: Partial<LocalSet> = {}): LocalSet => ({
  uid: `t-${++uid}`, setNumber: 1, reps: '8', weight: '100', rpe: '', isCompleted: false, ...over,
});
const ex = (name: string, open: number, done = 0): Exercise => ({
  name, order: 0, isExpanded: true,
  sets: [
    ...Array.from({ length: done }, () => set({ isCompleted: true, id: `srv-${++uid}` })),
    ...Array.from({ length: open }, () => set()),
  ],
});
// The defaults: 3 min after compounds, 90 s after isolation work.
const restSecsFor = (name: string) => (/squat|bench|press|row|deadlift/i.test(name) ? 180 : 90);

// A typical squat day: comp squat, comp bench, then four accessories.
const squatDay = () => [
  ex('Squat', 5), ex('Bench Press', 4), ex('Leg Press', 3),
  ex('Leg Curl', 3), ex('Lateral Raise', 4), ex('Calf Raise', 3),
];

describe('short on time', () => {
  it('estimates a 22-set squat day at about 80 minutes', () => {
    expect(minutesLeft(squatDay(), restSecsFor)).toBe(80);
  });

  it('never cuts a set — or a kilo — of the competition lifts', () => {
    const plan = planTimeCut({ exercises: squatDay(), minutesAvailable: 30, restSecsFor });
    expect(plan.keep.slice(0, 2)).toEqual([5, 4]);
    expect(plan.changes.map((c) => c.name)).not.toContain('Squat');
    expect(plan.changes.map((c) => c.name)).not.toContain('Bench Press');
  });

  it('trims accessories to two sets each before dropping any — coverage first', () => {
    const plan = planTimeCut({ exercises: squatDay(), minutesAvailable: 75, restSecsFor });
    expect(plan.fits).toBe(true);
    // Something was trimmed, nothing was dropped.
    expect(plan.changes.length).toBeGreaterThan(0);
    expect(plan.keep.every((n) => n >= 2)).toBe(true);
  });

  it('trims the accessory with the most sets left first', () => {
    const plan = planTimeCut({ exercises: squatDay(), minutesAvailable: 78, restSecsFor });
    expect(plan.changes).toEqual([{ exIdx: 4, name: 'Lateral Raise', from: 4, to: 3 }]);
  });

  it('drops whole accessories from the END of the session once all are at two sets', () => {
    const plan = planTimeCut({ exercises: squatDay(), minutesAvailable: 60, restSecsFor });
    const dropped = plan.changes.filter((c) => c.to === 0).map((c) => c.name);
    expect(dropped[dropped.length - 1]).toBe('Calf Raise');
    expect(dropped).not.toContain('Squat');
  });

  it('says so instead of shaving the squat when the main lifts alone do not fit', () => {
    const plan = planTimeCut({ exercises: squatDay(), minutesAvailable: 20, restSecsFor });
    expect(plan.fits).toBe(false);
    expect(plan.keep).toEqual([5, 4, 0, 0, 0, 0]);
    expect(plan.mainWorkMinutes).toBeGreaterThan(20);
  });

  it('protects the opening exercise of a session with no competition lift (a hypertrophy day)', () => {
    const armDay = [ex('Incline Dumbbell Press', 4), ex('Cable Fly', 3), ex('Triceps Pushdown', 3)];
    const plan = planTimeCut({ exercises: armDay, minutesAvailable: 20, restSecsFor });
    expect(plan.keep[0]).toBe(4);
  });

  it('keeps a squat swapped for a hack squat protected — it is still the main slot', () => {
    const swapped: Exercise = { ...ex('Hack Squat', 4), substitutedFor: 'Squat' };
    const day = [ex('Bench Press', 4), swapped, ex('Leg Curl', 3)];
    const plan = planTimeCut({ exercises: day, minutesAvailable: 10, restSecsFor });
    expect(plan.keep[1]).toBe(4);
  });

  it('only counts what is left: logged sets are never cut and an exercise under way pays no changeover', () => {
    const day = [ex('Squat', 0, 5), ex('Leg Curl', 2, 2)];
    const plan = planTimeCut({ exercises: day, minutesAvailable: 60, restSecsFor });
    expect(plan.changes).toEqual([]);
    expect(plan.minutesBefore).toBe(Math.round((2 * (45 + 90)) / 60));
  });

  it('applies the cut: drops trailing unlogged sets, removes emptied exercises, keeps logged work', () => {
    const day = [ex('Squat', 3, 2), ex('Leg Curl', 3, 1), ex('Calf Raise', 3)];
    const cut = applyTimeCut(day, [3, 0, 0]);
    expect(cut.map((e) => e.name)).toEqual(['Squat', 'Leg Curl']);
    expect(cut[1].sets).toHaveLength(1);
    expect(cut[1].sets[0].isCompleted).toBe(true);
    expect(cut.map((e) => e.order)).toEqual([0, 1]);
  });

  it('never removes a set the server already holds', () => {
    const curl = ex('Leg Curl', 2);
    curl.sets[1] = { ...curl.sets[1], id: 'srv-unticked' };
    const plan = planTimeCut({ exercises: [ex('Squat', 5), curl], minutesAvailable: 5, restSecsFor });
    expect(plan.keep[1]).toBe(1);
    expect(applyTimeCut([ex('Squat', 5), curl], plan.keep)[1].sets[0].id).toBe('srv-unticked');
  });
});
