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
import { aiCoachService, InSessionAdjustment } from '../../services/ai-coach.service';
import { exerciseCueKey, ExerciseCue } from '../../services/exerciseCue.service';
import { useSettingsStore } from '../../stores/settings.store';
import { classifyExercise } from '../../utils/exerciseType';
import { useExerciseName } from '../../hooks/useExerciseName';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useExerciseCues } from '../../hooks/useExerciseCues';
import { useTechniqueNudge } from '../../hooks/useTechniqueNudge';
import { Barbell, Trophy } from 'phosphor-react-native';
import { PlateStack } from '../../components/ui/PlateStack';

import { RpeGuideModal } from './components/RpeGuideModal';
import { CueReminderModal } from './components/CueReminderModal';
import { TechniqueNudgeModal } from './components/TechniqueNudgeModal';
import { RestTimerBanner } from './components/RestTimerBanner';
import { LoadAdjustCard } from './components/LoadAdjustCard';
import { AddExerciseModal } from './components/AddExerciseModal';
import { SubstituteExerciseModal } from './components/SubstituteExerciseModal';
import {
  Exercise,
  LocalSet,
  buildFromPlan,
  clearDraft,
  loadDraft,
  nextSetUid,
  pruneOtherDrafts,
  reconcileDraft,
  saveDraft,
  unresolvedDeletions,
} from './workoutState';
type ActiveWorkoutRouteProp = RouteProp<RootStackParamList, 'ActiveWorkout'>;

// Long enough that typing a set doesn't write on every keystroke, short enough
// that backgrounding the app right after an edit still captures it.
const DRAFT_SAVE_DEBOUNCE_MS = 400;

// How far over the prescribed RPE a set has to land before we ask the coach whether the
// remaining sets should come down. Mirrors MIN_RPE_OVERSHOOT on the backend, which owns
// the decision — this is only here to keep an ordinary set from costing a request.
const ADJUST_RPE_OVERSHOOT = 1;

