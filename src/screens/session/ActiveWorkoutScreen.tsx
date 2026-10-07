import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { palette } from '../../theme';
import { exerciseCueKey } from '../../services/exerciseCue.service';
import { useExerciseName } from '../../hooks/useExerciseName';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useExerciseCues } from '../../hooks/useExerciseCues';
import { useTechniqueNudge } from '../../hooks/useTechniqueNudge';
import { Barbell } from 'phosphor-react-native';

import { RpeGuideModal } from './components/RpeGuideModal';
import { CueReminderModal } from './components/CueReminderModal';
import { TechniqueNudgeModal } from './components/TechniqueNudgeModal';
import { RestTimerBanner } from './components/RestTimerBanner';
import { AddExerciseModal } from './components/AddExerciseModal';
import { SubstituteExerciseModal } from './components/SubstituteExerciseModal';
import { WorkoutHeader } from './components/WorkoutHeader';
import { ExerciseCard } from './components/ExerciseCard';
import { clearDraft } from './workoutState';
import { COMMON_EXERCISES, KEY_EXERCISE_PATTERN, getSubstitutes } from './exerciseCatalog';
import { styles } from './ActiveWorkoutScreen.styles';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useLoadAdjustment } from './hooks/useLoadAdjustment';
import { useSetEditing } from './hooks/useSetEditing';
import { useSetSync } from './hooks/useSetSync';
import { useExerciseEditing } from './hooks/useExerciseEditing';
import { useCueForm } from './hooks/useCueForm';
import { useRpeGuide } from './hooks/useRpeGuide';
import { useLastPerformance } from './hooks/useLastPerformance';
import { sessionService } from '../../services/session.service';
import { useLiftingUnit } from '../../units/useLiftingUnit';

type ActiveWorkoutRouteProp = RouteProp<RootStackParamList, 'ActiveWorkout'>;

/**
 * The live workout. Session state, set and exercise editing, the load cut, cues and
 * the RPE guide live in ./hooks; the header and each exercise card in ./components.
 * This screen wires them together and owns leaving the workout (minimize, cancel,
 * finish).
 *
 * Split into hooks and components 2026-10-06 (no behaviour change).
 */
