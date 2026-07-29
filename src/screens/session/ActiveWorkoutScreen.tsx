import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Vibration,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette, alpha } from '../../theme';
import { sessionService } from '../../services/session.service';
import { exerciseCueKey, ExerciseCue } from '../../services/exerciseCue.service';
import { useSettingsStore } from '../../stores/settings.store';
import { classifyExercise } from '../../utils/exerciseType';
import { useExerciseName } from '../../hooks/useExerciseName';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useExerciseCues } from '../../hooks/useExerciseCues';
import { Barbell, Trophy } from 'phosphor-react-native';

import { RpeGuideModal } from './components/RpeGuideModal';
import { CueReminderModal } from './components/CueReminderModal';
import { RestTimerBanner } from './components/RestTimerBanner';
import { AddExerciseModal } from './components/AddExerciseModal';
import { SubstituteExerciseModal } from './components/SubstituteExerciseModal';
type ActiveWorkoutRouteProp = RouteProp<RootStackParamList, 'ActiveWorkout'>;

interface Exercise {
  name: string;
  order: number;
  sets: LocalSet[];
  isExpanded: boolean;
  techniqueRating?: number;
  exerciseNotes?: string;
  // Coaching cue from the generated plan (e.g. "keep elbows tucked"). Surfaced
  // during the workout so the user knows what to watch — and can answer the
  // Technique self-report meaningfully instead of guessing.
  cue?: string;
}

// Stable, monotonically-increasing client-side id for a set row. Unlike
// setNumber (a display position that shifts when sets are added/removed) this
// never changes for the life of a row, so async saves and removals always
// target the right set even after the list has been reordered.
let setUidCounter = 0;
const nextSetUid = () => `set-${++setUidCounter}`;

interface LocalSet {
  id?: string;
  // Stable client-side identity (see nextSetUid). Used for React keys and to
  // patch the correct set after an async save, independent of its index.
  uid: string;
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
  // What the plan prescribed for this set — sent to the API so the coach can
  // compare prescribed-vs-actual RPE and drive progression. Undefined for sets
  // added manually mid-workout (no prescription).
  targetReps?: number;
  targetWeight?: number;
  targetRpe?: number;
  isCompleted: boolean;
  isSaving?: boolean;
  prs?: import('../../services/session.service').PRResult[];
}

const COMMON_EXERCISES = [
  // Big compounds
  'Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Front Squat', 'Sumo Deadlift', 'Rack Pull', 'Trap Bar Deadlift', 'Romanian Deadlift',
  'Good Morning', 'Close-Grip Bench Press', 'Incline Bench Press', 'Decline Bench Press',

  // Chest
  'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Decline Dumbbell Press',
  'Cable Fly', 'Incline Cable Fly', 'Pec Deck', 'Push-up', 'Dip',

  // Back
  'Pull-up', 'Chin-up', 'Lat Pulldown', 'Close-Grip Lat Pulldown',
  'Seated Cable Row', 'Cable Row', 'Single-Arm Dumbbell Row', 'T-Bar Row',
  'Chest-Supported Row', 'Meadows Row', 'Pendlay Row', 'Straight-Arm Pulldown',
  'Face Pull', 'Shrug', 'Barbell Shrug',

  // Shoulders
  'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Dumbbell Lateral Raise',
  'Cable Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Rear Delt Cable Fly',
  'Upright Row', 'Cable Upright Row',

  // Arms — Biceps
  'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl',
  'Concentration Curl', 'Cable Curl', 'EZ-Bar Curl', 'Incline Dumbbell Curl',
  'Spider Curl', 'Reverse Curl',

  // Arms — Triceps
  'Tricep Pushdown', 'Overhead Tricep Extension', 'Skull Crusher',
  'Cable Overhead Tricep Extension', 'Tricep Kickback', 'Diamond Push-up',
  'JM Press',

  // Legs
  'Leg Press', 'Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat',
  'Leg Extension', 'Leg Curl', 'Seated Leg Curl', 'Hip Thrust',
  'Glute Bridge', 'Single-Leg Hip Thrust', 'Step Up', 'Lunges',
  'Walking Lunges', 'Reverse Lunge', 'Calf Raise', 'Seated Calf Raise',
  'Leg Press Calf Raise', 'Nordic Curl',

  // Core
  'Plank', 'Side Plank', 'Ab Rollout', 'Cable Crunch', 'Hanging Leg Raise',
  'Hanging Knee Raise', 'Russian Twist', 'Dead Bug', 'Pallof Press',
  'Sit-up', 'Crunch', 'Dragon Flag', 'L-Sit', 'Landmine Rotation',

  // Olympic / Athletic
  'Power Clean', 'Hang Clean', 'Clean and Press', 'Snatch',
  'Push Press', 'Push Jerk',

  // Machines
  'Chest Press Machine', 'Shoulder Press Machine', 'Seated Row Machine',
  'Leg Press Machine', 'Smith Machine Squat', 'Smith Machine Bench',
  'Cable Crossover', 'Assisted Pull-up', 'Assisted Dip',
];

const KEY_EXERCISE_PATTERN = /\bsquat\b|\bbench\b|\bdeadlift\b/i;

