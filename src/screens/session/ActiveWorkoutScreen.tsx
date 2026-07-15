import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Vibration,
  ActivityIndicator,
  Linking,
  AppState,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { sessionService } from '../../services/session.service';
import { scheduleRestTimerAlert, cancelRestTimerAlert } from '../../services/pushNotification.service';
import { useSettingsStore } from '../../stores/settings.store';
import { classifyExercise } from '../../utils/exerciseType';
import { useExerciseName } from '../../hooks/useExerciseName';
import { Barbell, Trophy } from 'phosphor-react-native';

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
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [substituteIdx, setSubstituteIdx] = useState<number | null>(null);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [restSecs, setRestSecs] = useState<number | null>(null);
  const [rpeGuideVisible, setRpeGuideVisible] = useState(false);
  const rpeGuideSeen = useRef(false);
  // Remembers which (exercise, field, value) prefill prompts we've already shown,
  // so blurring the same field repeatedly doesn't re-ask for the same value.
  const prefillAskedRef = useRef<Set<string>>(new Set());
  const compoundRestSecs = useSettingsStore((s) => s.compoundRestSecs);
  const isolationRestSecs = useSettingsStore((s) => s.isolationRestSecs);
  // Active-time clock. The visible elapsed time is `accumulatedRef` (active
  // seconds banked from previous running segments) plus the live seconds since
  // `startTime` (the start of the current running segment). Pausing banks the
  // current segment into `accumulatedRef` and freezes the display.
  const startTime = useRef(Date.now());
  const accumulatedRef = useRef(0);
  // Wall-clock time of the last real activity (set logged, manual resume, or
  // session start). Used to auto-pause after a stretch of inactivity so a
  // forgotten/unended workout doesn't keep counting.
  const lastActivityRef = useRef(Date.now());
  const isPausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // Auto-pause once this much time passes with no completed set.
  const IDLE_LIMIT_MS = 15 * 60 * 1000;
  // Absolute wall-clock time (ms) the rest period ends, so the countdown stays
  // accurate across app backgrounding (JS timers freeze in the background).
  const restEndAtRef = useRef<number | null>(null);
  // Id of the scheduled OS notification that beeps when rest ends.
  const restNotifIdRef = useRef<string | null>(null);
  // Where the running rest countdown is mirrored to disk, so it survives the
  // screen unmounting (minimize to a tab, app backgrounded/killed). Keyed by
  // session so a stale timer can't leak into a different workout.
  const restPersistKey = `activeRest:${sessionId}`;

  // Freeze the clock at wall-clock time `at`, banking the active portion of the
  // current segment. Idle time after the last activity is intentionally excluded.
  const pauseAt = useCallback((at: number) => {
    if (isPausedRef.current) return;
    accumulatedRef.current += Math.max(0, Math.floor((at - startTime.current) / 1000));
    isPausedRef.current = true;
    setIsPaused(true);
    setElapsedSeconds(accumulatedRef.current);
  }, []);

  // Resume counting from now — starts a fresh active segment.
  const resumeTimer = useCallback(() => {
    if (!isPausedRef.current) return;
    startTime.current = Date.now();
    lastActivityRef.current = Date.now();
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  // Record real activity (e.g. a logged set). Resets the idle window and resumes
  // the clock if it had auto-paused.
  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isPausedRef.current) resumeTimer();
  }, [resumeTimer]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const now = Date.now();
      if (now - lastActivityRef.current >= IDLE_LIMIT_MS) {
        // Auto-pause and freeze at the last activity so the idle gap isn't counted.
        pauseAt(lastActivityRef.current);
        return;
      }
      setElapsedSeconds(accumulatedRef.current + Math.floor((now - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [pauseAt]);

  // Start a rest period: track the end time and schedule a background-safe
  // notification (sound + vibration) for when it elapses.
  const startRest = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    const endAt = Date.now() + seconds * 1000;
    restEndAtRef.current = endAt;
    setRestSecs(seconds);
    cancelRestTimerAlert(restNotifIdRef.current);
    restNotifIdRef.current = null;
    // Persist the absolute end time immediately, then attach the notification id
    // once it's scheduled so a remount can still cancel it.
    AsyncStorage.setItem(restPersistKey, JSON.stringify({ endAt })).catch(() => {});
    scheduleRestTimerAlert(seconds).then((id) => {
      restNotifIdRef.current = id;
      AsyncStorage.setItem(restPersistKey, JSON.stringify({ endAt, notifId: id })).catch(() => {});
    });
  }, [restPersistKey]);

  // Cancel the rest period entirely (skip / un-complete a set / leave workout).
  const stopRest = useCallback(() => {
    restEndAtRef.current = null;
    setRestSecs(null);
    cancelRestTimerAlert(restNotifIdRef.current);
    restNotifIdRef.current = null;
    AsyncStorage.removeItem(restPersistKey).catch(() => {});
  }, [restPersistKey]);

  // Add/subtract time, recomputed from the live remaining seconds.
  const adjustRest = useCallback((delta: number) => {
    const remaining = restEndAtRef.current
      ? Math.max(0, Math.round((restEndAtRef.current - Date.now()) / 1000))
      : 0;
    const next = remaining + delta;
    if (next <= 0) stopRest();
    else startRest(next);
  }, [startRest, stopRest]);

  // Rest timer countdown — derives remaining seconds from the absolute end time
  // so it self-corrects after the app returns from the background.
  useEffect(() => {
    if (restSecs === null) return;
    if (restSecs <= 0) {
      Vibration.vibrate([0, 200, 100, 200, 100, 400]);
      // Don't cancel the notification here — let it fire so the sound plays even
      // if the screen is in the foreground (the handler suppresses its banner).
      restEndAtRef.current = null;
      restNotifIdRef.current = null;
      AsyncStorage.removeItem(restPersistKey).catch(() => {});
      setRestSecs(null);
      return;
    }
    const id = setTimeout(() => {
      const remaining = restEndAtRef.current
        ? Math.max(0, Math.round((restEndAtRef.current - Date.now()) / 1000))
        : 0;
      setRestSecs(remaining);
    }, 1000);
    return () => clearTimeout(id);
  }, [restSecs, restPersistKey]);

  // Re-sync the visible countdown when returning from the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (restEndAtRef.current !== null) {
        setRestSecs(Math.max(0, Math.round((restEndAtRef.current - Date.now()) / 1000)));
      }
      // JS timers freeze in the background, so the idle auto-pause can't fire
      // while away. Catch it on return: if we were idle past the limit, pause
      // and freeze at the last activity so the gap isn't counted.
      if (!isPausedRef.current && Date.now() - lastActivityRef.current >= IDLE_LIMIT_MS) {
        pauseAt(lastActivityRef.current);
      }
    });
    return () => sub.remove();
  }, []);

  // Restore a rest countdown that was running when the screen was last torn down
  // (app backgrounded/killed, or minimized to another tab). The end time is
  // absolute, so we recompute the remaining seconds and pick the countdown back
  // up — and the OS notification keeps the beep firing meanwhile. We deliberately
  // DON'T cancel the alert on plain unmount, so leaving the screen doesn't kill
  // an in-progress rest; it's only cancelled on an explicit skip/finish/cancel.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(restPersistKey).then((raw) => {
      if (cancelled || !raw) return;
      try {
        const { endAt, notifId } = JSON.parse(raw) as { endAt: number; notifId?: string | null };
        const remaining = Math.round((endAt - Date.now()) / 1000);
        if (remaining > 0) {
          restEndAtRef.current = endAt;
          restNotifIdRef.current = notifId ?? null;
          setRestSecs(remaining);
        } else {
          AsyncStorage.removeItem(restPersistKey).catch(() => {});
        }
      } catch {
        AsyncStorage.removeItem(restPersistKey).catch(() => {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [restPersistKey]);

  // Always fetch the session to restore the clock and any logged sets.
  // Falls back to plannedExercises if the session has no sets yet (e.g. resumed before logging anything).
  useEffect(() => {
    sessionService.getSession(sessionId).then((session) => {
      if (session.startedAt) {
        const realStart = new Date(session.startedAt).getTime();
        startTime.current = realStart;
        accumulatedRef.current = 0;
        // Treat the resume as activity so a just-reopened session doesn't trip
        // the idle auto-pause immediately.
        lastActivityRef.current = Date.now();
        setElapsedSeconds(Math.floor((Date.now() - realStart) / 1000));
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
    setExerciseSearch('');
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
    setSubstituteSearch('');
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

  const filteredExercises = COMMON_EXERCISES.filter((e) =>
    e.toLowerCase().includes(exerciseSearch.toLowerCase())
  );
  const customMatch = exerciseSearch.trim().length > 2 &&
    !COMMON_EXERCISES.some((e) => e.toLowerCase() === exerciseSearch.toLowerCase().trim());

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

        {/* Rest Timer Banner */}
        {restSecs !== null && (() => {
          const restColor = restSecs > 30 ? '#22c55e' : restSecs > 10 ? '#f59e0b' : '#ef4444';
          const mm = String(Math.floor(restSecs / 60)).padStart(2, '0');
          const ss = String(restSecs % 60).padStart(2, '0');
          return (
            <View style={[styles.restBanner, { borderLeftColor: restColor }]}>
              <View style={styles.restLeft}>
                <View>
                  <Text style={styles.restLabel}>REST</Text>
                  <Text style={[styles.restCountdown, { color: restColor }]}>{mm}:{ss}</Text>
                </View>
              </View>
              <View style={styles.restControls}>
                <TouchableOpacity style={styles.restBtn} onPress={() => adjustRest(-15)}>
                  <Text style={styles.restBtnText}>−15</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restBtn} onPress={() => adjustRest(15)}>
                  <Text style={styles.restBtnText}>+15</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restSkipBtn} onPress={stopRest}>
                  <Text style={styles.restSkipText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

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
                  onPress={() => { setSubstituteIdx(exIdx); setSubstituteSearch(''); }}
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
                              <ActivityIndicator color="#fff" size="small" />
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
      <Modal
        visible={substituteIdx !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSubstituteIdx(null)}
      >
        {substituteIdx !== null && (() => {
          const ex = exercises[substituteIdx];
          const isKey = KEY_EXERCISE_PATTERN.test(ex.name);
          const loggedCount = ex.sets.filter(s => s.isCompleted && s.id).length;
          const suggestions = getSubstitutes(ex.name);
          const filtered = substituteSearch.trim()
            ? suggestions.filter(s => s.toLowerCase().includes(substituteSearch.toLowerCase()))
                .concat(
                  COMMON_EXERCISES.filter(e =>
                    e.toLowerCase().includes(substituteSearch.toLowerCase()) &&
                    !suggestions.includes(e) &&
                    e !== ex.name
                  )
                )
            : suggestions;
          const customSub = substituteSearch.trim().length > 2 &&
            !COMMON_EXERCISES.some(e => e.toLowerCase() === substituteSearch.toLowerCase().trim()) &&
            !suggestions.some(e => e.toLowerCase() === substituteSearch.toLowerCase().trim());

          return (
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Substitute Exercise</Text>
                <TouchableOpacity
                  onPress={() => { setSubstituteIdx(null); setSubstituteSearch(''); }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.subCurrentCard}>
                <Text style={styles.subCurrentLabel}>REPLACING</Text>
                <Text style={styles.subCurrentName}>{exName(ex.name)}</Text>
              </View>

              {isKey && (
                <View style={styles.subWarning}>
                  <Text style={styles.subWarningIcon}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subWarningTitle}>Key lift for today's program</Text>
                    <Text style={styles.subWarningText}>
                      This is a primary exercise in your plan. Substituting reduces specificity — only swap if you have a real reason (injury, equipment, fatigue).
                    </Text>
                  </View>
                </View>
              )}

              {loggedCount > 0 && (
                <View style={styles.subNote}>
                  <Text style={styles.subNoteText}>
                    {loggedCount} already-logged set{loggedCount > 1 ? 's' : ''} will remain under "{ex.name}" in your history. New sets will use the substituted name.
                  </Text>
                </View>
              )}

              <TextInput
                style={styles.searchInput}
                value={substituteSearch}
                onChangeText={setSubstituteSearch}
                placeholder="Search substitutes..."
                placeholderTextColor={palette.gray[500]}
                autoFocus={!isKey}
              />

              <Text style={styles.subSuggestionsLabel}>SUGGESTIONS</Text>

              <ScrollView>
                {customSub && (
                  <TouchableOpacity
                    style={styles.customExerciseRow}
                    onPress={() => substituteExercise(substituteIdx, substituteSearch.trim())}
                  >
                    <Text style={styles.customExerciseText}>+ Use "{substituteSearch.trim()}"</Text>
                  </TouchableOpacity>
                )}
                {filtered.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={styles.exerciseRow}
                    onPress={() => substituteExercise(substituteIdx, name)}
                  >
                    <Text style={styles.exerciseRowText}>{name}</Text>
                    <Text style={styles.subArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>

      {/* Add Exercise Modal */}
      <Modal visible={showAddExercise} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('activeWorkout.addExercise')}</Text>
            <TouchableOpacity
              onPress={() => { setShowAddExercise(false); setExerciseSearch(''); }}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            value={exerciseSearch}
            onChangeText={setExerciseSearch}
            placeholder={t('activeWorkout.searchExercise')}
            placeholderTextColor={palette.gray[500]}
            autoFocus
          />

          <ScrollView>
            {customMatch && (
              <TouchableOpacity
                style={styles.customExerciseRow}
                onPress={() => addExercise(exerciseSearch.trim())}
              >
                <Text style={styles.customExerciseText}>+ Add "{exerciseSearch.trim()}"</Text>
              </TouchableOpacity>
            )}
            {filteredExercises.map((name) => (
              <TouchableOpacity key={name} style={styles.exerciseRow} onPress={() => addExercise(name)}>
                <Text style={styles.exerciseRowText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* RPE Guide Modal */}
      <Modal visible={rpeGuideVisible} transparent animationType="fade" onRequestClose={() => setRpeGuideVisible(false)}>
        <TouchableOpacity style={rpeStyles.overlay} activeOpacity={1} onPress={() => setRpeGuideVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={rpeStyles.card}>
            <View style={rpeStyles.header}>
              <Text style={rpeStyles.title}>What is RPE?</Text>
              <TouchableOpacity
                onPress={() => setRpeGuideVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
              >
                <Text style={rpeStyles.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={rpeStyles.subtitle}>Rate of Perceived Exertion — how hard was that set?</Text>

            {[
              { rpe: '10', label: 'Max effort', detail: 'Could not do one more rep. True maximum.' },
              { rpe: '9',  label: 'Near max',   detail: 'Could squeeze out 1 more rep at most.' },
              { rpe: '8',  label: 'Hard',        detail: '2 reps left in the tank. Main working sets.' },
              { rpe: '7',  label: 'Moderate',    detail: '3 reps in reserve. Challenging but controlled.' },
              { rpe: '6',  label: 'Easy',         detail: '4+ reps left. Warm-up and technique work.' },
            ].map(({ rpe, label, detail }) => (
              <View key={rpe} style={rpeStyles.row}>
                <View style={rpeStyles.badge}>
                  <Text style={rpeStyles.badgeText}>{rpe}</Text>
                </View>
                <View style={rpeStyles.rowText}>
                  <Text style={rpeStyles.rowLabel}>{label}</Text>
                  <Text style={rpeStyles.rowDetail}>{detail}</Text>
                </View>
              </View>
            ))}

            <View style={rpeStyles.note}>
              <Text style={rpeStyles.noteText}>
                Accurate RPE logging is how the AI detects fatigue and adjusts your loads automatically. Random numbers break the system.
              </Text>
            </View>

            <TouchableOpacity style={rpeStyles.gotIt} onPress={() => setRpeGuideVisible(false)}>
              <Text style={rpeStyles.gotItText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  timerLabelPaused: { color: '#f59e0b' },
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
  finishBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
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
    backgroundColor: '#78350f33',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  pausedTitle: { fontSize: 13, fontWeight: '800', color: '#f59e0b', marginBottom: 2 },
  pausedText: { fontSize: 11, color: palette.gray[300], lineHeight: 15 },
  resumeBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  resumeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.gray[800],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
  },
  restLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restLabel: { fontSize: 10, fontWeight: '800', color: palette.gray[400], letterSpacing: 1.5 },
  restCountdown: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  restControls: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  restBtn: {
    backgroundColor: palette.gray[700],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  restBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  restSkipBtn: {
    backgroundColor: palette.gray[700],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  restSkipText: { fontSize: 13, fontWeight: '600', color: palette.gray[400] },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
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
  setRowPR: { backgroundColor: '#78350f' + '40', borderLeftWidth: 2, borderLeftColor: '#f59e0b' },
  setNum: { width: 30, fontSize: 14, fontWeight: '700', color: palette.gray[400] },
  setNumDone: { color: palette.brand[400] },
  setNumPR: { color: '#f59e0b' },

  prBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#78350f' + '25' },
  prBadgeRowMini: { backgroundColor: palette.gray[800] },
  prBadge: { backgroundColor: '#92400e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  prBadgeText: { fontSize: 11, color: '#fcd34d', fontWeight: '700' },
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
  logBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  doneCheck: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheckText: { fontSize: 16, color: '#fff', fontWeight: '700' },

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
  modalContainer: { flex: 1, backgroundColor: palette.gray[900] },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  modalClose: { fontSize: 18, color: palette.gray[400] },
  searchInput: {
    margin: 16,
    backgroundColor: palette.gray[800],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  customExerciseRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.brand[600] + '22',
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  customExerciseText: { fontSize: 15, color: palette.brand[400], fontWeight: '600' },
  exerciseRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseRowText: { fontSize: 15, color: theme.colors.text },
  subArrow: { fontSize: 14, color: palette.gray[500] },

  // Tutorial & Substitute buttons
  tutorialBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#dc262622',
    borderWidth: 1,
    borderColor: '#dc262644',
    marginRight: 4,
  },
  tutorialBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '700' },

  substituteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.gray[700],
    marginRight: 4,
  },
  substituteBtnText: { fontSize: 14, color: palette.brand[400], fontWeight: '700' },

  // Substitute modal
  subCurrentCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: palette.gray[800],
    borderRadius: 12,
    padding: 14,
  },
  subCurrentLabel: { fontSize: 10, fontWeight: '700', color: palette.gray[500], letterSpacing: 1, marginBottom: 4 },
  subCurrentName: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  subWarning: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#78350f33',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#f59e0b44',
  },
  subWarningIcon: { fontSize: 20 },
  subWarningTitle: { fontSize: 13, fontWeight: '700', color: '#f59e0b', marginBottom: 4 },
  subWarningText: { fontSize: 12, color: palette.gray[300], lineHeight: 17 },

  subNote: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: palette.gray[700],
    borderRadius: 10,
    padding: 12,
  },
  subNoteText: { fontSize: 11, color: palette.gray[400], lineHeight: 16 },

  subSuggestionsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.gray[500],
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },

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
  techDotTextActive: { color: '#fff' },
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

const rpeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.gray[900],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.gray[700],
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  close: { fontSize: 18, color: palette.gray[400], paddingLeft: 12 },
  subtitle: { fontSize: 13, color: palette.gray[400], marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.gray[800],
    gap: 14,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  rowDetail: { fontSize: 12, color: palette.gray[400] },
  note: {
    backgroundColor: palette.gray[800],
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  noteText: { fontSize: 12, color: palette.brand[300], lineHeight: 18 },
  gotIt: {
    backgroundColor: palette.brand[600],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  gotItText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
