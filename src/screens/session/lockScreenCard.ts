import type { Exercise } from './workoutState';

/**
 * What the lock-screen card says mid-workout: the set coming up and when rest ends —
 * the two things a lifter unlocks the phone between sets to check.
 *
 * It states the end of rest as a clock time ("rest until 14:32"), not a countdown: a
 * notification cannot tick while the app sleeps, and a frozen "1:42 left" is wrong
 * every second after it is posted, while a clock time stays true. The in-app banner
 * and the rest-over alert do the counting.
 */
export interface LockScreenCard {
  title: string;
  body: string;
}

export type Translate = (key: string, options: Record<string, unknown>) => string;

export interface LockScreenCardInput {
  exercises: Exercise[];
  restEndsAt: number | null;
  /** Display name of a movement in the athlete's language. */
  exName: (name: string) => string;
  unitLabel: string;
  t: Translate;
  /** 14:32 — the phone's own clock format. */
  formatClock: (ms: number) => string;
}

export function lockScreenCard(input: LockScreenCardInput): LockScreenCard {
  const { exercises, restEndsAt, exName, unitLabel, t, formatClock } = input;
  const ex = exercises.find((e) => e.sets.some((s) => !s.isCompleted));
  if (!ex) {
    return {
      title: t('activeWorkout.lockAllDoneTitle', { defaultValue: 'All sets done 💪' }),
      body: t('activeWorkout.lockAllDoneBody', { defaultValue: 'Open IronLab and tap Finish to save the session.' }),
    };
  }
  const setIdx = ex.sets.findIndex((s) => !s.isCompleted);
  const title = t('activeWorkout.lockTitle', {
    exercise: exName(ex.name), set: setIdx + 1, total: ex.sets.length,
    defaultValue: '{{exercise}} · set {{set}} of {{total}}',
  });
  const next = describeSet(ex.sets[setIdx], unitLabel, t);
  const resting = restEndsAt != null && restEndsAt > Date.now();
  const body = resting
    ? t('activeWorkout.lockBodyResting', { time: formatClock(restEndsAt), next, defaultValue: 'Rest until {{time}} · next {{next}}' })
    : t('activeWorkout.lockBody', { next, defaultValue: 'Next: {{next}}' });
  return { title, body };
}

/** "160 kg × 4 @ RPE 8", dropping whatever the set does not have. */
function describeSet(set: Exercise['sets'][number], unitLabel: string, t: Translate): string {
  const parts: string[] = [];
  if (set.weight) parts.push(`${set.weight} ${unitLabel}`);
  if (set.reps) {
    parts.push(set.weight
      ? `× ${set.reps}`
      : t('activeWorkout.lockReps', { count: Number(set.reps), defaultValue: '{{count}} reps' }));
  }
  const rpe = set.rpe || (set.targetRpe != null ? String(set.targetRpe) : '');
  if (rpe) parts.push(`@ RPE ${rpe}`);
  return parts.join(' ');
}
