import type { SessionSet } from '../../../../services/session.service';
import { buildShareCard, formatVolume, MAX_SHARE_LIFTS } from '../shareCard';

const set = (o: Partial<SessionSet>): SessionSet => ({
  id: 'x', sessionId: 's', exerciseName: 'Competition Squat', exerciseOrder: 0, setNumber: 1,
  targetReps: null, targetWeight: null, targetRpe: null, repsCompleted: 5, weightUsed: 160, rpe: 8,
  isCompleted: true, isPR: false, techniqueNotes: null, techniqueRating: null, loggedAt: '', ...o,
});

describe('share card', () => {
  it('shows each lift\'s top set — heaviest, then more reps — in session order', () => {
    const card = buildShareCard([
      set({ exerciseName: 'Bench Press', exerciseOrder: 1, weightUsed: 100, repsCompleted: 5 }),
      set({ weightUsed: 170, repsCompleted: 3 }),
      set({ weightUsed: 170, repsCompleted: 2 }),
      set({ weightUsed: 150, repsCompleted: 5 }),
    ]);
    expect(card.lifts).toEqual([
      { name: 'Competition Squat', weight: 170, reps: 3 },
      { name: 'Bench Press', weight: 100, reps: 5 },
    ]);
  });

  it('counts only completed sets, and leaves bodyweight work off the lift list but in the set count', () => {
    const card = buildShareCard([
      set({}),
      set({ isCompleted: false, weightUsed: 200 }),
      set({ exerciseName: 'Pull-Up', exerciseOrder: 2, weightUsed: null, repsCompleted: 10 }),
    ]);
    expect(card.setCount).toBe(2);
    expect(card.volumeKg).toBe(800);
    expect(card.lifts.map((l) => l.name)).toEqual(['Competition Squat']);
  });

  it('caps the list so the story image stays readable', () => {
    const sets = Array.from({ length: 8 }, (_, i) => set({ exerciseName: `Lift ${i}`, exerciseOrder: i }));
    expect(buildShareCard(sets).lifts).toHaveLength(MAX_SHARE_LIFTS);
  });

  it('switches to tonnes past a tonne, rounding down so it never overstates', () => {
    expect(formatVolume(850)).toBe('850 kg');
    expect(formatVolume(12_490)).toBe('12.4 t');
  });
});