const SUBSTITUTE_MAP: Record<string, string[]> = {
  squat: ['Hack Squat', 'Leg Press', 'Bulgarian Split Squat', 'Goblet Squat', 'Smith Machine Squat'],
  bench: ['Dumbbell Bench Press', 'Incline Bench Press', 'Cable Fly', 'Dip', 'Machine Chest Press'],
  deadlift: ['Romanian Deadlift', 'Rack Pull', 'Trap Bar Deadlift', 'Good Morning', 'Leg Press'],
  ohp: ['Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Arnold Press', 'Landmine Press', 'Cable Lateral Raise'],
  row: ['Seated Cable Row', 'Dumbbell Row', 'Machine Row', 'T-Bar Row', 'Chest-Supported Row'],
  pulldown: ['Pull-up', 'Assisted Pull-up', 'Cable Pullover', 'Straight-Arm Pulldown'],
  curl: ['Hammer Curl', 'Cable Curl', 'Preacher Curl', 'Concentration Curl', 'Incline Dumbbell Curl'],
  tricep: ['Skull Crusher', 'Close-Grip Bench', 'Cable Pushdown', 'Overhead Tricep Extension', 'Dip'],
  lunge: ['Bulgarian Split Squat', 'Step Up', 'Reverse Lunge', 'Walking Lunge', 'Leg Press'],
  rdl: ['Good Morning', 'Leg Curl', 'Hip Thrust', 'Glute Bridge', 'Stiff-Leg Deadlift'],
};

function getSubstitutes(exerciseName: string): string[] {
  const n = exerciseName.toLowerCase();
  for (const [key, subs] of Object.entries(SUBSTITUTE_MAP)) {
    if (n.includes(key)) return subs.filter(s => s.toLowerCase() !== n);
  }
  return COMMON_EXERCISES.filter(e => e.toLowerCase() !== n).slice(0, 5);
}

// Curated search queries — targeted to reliable channels so the first YouTube result
// is consistently a high-quality, technique-focused tutorial.
const TUTORIAL_QUERIES: Record<string, string> = {
  'squat':              'squat university back squat tutorial',
  'bench press':        'jeff nippard bench press tutorial',
  'deadlift':           'alan thrall how to deadlift',
  'overhead press':     'jeff nippard overhead press tutorial',
  'ohp':                'jeff nippard overhead press tutorial',
  'shoulder press':     'jeff nippard overhead press tutorial',
  'romanian deadlift':  'jeff nippard romanian deadlift form',
  'rdl':                'jeff nippard romanian deadlift form',
  'pull-up':            'jeff nippard pull up tutorial',
  'chin-up':            'athlean x chin up vs pull up',
  'barbell row':        'jeff nippard barbell row tutorial',
  'cable row':          'jeff nippard seated cable row',
  'seated cable row':   'jeff nippard seated cable row',
  'dumbbell row':       'jeff nippard dumbbell row tutorial',
  'lat pulldown':       'jeff nippard lat pulldown tutorial',
  't-bar row':          'jeff nippard t bar row tutorial',
  'incline bench':      'jeff nippard incline bench press',
  'dip':                'athlean x dips chest vs tricep',
  'leg press':          'jeff nippard leg press tutorial',
  'lunge':              'squat university lunge tutorial',
  'bulgarian split squat': 'jeff nippard bulgarian split squat',
  'hip thrust':         'bret contreras hip thrust tutorial',
  'glute bridge':       'bret contreras glute bridge tutorial',
  'leg curl':           'jeff nippard leg curl tutorial',
  'leg extension':      'jeff nippard leg extension tutorial',
  'hack squat':         'jeff nippard hack squat tutorial',
  'goblet squat':       'squat university goblet squat',
  'calf raise':         'athlean x calf raises tutorial',
  'face pull':          'jeff nippard face pull tutorial',
  'lateral raise':      'jeff nippard lateral raise tutorial',
  'front raise':        'athlean x front raise',
  'upright row':        'jeff nippard upright row tutorial',
  'curl':               'jeff nippard bicep curl tutorial',
  'hammer curl':        'jeff nippard hammer curl',
  'preacher curl':      'jeff nippard preacher curl',
  'cable curl':         'athlean x cable curl tutorial',
  'tricep pushdown':    'jeff nippard tricep pushdown',
  'skull crusher':      'jeff nippard skull crusher',
  'close grip bench':   'jeff nippard close grip bench press',
  'overhead tricep':    'athlean x overhead tricep extension',
  'cable fly':          'jeff nippard cable fly chest',
  'chest fly':          'jeff nippard chest fly tutorial',
  'incline dumbbell':   'jeff nippard incline dumbbell press',
  'good morning':       'alan thrall good morning tutorial',
  'rack pull':          'alan thrall rack pull tutorial',
  'trap bar deadlift':  'alan thrall trap bar deadlift',
  'sumo deadlift':      'alan thrall sumo deadlift',
  'arnold press':       'jeff nippard arnold press',
  'plank':              'athlean x plank tutorial',
  'ab wheel':           'athlean x ab wheel rollout',
  'hanging leg raise':  'athlean x hanging leg raise',
};

function openTutorial(exerciseName: string): void {
  const n = exerciseName.toLowerCase();
  let query = '';

  for (const [key, q] of Object.entries(TUTORIAL_QUERIES)) {
    if (n.includes(key)) { query = q; break; }
  }

  if (!query) {
    query = `${exerciseName} proper form tutorial`;
  }

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('Could not open YouTube', 'Make sure you have a browser or YouTube installed.')
  );
}

