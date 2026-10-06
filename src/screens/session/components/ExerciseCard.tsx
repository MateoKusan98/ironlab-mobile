import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import { ExerciseCue } from '../../../services/exerciseCue.service';
import { InSessionAdjustment } from '../../../services/ai-coach.service';
import { Exercise, LocalSet } from '../workoutState';
import { openTutorial } from '../exerciseCatalog';
import { styles } from '../ActiveWorkoutScreen.styles';
import { ExerciseCueList } from './ExerciseCueList';
import { SetRow } from './SetRow';
import { ExerciseReview } from './ExerciseReview';
import { LoadAdjustCard } from './LoadAdjustCard';

/** The handlers an exercise card needs, all addressed by this card's exercise index. */
export interface ExerciseCardActions {
  toggleExpand: (exIdx: number) => void;
  openSubstitute: (exIdx: number) => void;
  removeExercise: (exIdx: number) => void;
  openRpeGuide: () => void;
  updateSetField: (exIdx: number, setIdx: number, field: keyof LocalSet, value: string) => void;
  maybePromptPrefill: (exIdx: number, setIdx: number, field: 'weight' | 'rpe') => void;
  handleRpeFocus: () => void;
  removeSet: (exIdx: number, setIdx: number) => void;
  completeSet: (exIdx: number, setIdx: number) => void;
  uncompleteSet: (exIdx: number, setIdx: number) => void;
  addSet: (exIdx: number) => void;
  updateExerciseField: (exIdx: number, field: 'techniqueRating' | 'exerciseNotes', value: number | string) => void;
  applyAdjustment: () => void;
  dismissAdjustment: () => void;
}

export interface ExerciseCardCueForm {
  cues: ExerciseCue[];
  open: boolean;
  newCueText: string;
  savingCue: boolean;
  setNewCueText: (text: string) => void;
  openForm: () => void;
  closeForm: () => void;
  save: () => void;
  remove: (cue: ExerciseCue) => void;
}

export interface ExerciseCardProps {
  exercise: Exercise;
  exIdx: number;
  exName: (name: string) => string;
  barLoading: { barKg: number; plates: number[] } | null | undefined;
  /** The live load cut, when it belongs to this exercise. */
  adjustment: InSessionAdjustment | null;
  cueForm: ExerciseCardCueForm;
  actions: ExerciseCardActions;
}

/**
 * One exercise in the live workout: its header and actions, cues, sets, the in-session
 * load cut, and the self-report.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise: ex, exIdx, exName, barLoading, adjustment, cueForm, actions,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.exerciseCard}>
      {/* Exercise Header */}
      <TouchableOpacity accessibilityRole="button" style={styles.exerciseHeader} onPress={() => actions.toggleExpand(exIdx)}>
        <View style={styles.exerciseLeft}>
          <Text style={styles.exerciseName}>{exName(ex.name)}</Text>
          <Text style={styles.exerciseMeta}>
            {ex.sets.filter((s) => s.isCompleted).length}/{ex.sets.length} sets
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openTutorial(ex.name)}
          style={styles.tutorialBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('activeWorkout.watchTutorial', { defaultValue: 'Watch exercise tutorial' })}
        >
          <Text style={styles.tutorialBtnText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => actions.openSubstitute(exIdx)}
          style={styles.substituteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('activeWorkout.substituteExercise', { defaultValue: 'Substitute exercise' })}
        >
          <Text style={styles.substituteBtnText}>⇄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => actions.removeExercise(exIdx)}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel={t('activeWorkout.removeExercise', { defaultValue: 'Remove exercise' })}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.chevron}>{ex.isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {ex.isExpanded && (
        <>
          {/* Coaching cue from the plan — kept visible while logging so the
              user knows the technique focus for this exercise. */}
          {ex.cue ? <Text style={styles.exerciseCue}>"{ex.cue}"</Text> : null}

          <ExerciseCueList
            cues={cueForm.cues}
            formOpen={cueForm.open}
            newCueText={cueForm.newCueText}
            savingCue={cueForm.savingCue}
            onChangeCueText={cueForm.setNewCueText}
            onOpenForm={cueForm.openForm}
            onCloseForm={cueForm.closeForm}
            onSave={cueForm.save}
            onDelete={cueForm.remove}
          />

          {/* Column Headers */}
          <View style={styles.colHeaders}>
            <Text style={[styles.colHeader, { width: 30 }]}>{t('activeWorkout.set')}</Text>
            <Text style={[styles.colHeader, { flex: 1 }]}>{t('activeWorkout.weight')}</Text>
            <Text style={[styles.colHeader, { flex: 1 }]}>{t('activeWorkout.repsLabel')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={{ width: 50, flexDirection: 'row', alignItems: 'center', gap: 2 }}
              onPress={actions.openRpeGuide}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.colHeader}>{t('activeWorkout.rpeLabel')}</Text>
              <Text style={{ fontSize: 10, color: palette.brand[400] }}>ℹ</Text>
            </TouchableOpacity>
            <View style={{ width: 70 }} />
          </View>

          {/* Sets */}
          {ex.sets.map((set, setIdx) => {
            // Draw the bar once per prescribed load rather than under every
            // row: 3×5 @ 152.5 is one stack to build, while a top single
            // with a back-off is genuinely two.
            // An accepted in-session cut changes the bar the athlete has to
            // build, so the stack draws that; the prescription it replaced stays
            // recorded on targetWeight.
            const barWeight = set.adjustedWeight ?? set.targetWeight;
            const prevBarWeight = ex.sets[setIdx - 1]?.adjustedWeight ?? ex.sets[setIdx - 1]?.targetWeight;
            const showPlates = !!ex.barLoaded && !!barWeight && barWeight !== prevBarWeight;
            return (
              <SetRow
                key={set.uid}
                set={set}
                showPlates={showPlates}
                barWeight={barWeight}
                barLoading={barLoading}
                onChangeField={(field, v) => actions.updateSetField(exIdx, setIdx, field, v)}
                onEndEditing={(field) => actions.maybePromptPrefill(exIdx, setIdx, field)}
                onRpeFocus={actions.handleRpeFocus}
                onRemove={() => actions.removeSet(exIdx, setIdx)}
                onComplete={() => actions.completeSet(exIdx, setIdx)}
                onUncomplete={() => actions.uncompleteSet(exIdx, setIdx)}
              />
            );
          })}

          {/* The mid-session load cut, under the exercise it applies to. */}
          {adjustment && (
            <LoadAdjustCard
              adjustment={adjustment}
              exerciseName={exName(ex.name)}
              onApply={actions.applyAdjustment}
              onDismiss={actions.dismissAdjustment}
            />
          )}

          {/* Add Set */}
          <TouchableOpacity accessibilityRole="button" style={styles.addSetBtn} onPress={() => actions.addSet(exIdx)}>
            <Text style={styles.addSetBtnText}>{t('activeWorkout.addSet')}</Text>
          </TouchableOpacity>

          {ex.sets.some((s) => s.isCompleted) && (
            <ExerciseReview
              exercise={ex}
              onRate={(n) => actions.updateExerciseField(exIdx, 'techniqueRating', n)}
              onChangeNotes={(v) => actions.updateExerciseField(exIdx, 'exerciseNotes', v)}
            />
          )}
        </>
      )}
    </View>
  );
};
