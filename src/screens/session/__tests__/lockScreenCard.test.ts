import { lockScreenCard, Translate } from '../lockScreenCard';
import type { Exercise } from '../workoutState';

// Returns the English default with {{vars}} filled, like i18next does without a key.
const t: Translate = (_key, { defaultValue, ...vars }) =>
  String(defaultValue).replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k]));
const base = { exName: (n: string) => n, unitLabel: 'kg', t, formatClock: () => '14:32' };

const squat = (done: number): Exercise => ({
  name: 'Squat', order: 0, isExpanded: true,
  sets: Array.from({ length: 5 }, (_, i) => ({
    uid: `s${i}`, setNumber: i + 1, reps: '4', weight: '160', rpe: '', targetRpe: 8, isCompleted: i < done,
  })),
});

describe('lock-screen workout card', () => {
  it('names the set coming up with its load, reps and target RPE', () => {
    const card = lockScreenCard({ ...base, exercises: [squat(2)], restEndsAt: null });
    expect(card).toEqual({ title: 'Squat · set 3 of 5', body: 'Next: 160 kg × 4 @ RPE 8' });
  });

  it('gives the end of rest as a clock time — a frozen countdown would be wrong a second later', () => {
    const card = lockScreenCard({ ...base, exercises: [squat(2)], restEndsAt: Date.now() + 90_000 });
    expect(card.body).toBe('Rest until 14:32 · next 160 kg × 4 @ RPE 8');
  });

  it('drops the rest line once rest is over', () => {
    const card = lockScreenCard({ ...base, exercises: [squat(2)], restEndsAt: Date.now() - 1000 });
    expect(card.body.startsWith('Next:')).toBe(true);
  });

  it('says reps alone for a set with no load (no history — the athlete works up)', () => {
    const ex = squat(0);
    ex.sets[0] = { ...ex.sets[0], weight: '', targetRpe: undefined };
    expect(lockScreenCard({ ...base, exercises: [ex], restEndsAt: null }).body).toBe('Next: 4 reps');
  });

  it('tells the athlete to finish once every set is done', () => {
    expect(lockScreenCard({ ...base, exercises: [squat(5)], restEndsAt: null }).title).toBe('All sets done 💪');
  });
});
