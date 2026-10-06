import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sessionService } from '../../../services/session.service';
import { aiCoachService } from '../../../services/ai-coach.service';
import { Exercise, applySubstitution, nextSetUid } from '../workoutState';

export interface ExerciseEditingDeps {
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  removedSetIdsRef: React.MutableRefObject<Set<string>>;
  sentReviewsRef: React.MutableRefObject<Map<string, string>>;
}

/**
 * Restructuring the session: adding, expanding, substituting and removing exercises,
 * and the add/substitute sheets that drive the first two.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useExerciseEditing(deps: ExerciseEditingDeps) {
  const { exercises, setExercises, removedSetIdsRef, sentReviewsRef } = deps;
  const { t } = useTranslation();
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [substituteIdx, setSubstituteIdx] = useState<number | null>(null);

  const addExercise = (name: string) => {
    const newEx: Exercise = {
      name,
      order: exercises.length,
      isExpanded: true,
      sets: [{ uid: nextSetUid(), setNumber: 1, reps: '', weight: '', rpe: '', isCompleted: false }],
    };
    setExercises((prev) => [...prev, newEx]);
    setShowAddExercise(false);
  };

  const toggleExpand = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => i === exIdx ? { ...ex, isExpanded: !ex.isExpanded } : ex)
    );
  };

  const substituteExercise = (exIdx: number, newName: string) => {
    const ex = exercises[exIdx];
    if (!ex) return;
    // The slot's ask, read off its first set still to do: comp-lift variations keep it
    // (it is the week's rep schedule), accessories get their own from the server.
    const slot = ex.sets.find((s) => !s.isCompleted) ?? ex.sets[0];
    const slotReps = slot?.targetReps ?? (slot?.reps ? parseInt(slot.reps) : NaN);

    // Clear the old movement's numbers NOW; never show them while the request is out.
    setExercises((prev) => prev.map((e, i) => i === exIdx ? applySubstitution(e, newName, null) : e));
    // The self-report described the movement being replaced, so let the new one
    // re-send its own rather than inheriting a cached "already sent".
    sentReviewsRef.current.delete(ex.name);
    setSubstituteIdx(null);

    if (!(slotReps > 0)) return;
    aiCoachService.getSubstituteTarget(newName, slotReps, slot?.targetRpe)
      .then((target) => {
        // Only if the athlete has not swapped again in the meantime.
        // A movement never done gets no number, and says why instead of leaving a blank.
        const workUp = target.weight == null
          ? t('activeWorkout.substituteWorkUp', { defaultValue: 'No history on this movement yet — work up to the target reps and log what you used. Next time it is loaded from your own numbers.' })
          : undefined;
        setExercises((prev) => prev.map((e, i) =>
          i === exIdx && e.name === newName ? { ...applySubstitution(e, newName, target), cue: workUp } : e));
      })
      // A swap must never fail on a pricing call: offline, the weight simply stays empty.
      .catch(() => {});
  };

  const removeExercise = (exIdx: number) => {
    Alert.alert('Remove exercise?', exercises[exIdx].name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const toDelete = exercises[exIdx].sets.filter((s) => s.id);
          toDelete.forEach((s) => {
            removedSetIdsRef.current.add(s.id!);
            sessionService.deleteSet(s.id!).catch(() => {});
          });
          sentReviewsRef.current.delete(exercises[exIdx].name);
          setExercises((prev) => prev.filter((_, i) => i !== exIdx));
        },
      },
    ]);
  };

  return {
    showAddExercise, setShowAddExercise, substituteIdx, setSubstituteIdx,
    addExercise, toggleExpand, substituteExercise, removeExercise,
  };
}