// The technique note is free text, so wait for a real pause in typing before
// spending a request on it.
const REVIEW_SAVE_DEBOUNCE_MS = 1200;

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
  const { sessionId, plannedExercises, barLoading } = route.params;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  // Sets deleted this session. Persisted with the draft so a delete that failed
  // offline can be retried instead of the row coming back on the next resume.
  const removedSetIdsRef = useRef<Set<string>>(new Set());
  // Last self-report successfully sent per exercise, so an idle re-render doesn't
  // re-PATCH the same rating and note over and over.
  const sentReviewsRef = useRef<Map<string, string>>(new Map());
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [substituteIdx, setSubstituteIdx] = useState<number | null>(null);
  const [rpeGuideVisible, setRpeGuideVisible] = useState(false);
  const rpeGuideSeen = useRef(false);

  // Which exercise (by index) has its inline "add a cue" form open.
  const [addCueFor, setAddCueFor] = useState<number | null>(null);
  const [newCueText, setNewCueText] = useState('');
  // The live in-session load cut, and the exercise it belongs to. At most one is on
  // screen at a time — a workout is not the place for a queue of decisions.
  const [adjustment, setAdjustment] = useState<{ exIdx: number; data: InSessionAdjustment } | null>(null);
  // Sets we've already asked about. A set is one observation and gets one question.
  const adjustAskedRef = useRef<Set<string>>(new Set());
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

  // "Film this one once" for a most-trained lift the coach has never seen. Held back
  // until the cue reminder is done so the athlete never gets two sheets at once.
  const { nudge: techniqueNudge, dismiss: dismissTechniqueNudge } = useTechniqueNudge(
    sessionId, currentExerciseName, !resumeLoading && !cueReminder,
  );

  // Restore the session on mount. Three sources, in order of authority:
  //   1. the local draft — the athlete's own arrangement of the session
  //   2. the server's sets — the truth about anything already saved
  //   3. the plan we were launched with — the fallback when there's no draft
  // Without (1) the screen used to rebuild from (2) + (3) alone, which quietly
  // undid every edit that wasn't a completed set: removed exercises came back,
  // added and swapped ones disappeared, technique notes and typed-but-unticked
  // reps were lost.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [session, draft] = await Promise.all([
          sessionService.getSession(sessionId),
          loadDraft(sessionId),
        ]);
        if (cancelled) return;

        if (session.startedAt) {
          syncStart(new Date(session.startedAt).getTime());
        }

        const serverSets = session.sets ?? [];

        if (draft) {
          removedSetIdsRef.current = new Set(draft.removedSetIds ?? []);
          // A delete that failed while offline left the row on the server. Retry it
          // now rather than resurrecting a set the athlete threw away.
          for (const id of unresolvedDeletions(draft, serverSets)) {
            sessionService.deleteSet(id).catch(() => {});
          }
          setExercises(reconcileDraft(draft, serverSets));
        } else {
          setExercises(buildFromPlan(plannedExercises, serverSets));
        }
      } catch {
        // Offline or the fetch failed: fall back to whatever we have locally so the
        // athlete can keep logging rather than staring at an empty screen.
        const draft = await loadDraft(sessionId);
        if (cancelled) return;
        if (draft) {
          removedSetIdsRef.current = new Set(draft.removedSetIds ?? []);
          setExercises(reconcileDraft(draft, []));
        } else if (plannedExercises?.length) {
          setExercises(buildFromPlan(plannedExercises, []));
        }
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    })();

    // Drafts only mean anything while their session is live; drop the rest.
    pruneOtherDrafts(sessionId);

    return () => { cancelled = true; };
  }, [sessionId]);

  // Persist the athlete's arrangement as they edit it. Debounced because this
  // fires on every keystroke in a reps/weight/notes field.
  useEffect(() => {
    if (resumeLoading) return;
    const timer = setTimeout(() => {
      saveDraft(sessionId, exercises, [...removedSetIdsRef.current]);
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [exercises, resumeLoading, sessionId]);

  /**
   * Push the "HOW DID IT GO?" self-report to the server.
   *
   * The rating and the note describe the exercise, but the only row the API gives
   * us to hang them on is a set — so they ride on the exercise's first saved set,
   * which is exactly where the coach's memory and the technique badge look for
   * them. Until now nothing sent them at all: they lived in component state and
   * died with the screen.
   *
   * Driven by an effect rather than the input handlers because an exercise with
   * nothing logged yet has no row to write to — this way the report is sent as
   * soon as its first set saves, however long after it was typed.
   */
  useEffect(() => {
    if (resumeLoading) return;
    const timer = setTimeout(() => {
      for (const ex of exercises) {
        const anchorId = ex.sets.find((set) => set.id)?.id;
        if (!anchorId) continue;
        if (ex.techniqueRating == null && !ex.exerciseNotes?.trim()) continue;

        // Send the note even when it's been emptied — otherwise the backend's
        // "keep what's there" merge would make a cleared note un-clearable.
        const notes = ex.exerciseNotes?.trim() ?? '';
        const payload = `${anchorId}|${ex.techniqueRating ?? ''}|${notes}`;
        if (sentReviewsRef.current.get(ex.name) === payload) continue;
        sentReviewsRef.current.set(ex.name, payload);

        sessionService
          .updateSet(anchorId, {
            techniqueNotes: notes,
            techniqueRating: ex.techniqueRating,
          })
          .catch(() => {
            // Let the next change retry. The draft still holds it either way —
            // no need to interrupt the workout over a note.
            sentReviewsRef.current.delete(ex.name);
          });
      }
    }, REVIEW_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [exercises, resumeLoading]);

  // Throw away the athlete's edits and go back to the plan as generated. Logged
  // sets survive — only the structure (additions, removals, substitutions) resets.
  const resetToPlan = () => {
    Alert.alert(
      'Reset to today\'s plan?',
      'Exercises you added, removed or swapped go back to the coach\'s plan. Sets you\'ve already logged are kept.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResumeLoading(true);
            await clearDraft(sessionId);
            removedSetIdsRef.current = new Set();
            sentReviewsRef.current = new Map();
            try {
              const session = await sessionService.getSession(sessionId);
              setExercises(buildFromPlan(plannedExercises, session.sets ?? []));
            } catch {
              setExercises(buildFromPlan(plannedExercises, []));
            }
            setResumeLoading(false);
          },
        },
      ],
    );
  };

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

  /**
   * IN-SESSION AUTOREGULATION. A set came back harder than the plan asked for, and there
   * are more of them queued up — ask whether the rest should come down.
   *
   * Fires only on a real overshoot and only once per set, so an ordinary workout costs
   * zero requests. The backend owns the decision and every gate in it (and can only ever
   * answer with a LIGHTER weight); this side just asks the question and renders the
   * answer.
   *
   * Wrapped and silent on failure. A load suggestion is a side feature, and a completed
   * set must never fail because one could not be generated.
   */
  const maybeSuggestAdjustment = async (exIdx: number, ex: Exercise, set: LocalSet) => {
    if (set.targetRpe == null || !set.rpe) return;
    const rated = parseFloat(set.rpe);
    if (!Number.isFinite(rated) || rated - set.targetRpe < ADJUST_RPE_OVERSHOOT) return;

    const key = `${ex.name}:${set.uid}`;
    if (adjustAskedRef.current.has(key)) return;
    adjustAskedRef.current.add(key);

    try {
      const data = await aiCoachService.getInSessionAdjustment(sessionId, ex.name);
      if (data) setAdjustment({ exIdx, data });
    } catch {
      // Silent by design — see above.
    }
  };

  /**
   * Take the cut. Rewrites the WEIGHT INPUT of every set of this exercise the athlete has
   * not done yet, and the plate stack along with it, while leaving targetWeight (the
   * prescription, and what the API is told) untouched — the debrief should still see that
   * this session went under what was asked for, because it did.
   */
  const applyAdjustment = () => {
    if (!adjustment) return;
    const { exIdx, data } = adjustment;
    setExercises((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s) => s.isCompleted
        ? s
        : { ...s, weight: String(data.suggestedWeight), adjustedWeight: data.suggestedWeight }),
    }));
    setAdjustment(null);
    Vibration.vibrate(30);
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
      // After the set is safely on the server, never before: the suggestion reads the set
      // log server-side, and asking about a set that failed to save would recompute
      // against the previous one.
      maybeSuggestAdjustment(exIdx, ex, set);
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
    // The self-report described the movement being replaced, so let the new one
    // re-send its own rather than inheriting a cached "already sent".
    sentReviewsRef.current.delete(exercises[exIdx]?.name ?? '');
    setSubstituteIdx(null);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Don't pull a set out from under an in-flight save.
    if (set.isSaving) return;

    const doRemove = () => {
      // Delete the persisted row if this set was already saved; ignore failures
      // so the local UI still updates. Remember the id either way — that's what
      // stops a failed delete from resurrecting the set on the next resume.
      if (set.id) {
        removedSetIdsRef.current.add(set.id);
        sessionService.deleteSet(set.id).catch(() => {});
      }
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('activeWorkout.minimize', { defaultValue: 'Minimize workout' })}
            accessibilityHint={t('activeWorkout.minimizeHint', { defaultValue: 'Double tap and hold to cancel the workout' })}
          >
            <Text style={styles.cancelBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
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
          <TouchableOpacity accessibilityRole="button" style={styles.finishBtn} onPress={handleFinish}>
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
            <TouchableOpacity accessibilityRole="button" style={styles.resumeBtn} onPress={resumeTimer}>
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
              <TouchableOpacity accessibilityRole="button" style={styles.exerciseHeader} onPress={() => toggleExpand(exIdx)}>
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

                  {/* Cues for this exercise — the athlete's own notes plus the
                      corrections their last form check on this movement raised —
                      and the inline form to add another for next time. */}
                  {(() => {
                    const myCues = cuesByKey.get(exerciseCueKey(ex.name)) ?? [];
                    return (
                      <View style={styles.personalCuesBlock}>
                        {myCues.map((c) => {
                          const fromFormCheck = c.source === 'form-check';
                          return (
                            <View key={c.id} style={styles.personalCueRow}>
                              <View style={styles.personalCueBody}>
                                <Text style={styles.personalCueText}>
                                  {fromFormCheck ? '🎥' : '💡'} {c.text}
                                </Text>
                                {fromFormCheck ? (
                                  <Text style={styles.personalCueOrigin}>
                                    {t('activeWorkout.cueFromFormCheck', { defaultValue: 'From your form check' })}
                                  </Text>
                                ) : null}
                              </View>
                              {/* No delete on a form-check cue: it is derived from the
                                  verdict record, so there is no row to remove. It goes
                                  when the verdict ages out or the lift is re-filmed. */}
                              {fromFormCheck ? null : (
                                <TouchableOpacity
                                  onPress={() => deletePersonalCue(c)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('activeWorkout.deleteCue', { defaultValue: 'Delete cue' })}
                                >
                                  <Text style={styles.personalCueDelete}>✕</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
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
                      accessibilityRole="button"
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
                            <TouchableOpacity
                              style={styles.doneCheck}
                              onPress={() => uncompleteSet(exIdx, setIdx)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={t('activeWorkout.uncompleteSet', { defaultValue: 'Mark set not done' })}
                              accessibilityState={{ checked: true }}
                            >
                              <Text style={styles.doneCheckText}>✓</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.logBtn}
                              onPress={() => completeSet(exIdx, setIdx)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={t('a11y.completeSet', { defaultValue: 'Mark set complete' })}
                              accessibilityState={{ checked: false }}
                            >
                              <Text style={styles.logBtnText}>✓</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* What to hang on the bar for this set's prescribed load.
                          Presentational — it reads targetWeight, never writes one. */}
                      {showPlates && (
                        <PlateStack
                          weightKg={barWeight!}
                          bar={barLoading}
                          perSideLabel={t('activeWorkout.perSide', { defaultValue: 'per side' })}
                        />
                      )}

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

                  {/* The mid-session load cut, under the exercise it applies to. */}
                  {adjustment?.exIdx === exIdx && (
                    <LoadAdjustCard
                      adjustment={adjustment.data}
                      exerciseName={exName(ex.name)}
                      onApply={applyAdjustment}
                      onDismiss={() => setAdjustment(null)}
                    />
                  )}

                  {/* Add Set */}
                  <TouchableOpacity accessibilityRole="button" style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
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
                              accessibilityRole="button"
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
          <TouchableOpacity accessibilityRole="button" style={styles.addExerciseBtn} onPress={() => setShowAddExercise(true)}>
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

      <TechniqueNudgeModal
        nudge={techniqueNudge}
        onDismiss={dismissTechniqueNudge}
        onFilm={() => { dismissTechniqueNudge(); navigation.navigate('FormCheck'); }}
        exName={exName}
      />

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

  // Exercise cues (the athlete's own + form-check verdicts) + inline add form
  personalCuesBlock: { marginHorizontal: 12, marginTop: 6, marginBottom: 4, gap: 6 },
  personalCueRow: {
    flexDirection: 'row',
    // Top-aligned, not centred: a form-check cue carries an origin line under it,
    // and the ✕ on a neighbouring manual cue should not drift to its middle.
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: alpha(palette.warning[900], 0.133),
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  personalCueBody: { flex: 1 },
  personalCueText: { fontSize: 13, color: palette.warning[400] },
  personalCueOrigin: { fontSize: 11, color: palette.gray[500], marginTop: 2 },
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

  resetPlanBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  resetPlanBtnText: { fontSize: 13, fontWeight: '600', color: palette.gray[500] },

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