export const ActiveWorkoutScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ActiveWorkoutRouteProp>();
  const { sessionId, plannedExercises, barLoading } = route.params;
  const unit = useLiftingUnit();

  const { elapsedSeconds, isPaused, resume: resumeTimer, markActivity, syncStart } = useWorkoutTimer();
  const { restSecs, startRest, stopRest, adjustRest } = useRestTimer(sessionId);
  const {
    exercises, setExercises, resumeLoading, removedSetIdsRef, sentReviewsRef, resetToPlan,
  } = useWorkoutSession(sessionId, plannedExercises, syncStart, unit);

  // The exercise the athlete is about to do — the first with an incomplete set.
  // Drives which saved cue gets reminded.
  const currentExerciseName = exercises.find((ex) => ex.sets.some((s) => !s.isCompleted))?.name ?? null;
  const {
    cuesByKey,
    cueReminder,
    dismissReminder,
    savingCue,
    saveCue,
    deleteCue,
  } = useExerciseCues(sessionId, currentExerciseName, !resumeLoading);

  // "Film this one once" for a most-trained lift the coach has never seen. Held back
  // until the cue reminder is done so the athlete never gets two sheets at once.
  const { nudge: techniqueNudge, dismiss: dismissTechniqueNudge } = useTechniqueNudge(
    sessionId, currentExerciseName, !resumeLoading && !cueReminder,
  );

  const { adjustment, maybeSuggestAdjustment, applyAdjustment, dismissAdjustment } = useLoadAdjustment(sessionId, setExercises, unit);
  const setSync = useSetSync({
    sessionId, exercises, setExercises, removedSetIdsRef, unit,
    enabled: !resumeLoading,
    // A set that sat in the queue still gets its overshoot question — but only while the
    // exercise has sets left for the answer to change.
    onLateSave: ({ exIdx, ex, set }) => {
      if (ex.sets.some((s) => !s.isCompleted)) maybeSuggestAdjustment(exIdx, ex, set);
    },
  });
  const setEditing = useSetEditing({
    exercises, setExercises, removedSetIdsRef, markActivity, startRest, stopRest, maybeSuggestAdjustment, exName,
    pushSet: setSync.pushSet, flushPending: setSync.flushPending, unsyncedCount: setSync.unsyncedCount, unit,
  });
  const exerciseEditing = useExerciseEditing({ exercises, setExercises, removedSetIdsRef, sentReviewsRef, unit });
  const cueForm = useCueForm(exercises, saveCue, deleteCue);
  const { rpeGuideVisible, setRpeGuideVisible, handleRpeFocus } = useRpeGuide();
  const lastTimeByName = useLastPerformance(exercises.map((ex) => ex.name), !resumeLoading);

  const handleMinimize = () => {
    navigation.navigate('ClientApp');
  };

  const handleCancel = () => {
    Alert.alert(
      t('activeWorkout.cancelWorkout'),
      t('activeWorkout.confirmCancel'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('activeWorkout.cancelWorkout'),
          style: 'destructive',
          onPress: async () => {
            stopRest();
            await clearDraft(sessionId);
            try {
              await sessionService.cancelSession(sessionId);
            } catch {
              // If the session doesn't exist or already deleted, still navigate away
            }
            navigation.reset({ index: 0, routes: [{ name: 'ClientApp' }] });
          },
        },
      ],
    );
  };

  const handleFinish = async () => {
    const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
    if (completedSets === 0) {
      Alert.alert('No sets logged', 'Complete at least one set before finishing.');
      return;
    }
    // The summary completes the session on the server and the debrief reads its sets, so
    // every queued set has to land first. If one cannot, the workout stays open — and its
    // draft stays on the phone — rather than finishing without it.
    if (!(await setSync.flushPending())) {
      Alert.alert(
        t('activeWorkout.unsyncedFinishTitle', { defaultValue: 'Some sets haven\'t synced yet' }),
        t('activeWorkout.unsyncedFinishBody', {
          defaultValue: 'They are saved on this phone. Finish the workout once you have signal — nothing is lost in the meantime.',
        }),
        [
          { text: t('common.ok', { defaultValue: 'OK' }), style: 'cancel' },
          { text: t('activeWorkout.unsyncedRetry', { defaultValue: 'Try again' }), onPress: () => { handleFinish(); } },
        ],
      );
      return;
    }
    // The workout is over — drop any lingering rest beep/countdown, and the draft
    // with it: from here on the session lives on the server.
    stopRest();
    clearDraft(sessionId);
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    const allPRs = exercises.flatMap((ex) =>
      ex.sets.flatMap((s) =>
        (s.prs ?? []).map((pr) => ({ ...pr, exerciseName: ex.name }))
      )
    );
    navigation.replace('SessionSummary', { sessionId, durationMinutes, prs: allPRs.length ? allPRs : undefined });
  };

  const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  // Has the athlete restructured the session away from the plan? Only the exercise
  // list matters — that's all resetToPlan puts back — so an added, removed or
  // swapped movement shows the reset, while editing loads and reps doesn't.
  const divergedFromPlan =
    !!plannedExercises?.length &&
    (exercises.length !== plannedExercises.length ||
      exercises.some((ex, i) => ex.name !== plannedExercises[i].name));

  if (resumeLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color={palette.brand[500]} size="large" />
          <Text style={{ color: palette.gray[400], fontSize: 14 }}>Resuming session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cardActions = {
    toggleExpand: exerciseEditing.toggleExpand,
    toggleWarmup: exerciseEditing.toggleWarmup,
    openSubstitute: exerciseEditing.setSubstituteIdx,
    removeExercise: exerciseEditing.removeExercise,
    openRpeGuide: () => setRpeGuideVisible(true),
    updateSetField: setEditing.updateSetField,
    maybePromptPrefill: setEditing.maybePromptPrefill,
    handleRpeFocus,
    removeSet: setEditing.removeSet,
    completeSet: setEditing.completeSet,
    uncompleteSet: setEditing.uncompleteSet,
    addSet: setEditing.addSet,
    updateExerciseField: setEditing.updateExerciseField,
    applyAdjustment,
    dismissAdjustment,
  };
  const substituteIdx = exerciseEditing.substituteIdx;
  const substituteFor = substituteIdx !== null ? exercises[substituteIdx] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">

        <WorkoutHeader
          elapsedSeconds={elapsedSeconds}
          isPaused={isPaused}
          completedSets={completedSets}
          totalSets={totalSets}
          onMinimize={handleMinimize}
          onCancel={handleCancel}
          onResume={resumeTimer}
          onFinish={handleFinish}
        />

        <RestTimerBanner restSecs={restSecs} onAdjust={adjustRest} onSkip={stopRest} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 && (
            <View style={styles.emptyState}>
              <Barbell size={48} weight="bold" color={palette.gray[600]} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Add your first exercise to start logging</Text>
            </View>
          )}

          {exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={`${ex.name}-${exIdx}`}
              exercise={ex}
              exIdx={exIdx}
              exName={exName}
              barLoading={barLoading}
              adjustment={adjustment?.exIdx === exIdx ? adjustment.data : null}
              lastTime={lastTimeByName[ex.name]}
              cueForm={{
                cues: cuesByKey.get(exerciseCueKey(ex.name)) ?? [],
                open: cueForm.addCueFor === exIdx,
                newCueText: cueForm.newCueText,
                savingCue,
                setNewCueText: cueForm.setNewCueText,
                openForm: () => cueForm.openCueForm(exIdx),
                closeForm: cueForm.closeCueForm,
                save: () => cueForm.savePersonalCue(exIdx),
                remove: cueForm.deletePersonalCue,
              }}
              actions={cardActions}
            />
          ))}

          {/* Add Exercise Button */}
          <TouchableOpacity accessibilityRole="button" style={styles.addExerciseBtn} onPress={() => exerciseEditing.setShowAddExercise(true)}>
            <Text style={styles.addExerciseBtnText}>{t('activeWorkout.addExercise')}</Text>
          </TouchableOpacity>

          {/* Escape hatch back to the generated plan. Only offered once the athlete
              has actually changed something — the session used to reset itself on
              every visit, which is the behaviour this replaces. */}
          {divergedFromPlan && (
            <TouchableOpacity
              style={styles.resetPlanBtn}
              onPress={resetToPlan}
              accessibilityRole="button"
              accessibilityLabel="Reset workout to today's plan"
            >
              <Text style={styles.resetPlanBtnText}>↺ Reset to today's plan</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Substitute Exercise Modal */}
      <SubstituteExerciseModal
        exerciseName={substituteFor?.name ?? null}
        loggedSetCount={substituteFor ? substituteFor.sets.filter((set) => set.isCompleted).length : 0}
        isKeyLift={substituteFor ? KEY_EXERCISE_PATTERN.test(substituteFor.name) : false}
        suggestions={substituteFor ? getSubstitutes(substituteFor.name) : []}
        catalogue={COMMON_EXERCISES}
        onClose={() => exerciseEditing.setSubstituteIdx(null)}
        onSubstitute={(name) => substituteIdx !== null && exerciseEditing.substituteExercise(substituteIdx, name)}
        exName={exName}
      />

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={exerciseEditing.showAddExercise}
        onClose={() => exerciseEditing.setShowAddExercise(false)}
        onAdd={exerciseEditing.addExercise}
        catalogue={COMMON_EXERCISES}
      />

      {/* RPE Guide Modal */}
      <RpeGuideModal visible={rpeGuideVisible} onClose={() => setRpeGuideVisible(false)} />

      <CueReminderModal reminder={cueReminder} onDismiss={dismissReminder} exName={exName} />

      <TechniqueNudgeModal
        nudge={techniqueNudge}
        onDismiss={dismissTechniqueNudge}
        onFilm={() => { dismissTechniqueNudge(); navigation.navigate('FormCheck'); }}
        exName={exName}
      />

    </SafeAreaView>
  );
};
