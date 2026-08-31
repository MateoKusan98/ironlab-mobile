import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiCoachService, TechniqueLift } from '../services/ai-coach.service';

/**
 * "Film this one once." The in-session half of the technique ask.
 *
 * The Workouts card lists the movements the athlete has never filmed; an athlete who
 * never opens that tab is never asked. This fires at the moment the lift is actually
 * in front of him — once per session, for ONE movement, dismissible — so the ask
 * lands where it can be acted on without ever standing between him and a set.
 *
 * Deliberately silent for a movement already filmed, and for a flagged one: a lift
 * carrying a reduction is explained on the card and in the coach's note, and being
 * told again on the way to the bar is nagging, not coaching.
 */
export interface TechniqueNudge {
  lift: TechniqueLift;
  exerciseName: string;
}

/**
 * Whether a planned exercise is this key lift.
 *
 * Loose on purpose, and safe to be: for a competition family it matches the word, so
 * "Barbell Back Squat" reaches the squat's nudge. A false match shows a prompt about
 * the wrong squat variation; a miss shows it next session. This is a DISPLAY trigger
 * and never a load decision, which is why an approximate matcher belongs here and
 * would not belong in the engine — the backend classifies with the real one.
 */
function matchesLift(exerciseName: string, lift: TechniqueLift): boolean {
  const n = exerciseName.trim().toLowerCase();
  if (!n) return false;
  if (lift.compLift === 'squat') return /\bsquat\b/.test(n);
  if (lift.compLift === 'bench') return /\bbench\b/.test(n);
  if (lift.compLift === 'deadlift') return /\bdeadlift\b/.test(n);
  return n === lift.key;
}

export function useTechniqueNudge(
  sessionId: string,
  currentExerciseName: string | null,
  ready: boolean,
): { nudge: TechniqueNudge | null; dismiss: () => void } {
  const [lifts, setLifts] = useState<TechniqueLift[]>([]);
  const [nudge, setNudge] = useState<TechniqueNudge | null>(null);

  // At most one ask per session, persisted so resuming a workout stays quiet.
  const askedRef = useRef(false);
  const storageKey = `techniqueAsked:${sessionId}`;

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(storageKey)
      .then((raw) => { if (raw) askedRef.current = true; })
      .catch(() => {});

    // Best effort. A technique read failing must never be visible inside a workout.
    aiCoachService.technique()
      .then((d) => { if (!cancelled) setLifts(d.lifts.filter((l) => l.score == null)); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    if (nudge) return;  // don't stack sheets
    if (!lifts.length) return;
    if (!currentExerciseName) return;

    const hit = lifts.find((l) => matchesLift(currentExerciseName, l));
    if (hit && !askedRef.current) {
      askedRef.current = true;
      AsyncStorage.setItem(storageKey, '1').catch(() => {});
      setNudge({ lift: hit, exerciseName: currentExerciseName });
    }
  }, [currentExerciseName, lifts, ready, nudge, storageKey]);

  const dismiss = useCallback(() => setNudge(null), []);

  return { nudge, dismiss };
}