export const ActiveWorkoutScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ActiveWorkoutRouteProp>();
  const { sessionId, plannedExercises } = route.params;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [substituteIdx, setSubstituteIdx] = useState<number | null>(null);
  const [rpeGuideVisible, setRpeGuideVisible] = useState(false);
  const rpeGuideSeen = useRef(false);

  // Which exercise (by index) has its inline "add a cue" form open.
  const [addCueFor, setAddCueFor] = useState<number | null>(null);
  const [newCueText, setNewCueText] = useState('');
  // Remembers which (exercise, field, value) prefill prompts we've already shown,
  // so blurring the same field repeatedly doesn't re-ask for the same value.
  const prefillAskedRef = useRef<Set<string>>(new Set());
  const compoundRestSecs = useSettingsStore((s) => s.compoundRestSecs);
  const isolationRestSecs = useSettingsStore((s) => s.isolationRestSecs);

  const { elapsedSeconds, isPaused, resume: resumeTimer, markActivity, syncStart } = useWorkoutTimer();
  const { restSecs, startRest, stopRest, adjustRest } = useRestTimer(sessionId);

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

  // Always fetch the session to restore the clock and any logged sets.
  // Falls back to plannedExercises if the session has no sets yet (e.g. resumed before logging anything).
  useEffect(() => {
    sessionService.getSession(sessionId).then((session) => {
      if (session.startedAt) {
        syncStart(new Date(session.startedAt).getTime());
      }

      if (session.sets?.length) {
        // Build a lookup of logged sets by exercise name
        const loggedByName = new Map<string, { order: number; sets: typeof session.sets }>();
        for (const s of session.sets) {
          const entry = loggedByName.get(s.exerciseName) ?? { order: s.exerciseOrder, sets: [] };
          entry.sets.push(s);
          loggedByName.set(s.exerciseName, entry);
        }

        const mapLoggedSets = (sets: typeof session.sets): LocalSet[] =>
          sets.sort((a, b) => a.setNumber - b.setNumber).map((s, i) => ({
            id: s.id,
            uid: nextSetUid(),
            // Renumber to a contiguous 1..N on load so a set removed in a prior
            // session doesn't leave a gap that confuses the display or a later add.
            setNumber: i + 1,
            reps: s.repsCompleted != null ? String(s.repsCompleted) : '',
            weight: s.weightUsed != null ? String(s.weightUsed) : '',
            rpe: s.rpe != null ? String(s.rpe) : '',
            targetReps: s.targetReps ?? undefined,
            targetWeight: s.targetWeight ?? undefined,
            targetRpe: s.targetRpe ?? undefined,
            isCompleted: s.isCompleted,
            prs: s.prs,
          }));

        if (plannedExercises?.length) {
          // Merge plan + logged sets so exercises with no logged sets are preserved
          const loaded: Exercise[] = plannedExercises.map((pe, order) => {
            const logged = loggedByName.get(pe.name);
            const loggedSets = logged ? mapLoggedSets(logged.sets) : [];
            const remaining: LocalSet[] = loggedSets.length < pe.sets
              ? Array.from({ length: pe.sets - loggedSets.length }, (_, i) => ({
                  uid: nextSetUid(),
                  setNumber: loggedSets.length + i + 1,
                  reps: String(pe.reps),
                  weight: String(pe.weight),
                  rpe: '',
                  targetReps: pe.reps,
                  targetWeight: pe.weight,
                  targetRpe: pe.rpe,
                  isCompleted: false,
                }))
              : [];
            return { name: pe.name, order, isExpanded: true, cue: pe.cue, sets: [...loggedSets, ...remaining] };
          });
          // Append any exercises added mid-workout that aren't in the plan
          for (const [name, { order, sets }] of loggedByName) {
            if (!plannedExercises.some((pe) => pe.name === name)) {
              loaded.push({ name, order, isExpanded: true, sets: mapLoggedSets(sets) });
            }
          }
          loaded.sort((a, b) => a.order - b.order);
          setExercises(loaded);
        } else {
          // No plan available — restore from logged sets only
          const loaded: Exercise[] = Array.from(loggedByName.entries())
            .sort((a, b) => a[1].order - b[1].order)
            .map(([name, { order, sets }]) => ({
              name,
              order,
              isExpanded: true,
              sets: mapLoggedSets(sets),
            }));
          setExercises(loaded);
        }
      } else if (plannedExercises?.length) {
        // No sets logged yet — restore from planned exercises (e.g. user resumed before logging any set)
        setExercises(plannedExercises.map((pe, order) => ({
          name: pe.name,
          order,
          isExpanded: true,
          cue: pe.cue,
          sets: Array.from({ length: pe.sets }, (_, i) => ({
            uid: nextSetUid(),
            setNumber: i + 1,
            reps: String(pe.reps),
            weight: String(pe.weight),
            rpe: '',
            targetReps: pe.reps,
            targetWeight: pe.weight,
            targetRpe: pe.rpe,
            isCompleted: false,
          })),
        })));
      }
      setResumeLoading(false);
    }).catch(() => setResumeLoading(false));
  }, [sessionId]);

  const savePersonalCue = async (exIdx: number) => {
    const ok = await saveCue(exercises[exIdx].name, newCueText);
    if (!ok) {
      if (newCueText.trim()) Alert.alert('Error', 'Could not save cue. Check connection.');
      return;
    }
    setAddCueFor(null);
    setNewCueText('');
  };

  const deletePersonalCue = async (cue: ExerciseCue) => {
    if (!(await deleteCue(cue))) Alert.alert('Error', 'Could not delete cue.');
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exIdx] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets = [
        ...ex.sets,
        {
          uid: nextSetUid(),
          setNumber: ex.sets.length + 1,
          reps: lastSet?.reps ?? '',
          weight: lastSet?.weight ?? '',
          rpe: '',
          isCompleted: false,
        },
      ];
      updated[exIdx] = ex;
      return updated;
    });
  };

  const updateExerciseField = (exIdx: number, field: 'techniqueRating' | 'exerciseNotes', value: number | string) => {
    setExercises((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, [field]: value } : ex));
  };

  const updateSetField = (exIdx: number, setIdx: number, field: keyof LocalSet, value: string | boolean) => {
    setSetState(exIdx, setIdx, { [field]: value });
  };

  // Merge a partial update into one set. Use this (not updateSetField) when
  // changing multiple fields at once or non-string/boolean fields like `prs`.
  const setSetState = (exIdx: number, setIdx: number, patch: Partial<LocalSet>) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exIdx] };
      ex.sets = ex.sets.map((s, i) => i === setIdx ? { ...s, ...patch } : s);
      updated[exIdx] = ex;
      return updated;
    });
  };

  // Patch a set by its stable uid rather than its index. Use this from async
  // callbacks (e.g. after a save resolves): by the time the promise settles the
  // set may have shifted position — or been removed — so an index would be stale
  // and could clobber the wrong row.
  const patchSetByUid = (exIdx: number, uid: string, patch: Partial<LocalSet>) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exIdx] };
      ex.sets = ex.sets.map((s) => s.uid === uid ? { ...s, ...patch } : s);
      updated[exIdx] = ex;
      return updated;
    });
  };

  // After editing one set's weight/RPE, offer to copy that value into the
  // exercise's other not-yet-completed sets (e.g. bump Squat 120→125 and apply
  // 125 to the remaining sets in one tap). Only prompts when there's actually a
  // different value to copy into, and never re-asks for the same value.
  const maybePromptPrefill = (exIdx: number, setIdx: number, field: 'weight' | 'rpe') => {
    const ex = exercises[exIdx];
    const value = ex?.sets[setIdx]?.[field];
    if (!ex || !value) return;

    const targets = ex.sets.filter((s, i) => i !== setIdx && !s.isCompleted && s[field] !== value);
    if (targets.length === 0) return;

    const key = `${exIdx}:${field}:${value}`;
    if (prefillAskedRef.current.has(key)) return;
    prefillAskedRef.current.add(key);

    const isWeight = field === 'weight';
    const display = isWeight ? `${value}kg` : `RPE ${value}`;
    Alert.alert(
      'Apply to other sets?',
      `Use ${display} for the other ${targets.length} ${targets.length > 1 ? 'sets' : 'set'} of ${ex.name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () =>
            setExercises((prev) => {
              const updated = [...prev];
              const e = { ...updated[exIdx] };
              e.sets = e.sets.map((s, i) =>
                i !== setIdx && !s.isCompleted ? { ...s, [field]: value } : s,
              );
              updated[exIdx] = e;
              return updated;
            }),
        },
      ],
    );
  };

  const completeSet = async (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Ignore taps while a save is already in flight — otherwise a double-tap can
    // start a second save (or an un-complete) before the first has returned an id,
    // leaving the server and the UI out of sync.
    if (set.isSaving) return;
    if (!set.reps && !set.weight) {
      Alert.alert('Empty set', 'Enter at least reps or weight before marking complete.');
      return;
    }

    Vibration.vibrate(40);
    markActivity();
    const restDuration = classifyExercise(ex.name) === 'compound' ? compoundRestSecs : isolationRestSecs;
    startRest(restDuration);
    patchSetByUid(exIdx, set.uid, { isCompleted: true, isSaving: true });

    try {
      if (set.id) {
        await sessionService.updateSet(set.id, {
          repsCompleted: set.reps ? parseInt(set.reps) : undefined,
          weightUsed: set.weight ? parseFloat(set.weight) : undefined,
          rpe: set.rpe ? parseFloat(set.rpe) : undefined,
          isCompleted: true,
        });
        patchSetByUid(exIdx, set.uid, { isSaving: false });
      } else {
        const saved = await sessionService.addSet(sessionId, {
          exerciseName: ex.name,
          exerciseOrder: ex.order,
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          targetRpe: set.targetRpe,
          repsCompleted: set.reps ? parseInt(set.reps) : undefined,
          weightUsed: set.weight ? parseFloat(set.weight) : undefined,
          rpe: set.rpe ? parseFloat(set.rpe) : undefined,
          isCompleted: true,
        });
        if (saved.prs && saved.prs.length > 0) {
          Vibration.vibrate([0, 60, 40, 60]);
        }
        patchSetByUid(exIdx, set.uid, { id: saved.id, prs: saved.prs, isSaving: false });
      }
    } catch {
      patchSetByUid(exIdx, set.uid, { isCompleted: false, isSaving: false });
      Alert.alert('Error', 'Could not save set. Check connection.');
    }
  };

  const uncompleteSet = async (exIdx: number, setIdx: number) => {
    const set = exercises[exIdx].sets[setIdx];
    // Don't let an un-complete race an in-flight save of the same set.
    if (set.isSaving) return;
    const prevPrs = set.prs;

    Vibration.vibrate(30);
    stopRest();
    // Un-completing also clears any PR this set earned — the backend drops the
    // PR flag, so mirror that locally to hide the trophy (and keep it out of the
    // end-of-session summary).
    patchSetByUid(exIdx, set.uid, { isCompleted: false, prs: undefined });

    if (set.id) {
      try {
        await sessionService.updateSet(set.id, { isCompleted: false });
      } catch {
        patchSetByUid(exIdx, set.uid, { isCompleted: true, prs: prevPrs });
        Alert.alert('Error', 'Could not update set. Check connection.');
      }
    }
  };

  const toggleExpand = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => i === exIdx ? { ...ex, isExpanded: !ex.isExpanded } : ex)
    );
  };

  const substituteExercise = (exIdx: number, newName: string) => {
    setExercises((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, name: newName } : ex));
    setSubstituteIdx(null);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Don't pull a set out from under an in-flight save.
    if (set.isSaving) return;

    const doRemove = () => {
      // Delete the persisted row if this set was already saved; ignore failures
      // so the local UI still updates (it'll reconcile on next resume).
      if (set.id) sessionService.deleteSet(set.id).catch(() => {});
      // If we're deleting the set that kicked off the current rest countdown,
      // stop the rest — there's no set left to rest from.
      if (set.isCompleted) stopRest();
      setExercises((prev) => {
        const updated = [...prev];
        const e = { ...updated[exIdx] };
        // Drop by uid and renumber the survivors to a contiguous 1..N so the
        // display and any subsequently-added set stay in sequence.
        e.sets = e.sets
          .filter((s) => s.uid !== set.uid)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        updated[exIdx] = e;
        return updated;
      });
    };

    // Confirm before deleting a set that holds logged data; drop an empty,
    // never-saved row instantly (nothing to lose).
    if (set.id || set.isCompleted) {
      Alert.alert(
        'Remove set?',
        `This will delete set ${set.setNumber} of ${exName(ex.name)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doRemove },
        ],
      );
    } else {
      doRemove();
    }
  };

  const removeExercise = (exIdx: number) => {
    Alert.alert('Remove exercise?', exercises[exIdx].name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const toDelete = exercises[exIdx].sets.filter((s) => s.id);
          toDelete.forEach((s) => sessionService.deleteSet(s.id!).catch(() => {}));
          setExercises((prev) => prev.filter((_, i) => i !== exIdx));
        },
      },
    ]);
  };

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

  const handleRpeFocus = async () => {
    if (rpeGuideSeen.current) return;
    rpeGuideSeen.current = true;
    const seen = await AsyncStorage.getItem('hasSeenRPEGuide');
    if (!seen) {
      setRpeGuideVisible(true);
      await AsyncStorage.setItem('hasSeenRPEGuide', '1');
    }
  };

  const handleFinish = () => {
    const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
    if (completedSets === 0) {
      Alert.alert('No sets logged', 'Complete at least one set before finishing.');
      return;
    }
    // The workout is over — drop any lingering rest beep/countdown.
    stopRest();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">

        {/* Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleMinimize}
            onLongPress={handleCancel}
            delayLongPress={600}
          >
            <Text style={styles.cancelBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerBlock}
            activeOpacity={isPaused ? 0.6 : 1}
            onPress={isPaused ? resumeTimer : undefined}
          >
            <Text style={[styles.timerLabel, isPaused && styles.timerLabelPaused]}>
              {isPaused ? 'PAUSED' : t('activeWorkout.time')}
            </Text>
            <Text style={[styles.timer, isPaused && styles.timerPaused]}>{formatTime(elapsedSeconds)}</Text>
          </TouchableOpacity>
          <View style={styles.progressBlock}>
            <Text style={styles.progressLabel}>{t('activeWorkout.setsDone')}</Text>
            <Text style={styles.progressValue}>{completedSets}/{totalSets}</Text>
          </View>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>{t('activeWorkout.finish')}</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }]} />
        </View>
        <Text style={styles.minimizeHint}>{t('activeWorkout.tapToGoBack')}  ·  {t('activeWorkout.holdToCancel')}</Text>

        {/* Idle Auto-Pause Banner */}
        {isPaused && (
          <View style={styles.pausedBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>⏸ Timer paused</Text>
              <Text style={styles.pausedText}>
                You were idle for a while, so we stopped the clock. The idle time isn't counted.
              </Text>
            </View>
            <TouchableOpacity style={styles.resumeBtn} onPress={resumeTimer}>
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}

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
            <View key={`${ex.name}-${exIdx}`} style={styles.exerciseCard}>
              {/* Exercise Header */}
              <TouchableOpacity style={styles.exerciseHeader} onPress={() => toggleExpand(exIdx)}>
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
                  onPress={() => setSubstituteIdx(exIdx)}
                  style={styles.substituteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('activeWorkout.substituteExercise', { defaultValue: 'Substitute exercise' })}
                >
                  <Text style={styles.substituteBtnText}>⇄</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeExercise(exIdx)}
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

                  {/* Personal cues the athlete saved for this exercise, plus the
                      inline form to add another for next time. */}
                  {(() => {
                    const myCues = cuesByKey.get(exerciseCueKey(ex.name)) ?? [];
                    return (
                      <View style={styles.personalCuesBlock}>
                        {myCues.map((c) => (
                          <View key={c.id} style={styles.personalCueRow}>
                            <Text style={styles.personalCueText}>💡 {c.text}</Text>
                            <TouchableOpacity
                              onPress={() => deletePersonalCue(c)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={t('activeWorkout.deleteCue', { defaultValue: 'Delete cue' })}
                            >
                              <Text style={styles.personalCueDelete}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                        {addCueFor === exIdx ? (
                          <View style={styles.addCueForm}>
                            <TextInput
                              style={styles.addCueInput}
                              value={newCueText}
                              onChangeText={setNewCueText}
                              placeholder={t('activeWorkout.cuePlaceholder', { defaultValue: 'e.g. Pull the elbows down' })}
                              placeholderTextColor={palette.gray[600]}
                              autoFocus
                              multiline
                              maxLength={500}
                            />
                            <View style={styles.addCueActions}>
                              <TouchableOpacity
                                onPress={() => { setAddCueFor(null); setNewCueText(''); }}
                                accessibilityRole="button"
                              >
                                <Text style={styles.addCueCancel}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.addCueSave, (!newCueText.trim() || savingCue) && styles.addCueSaveDisabled]}
                                onPress={() => savePersonalCue(exIdx)}
                                disabled={savingCue || !newCueText.trim()}
                                accessibilityRole="button"
                              >
                                {savingCue
                                  ? <ActivityIndicator color={palette.white} size="small" />
                                  : <Text style={styles.addCueSaveText}>{t('common.save', { defaultValue: 'Save' })}</Text>}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addCueBtn}
                            onPress={() => { setAddCueFor(exIdx); setNewCueText(''); }}
                            accessibilityRole="button"
                          >
                            <Text style={styles.addCueBtnText}>
                              + {t('activeWorkout.addCue', { defaultValue: 'Add a cue for next time' })}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })()}

                  {/* Column Headers */}
                  <View style={styles.colHeaders}>
                    <Text style={[styles.colHeader, { width: 30 }]}>{t('activeWorkout.set')}</Text>
                    <Text style={[styles.colHeader, { flex: 1 }]}>{t('activeWorkout.weight')}</Text>
                    <Text style={[styles.colHeader, { flex: 1 }]}>{t('activeWorkout.repsLabel')}</Text>
                    <TouchableOpacity
                      style={{ width: 50, flexDirection: 'row', alignItems: 'center', gap: 2 }}
                      onPress={() => setRpeGuideVisible(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.colHeader}>{t('activeWorkout.rpeLabel')}</Text>
                      <Text style={{ fontSize: 10, color: palette.brand[400] }}>ℹ</Text>
                    </TouchableOpacity>
                    <View style={{ width: 70 }} />
                  </View>

                  {/* Sets */}
                  {ex.sets.map((set, setIdx) => {
                    const hasTruePR = !!set.prs?.some((p) => p.tier === 'pr');
                    return (
                    <View key={set.uid}>
                      <View style={[styles.setRow, set.isCompleted && styles.setRowDone, hasTruePR && styles.setRowPR]}>
                        <Text style={[styles.setNum, set.isCompleted && styles.setNumDone, hasTruePR && styles.setNumPR]}>
                          {hasTruePR ? <Trophy size={14} weight="fill" color={palette.brand[400]} /> : set.setNumber}
                        </Text>

                        <TextInput
                          style={[styles.setInput, { flex: 1 }, set.isCompleted && styles.setInputDone]}
                          value={set.weight}
                          onChangeText={(v) => updateSetField(exIdx, setIdx, 'weight', v)}
                          onEndEditing={() => maybePromptPrefill(exIdx, setIdx, 'weight')}
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={palette.gray[600]}
                          editable={!set.isCompleted}
                        />
                        <TextInput
                          style={[styles.setInput, { flex: 1 }, set.isCompleted && styles.setInputDone]}
                          value={set.reps}
                          onChangeText={(v) => updateSetField(exIdx, setIdx, 'reps', v)}
                          keyboardType="number-pad"
                          placeholder="—"
                          placeholderTextColor={palette.gray[600]}
                          editable={!set.isCompleted}
                        />
                        <TextInput
                          style={[styles.setInput, { width: 50 }, set.isCompleted && styles.setInputDone]}
                          value={set.rpe}
                          onChangeText={(v) => updateSetField(exIdx, setIdx, 'rpe', v)}
                          onEndEditing={() => maybePromptPrefill(exIdx, setIdx, 'rpe')}
                          onFocus={handleRpeFocus}
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={palette.gray[600]}
                          editable={!set.isCompleted}
                        />

                        <View style={styles.setActions}>
                          <TouchableOpacity
                            style={styles.removeSetBtn}
                            onPress={() => removeSet(exIdx, setIdx)}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            accessibilityRole="button"
                            accessibilityLabel={t('activeWorkout.removeSet', { defaultValue: 'Remove set' })}
                          >
                            <Text style={styles.removeSetBtnText}>✕</Text>
                          </TouchableOpacity>
                          {set.isSaving ? (
                            <View style={styles.logBtn}>
                              <ActivityIndicator color={palette.white} size="small" />
                            </View>
                          ) : set.isCompleted ? (
                            <TouchableOpacity style={styles.doneCheck} onPress={() => uncompleteSet(exIdx, setIdx)}>
                              <Text style={styles.doneCheckText}>✓</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.logBtn} onPress={() => completeSet(exIdx, setIdx)}>
                              <Text style={styles.logBtnText}>✓</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* PR badges */}
                      {set.prs && set.prs.length > 0 && (
                        <View style={[styles.prBadgeRow, !hasTruePR && styles.prBadgeRowMini]}>
                          {set.prs.map((pr) => (
                            <View key={pr.type} style={[styles.prBadge, pr.tier === 'mini' && styles.prBadgeMini]}>
                              <Text style={[styles.prBadgeText, pr.tier === 'mini' && styles.prBadgeMiniText]}>
                                {pr.tier === 'pr'
                                  ? `🏆 PR · ${pr.e1rm ?? pr.value}kg 1RM${pr.prevE1rm ? ` (+${((pr.e1rm ?? pr.value) - pr.prevE1rm).toFixed(1)})` : ' · First ever!'}`
                                  : `mini PR · ${pr.label}: ${pr.value}kg${pr.previous ? ` (+${(pr.value - pr.previous).toFixed(1)})` : ''}`}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    );
                  })}

                  {/* Add Set */}
                  <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
                    <Text style={styles.addSetBtnText}>{t('activeWorkout.addSet')}</Text>
                  </TouchableOpacity>

                  {/* Exercise Review — shown once at least one set is completed */}
                  {ex.sets.some((s) => s.isCompleted) && (
                    <View style={styles.exerciseReview}>
                      <Text style={styles.reviewLabel}>HOW DID IT GO?</Text>

                      {/* Remind the user what the plan asked them to focus on, so
                          their Technique rating/notes are informed, not a guess. */}
                      {ex.cue ? (
                        <View style={styles.reviewCueRow}>
                          <Text style={styles.reviewCueLabel}>{t('activeWorkout.coachFocus')}</Text>
                          <Text style={styles.reviewCueText}>"{ex.cue}"</Text>
                        </View>
                      ) : null}

                      {/* Technique rating 1–5 */}
                      <View style={styles.techRow}>
                        <Text style={styles.techCaption}>Technique</Text>
                        <View style={styles.techDots}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <TouchableOpacity
                              key={n}
                              onPress={() => updateExerciseField(exIdx, 'techniqueRating', n)}
                              style={[styles.techDot, (ex.techniqueRating ?? 0) >= n && styles.techDotActive]}
                            >
                              <Text style={[styles.techDotText, (ex.techniqueRating ?? 0) >= n && styles.techDotTextActive]}>
                                {n}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Notes */}
                      <TextInput
                        style={styles.reviewNotes}
                        value={ex.exerciseNotes ?? ''}
                        onChangeText={(v) => updateExerciseField(exIdx, 'exerciseNotes', v)}
                        placeholder={t('activeWorkout.techniqueNotes')}
                        placeholderTextColor={palette.gray[600]}
                        multiline
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          ))}

          {/* Add Exercise Button */}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowAddExercise(true)}>
            <Text style={styles.addExerciseBtnText}>{t('activeWorkout.addExercise')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Substitute Exercise Modal */}
      {(() => {
        const ex = substituteIdx !== null ? exercises[substituteIdx] : null;
        return (
          <SubstituteExerciseModal
            exerciseName={ex?.name ?? null}
            loggedSetCount={ex ? ex.sets.filter((set) => set.isCompleted && set.id).length : 0}
            isKeyLift={ex ? KEY_EXERCISE_PATTERN.test(ex.name) : false}
            suggestions={ex ? getSubstitutes(ex.name) : []}
            catalogue={COMMON_EXERCISES}
            onClose={() => setSubstituteIdx(null)}
            onSubstitute={(name) => substituteIdx !== null && substituteExercise(substituteIdx, name)}
            exName={exName}
          />
        );
      })()}

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAdd={addExercise}
        catalogue={COMMON_EXERCISES}
      />

      {/* RPE Guide Modal */}
      <RpeGuideModal visible={rpeGuideVisible} onClose={() => setRpeGuideVisible(false)} />

      <CueReminderModal reminder={cueReminder} onDismiss={dismissReminder} exName={exName} />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  timerBlock: { flex: 1 },
  timerLabel: { fontSize: 10, color: palette.gray[400], fontWeight: '700', letterSpacing: 1 },
  timerLabelPaused: { color: palette.warning[500] },
  timer: { fontSize: 22, fontWeight: '800', color: theme.colors.text, fontVariant: ['tabular-nums'] },
  timerPaused: { color: palette.gray[500] },
  progressBlock: { flex: 1, alignItems: 'center' },
  progressLabel: { fontSize: 10, color: palette.gray[400], fontWeight: '700', letterSpacing: 1 },
  progressValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  finishBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  finishBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelBtnText: { fontSize: 15, color: palette.gray[400], fontWeight: '700' },

  progressBar: { height: 3, backgroundColor: palette.gray[800] },
  progressFill: { height: 3, backgroundColor: palette.brand[500] },
  minimizeHint: { fontSize: 10, color: palette.gray[600], textAlign: 'center', paddingVertical: 4 },

  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: alpha(palette.warning[900], 0.2),
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: palette.warning[500],
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  pausedTitle: { fontSize: 13, fontWeight: '800', color: palette.warning[500], marginBottom: 2 },
  pausedText: { fontSize: 11, color: palette.gray[300], lineHeight: 15 },
  resumeBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  resumeBtnText: { fontSize: 14, fontWeight: '700', color: palette.white },


  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  emptyText: { fontSize: 15, color: palette.gray[400], textAlign: 'center' },

  exerciseCard: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exerciseLeft: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  exerciseMeta: { fontSize: 12, color: palette.gray[400], marginTop: 2 },
  exerciseCue: {
    fontSize: 12,
    color: palette.gray[400],
    fontStyle: 'italic',
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 2,
  },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 13, color: palette.gray[500] },
  chevron: { fontSize: 12, color: palette.gray[400], marginLeft: 4 },

  // Personal cues (saved for next time) + inline add form
  personalCuesBlock: { marginHorizontal: 12, marginTop: 6, marginBottom: 4, gap: 6 },
  personalCueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: alpha(palette.warning[900], 0.133),
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  personalCueText: { flex: 1, fontSize: 13, color: palette.warning[400] },
  personalCueDelete: { fontSize: 12, color: palette.gray[500] },
  addCueBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  addCueBtnText: { fontSize: 12, color: palette.brand[400], fontWeight: '600' },
  addCueForm: { gap: 8 },
  addCueInput: {
    backgroundColor: palette.gray[900],
    borderWidth: 1,
    borderColor: palette.gray[700],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 40,
  },
  addCueActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  addCueCancel: { fontSize: 13, color: palette.gray[400], fontWeight: '600' },
  addCueSave: {
    backgroundColor: palette.brand[600],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  addCueSaveDisabled: { opacity: 0.5 },
  addCueSaveText: { fontSize: 13, color: palette.white, fontWeight: '700' },

  // Cue reminder modal rows

  colHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
    alignItems: 'center',
    gap: 8,
  },
  colHeader: { fontSize: 10, color: palette.gray[500], fontWeight: '700', letterSpacing: 0.8 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
  },
  setRowDone: { backgroundColor: palette.brand[600] + '15' },
  setRowPR: { backgroundColor: palette.warning[900] + '40', borderLeftWidth: 2, borderLeftColor: palette.warning[500] },
  setNum: { width: 30, fontSize: 14, fontWeight: '700', color: palette.gray[400] },
  setNumDone: { color: palette.brand[400] },
  setNumPR: { color: palette.warning[500] },

  prBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: palette.warning[900] + '25' },
  prBadgeRowMini: { backgroundColor: palette.gray[800] },
  prBadge: { backgroundColor: palette.warning[800], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  prBadgeText: { fontSize: 11, color: palette.warning[300], fontWeight: '700' },
  prBadgeMini: { backgroundColor: palette.gray[700] },
  prBadgeMiniText: { color: palette.gray[300] },
  setInput: {
    backgroundColor: palette.gray[700],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  setInputDone: { backgroundColor: palette.gray[900], color: palette.gray[300] },

  setActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeSetBtn: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeSetBtnText: { fontSize: 15, color: palette.gray[500], fontWeight: '700' },
  logBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: { fontSize: 16, color: palette.white, fontWeight: '700' },
  doneCheck: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheckText: { fontSize: 16, color: palette.white, fontWeight: '700' },

  addSetBtn: {
    margin: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.gray[600],
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addSetBtnText: { fontSize: 13, color: palette.gray[400], fontWeight: '600' },

  addExerciseBtn: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.brand[600],
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  addExerciseBtnText: { fontSize: 15, fontWeight: '700', color: palette.brand[400] },

  // Modal

  // Tutorial & Substitute buttons
  tutorialBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: alpha(palette.error[600], 0.133),
    borderWidth: 1,
    borderColor: alpha(palette.error[600], 0.267),
    marginRight: 4,
  },
  tutorialBtnText: { fontSize: 12, color: palette.error[500], fontWeight: '700' },

  substituteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.gray[700],
    marginRight: 4,
  },
  substituteBtnText: { fontSize: 14, color: palette.brand[400], fontWeight: '700' },

  // Substitute modal




  // Per-exercise review section
  exerciseReview: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    backgroundColor: palette.gray[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray[700],
  },
  reviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.brand[400],
    letterSpacing: 1,
    marginBottom: 10,
  },
  reviewCueRow: {
    marginBottom: 10,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: palette.brand[600],
  },
  reviewCueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.gray[500],
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewCueText: { fontSize: 13, color: palette.gray[300], fontStyle: 'italic' },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  techCaption: { fontSize: 13, color: palette.gray[400], fontWeight: '600' },
  techDots: { flexDirection: 'row', gap: 6 },
  techDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: palette.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  techDotActive: { backgroundColor: palette.brand[600] },
  techDotText: { fontSize: 13, fontWeight: '700', color: palette.gray[400] },
  techDotTextActive: { color: palette.white },
  reviewNotes: {
    backgroundColor: palette.gray[800],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

