import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { FitnessQuiz } from '../../components/ui/FitnessQuiz';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LOCALES, safeLocaleDateString } from '../../i18n';
import { useExerciseName } from '../../hooks/useExerciseName';
import { useSettingsStore } from '../../stores/settings.store';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette, alpha } from '../../theme';
import { sessionService } from '../../services/session.service';
import { aiCoachService, FatigueRecommendation, PrForecast } from '../../services/ai-coach.service';
import { useAuthStore } from '../../stores/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moon, Minus, ThumbsUp, Fire, Lightning, Trophy, ChartBar } from 'phosphor-react-native';

import { Card, PRForecastCard } from '../../components/ui';
import { apiErrorMessage } from '../../utils/apiError';
// Tracks which generated workout a readiness check was already submitted for.
// Keyed per-user; value pins the plan's `generatedAt` so the readiness step is
// skipped until a NEW workout is generated (e.g. after completing a session).
const readinessAppliedKey = (uid: string) => `readiness:applied:${uid}`;
type ReadinessMarker = { planAt: string; mood?: string; energyLevel?: number; sleepHours?: string; bodyweight?: string };

type PlannedExercise = NonNullable<RootStackParamList['ActiveWorkout']['plannedExercises']>[number];

function parsePlanExercises(plan: string): PlannedExercise[] {
  const exercises: PlannedExercise[] = [];
  const lines = plan.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('**COACH')) continue;
    if (!line.startsWith('**') || (!line.includes('×') && !line.includes('x'))) continue;

    const nameMatch = line.match(/^\*\*([^*]+)\*\*/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    const srMatch = line.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!srMatch) continue;

    const numWeightMatch = line.match(/@\s*([\d.]+)\s*kg/i);
    const bwMatch = line.match(/@\s*(?:bodyweight|body\s*weight|bw)\b/i);
    const weight = numWeightMatch ? parseFloat(numWeightMatch[1]) : bwMatch ? 0 : null;
    if (weight === null) continue;

    const rpeMatch = line.match(/\bRPE\s*([\d.]+)/i);
    const cue = lines[i + 1]?.trim().match(/^\*([^*]+)\*$/)?.[1];

    exercises.push({
      name,
      sets: parseInt(srMatch[1]),
      reps: parseInt(srMatch[2]),
      weight,
      rpe: rpeMatch ? parseFloat(rpeMatch[1]) : undefined,
      cue: cue ?? undefined,
    });
  }
  return exercises;
}

const MOOD_VALUES = ['tired', 'neutral', 'good', 'great', 'elite'] as const;
const MOOD_ICONS: Record<string, React.ReactElement> = {
  tired:   <Moon size={24} weight="fill" color={palette.coolGray[500]} />,
  neutral: <Minus size={24} weight="bold" color={palette.coolGray[400]} />,
  good:    <ThumbsUp size={24} weight="fill" color={palette.brand[500]} />,
  great:   <Fire size={24} weight="fill" color={palette.error[500]} />,
  elite:   <Lightning size={24} weight="fill" color={palette.yellow[500]} />,
};

// Compact "X weeks out" chip for a set competition / PR-test date. Mirrors the
// urgency thresholds of the plan screen's CompBanner (≤2 weeks critical, ≤6 high).
const CompCountdown: React.FC<{ date: string; type: string | null }> = ({ date, type }) => {
  const weeks = Math.ceil((new Date(date).getTime() - Date.now()) / (7 * 86_400_000));
  if (weeks < 0) return null; // date has passed — nothing useful to count down to
  const critical = weeks <= 2;
  const Icon = type === 'pr_test' ? ChartBar : Trophy;
  return (
    <View style={[styles.compBadge, critical && styles.compBadgeCritical]}>
      <Icon size={12} weight="fill" color={critical ? palette.error[400] : palette.warning[400]} />
      <Text style={[styles.compBadgeText, critical && styles.compBadgeTextCritical]}>
        {weeks <= 0
          ? (type === 'pr_test' ? 'PR test week' : 'Comp week')
          : `${type === 'pr_test' ? 'PR test' : 'Comp'} in ${weeks}w`}
      </Text>
    </View>
  );
};

export const StartSessionScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const locale = LANGUAGE_LOCALES[useSettingsStore((s) => s.language)] ?? 'en-US';
  const MOODS = MOOD_VALUES.map((v) => ({ icon: MOOD_ICONS[v], value: v, name: t(`session.moods.${v}`) }));
  const ENERGY_LABELS = ['', t('session.energyLabels.1'), t('session.energyLabels.2'), t('session.energyLabels.3'), t('session.energyLabels.4'), t('session.energyLabels.5')];
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'StartSession'>>();
  const uid = useAuthStore((s) => s.user?.id);

  const [step, setStep] = useState<1 | 2>(1);
  const [initializing, setInitializing] = useState(true);
  const [bodyweight, setBodyweight] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [mood, setMood] = useState('good');
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  // Full-screen pop-quiz that entertains the athlete through the ~20s AI workout
  // build. `generating` shows the quiz; `planReady` flips its loading pill to the
  // "Continue" CTA once the plan is back so they can finish the current question.
  const [generating, setGenerating] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  // Reactive HIGH-fatigue alarm awaiting the athlete's call. Non-null = modal shown.
  const [fatigueGate, setFatigueGate] = useState<{ reasons: string[]; level: 'elevated' | 'high'; recommendation: FatigueRecommendation | null } | null>(null);
  const [taperBusy, setTaperBusy] = useState(false);
  const [plannedExercises, setPlannedExercises] = useState<PlannedExercise[]>(() => {
    if (route.params?.nextSessionJson?.exercises?.length) {
      return route.params.nextSessionJson.exercises;
    }
    if (route.params?.plan) {
      return parsePlanExercises(route.params.plan);
    }
    return [];
  });
  const [cycleInfo, setCycleInfo] = useState<{ week: number; session: number; total: number } | null>(null);
  // "Is a record on today?" Free and LLM-free, so it's fetched on entry to step 2
  // rather than gated behind a tap.
  const [prForecast, setPrForecast] = useState<PrForecast | null>(null);
  // Competition / PR-test countdown. Set on the AI Coach plan screen; surfaced here
  // so the athlete actually sees how close the meet is on every single session.
  const [comp, setComp] = useState<{ date: string; type: string | null } | null>(null);
  const [coachsCall, setCoachsCall] = useState<string | undefined>(route.params?.nextSessionJson?.coachsCall);
  const [errors, setErrors] = useState<{ sleep?: string; bodyweight?: string }>({});

  const applyPlanResult = (result: Awaited<ReturnType<typeof aiCoachService.getPlan>>) => {
    if (result.nextSessionJson?.exercises?.length) {
      setPlannedExercises(result.nextSessionJson.exercises);
    } else if (result.plan) {
      setPlannedExercises(parsePlanExercises(result.plan));
    }
    setCoachsCall(result.nextSessionJson?.coachsCall);
    setComp(result.competitionDate ? { date: result.competitionDate, type: result.competitionType } : null);
    if (result.trainingWeek && result.sessionInWeek && result.sessionsPerCycle) {
      setCycleInfo({ week: result.trainingWeek, session: result.sessionInWeek, total: result.sessionsPerCycle });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const [readiness, plan, markerRaw] = await Promise.all([
        sessionService.getLastReadiness().catch(() => null),
        aiCoachService.getPlan().catch(() => null),
        uid ? AsyncStorage.getItem(readinessAppliedKey(uid)).catch(() => null) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      // Pre-fill from last session
      if (readiness?.lastBodyweight != null) setBodyweight(String(readiness.lastBodyweight));
      if (readiness?.avgSleepHours != null) setSleepHours(String(readiness.avgSleepHours));

      // If a readiness check was already submitted for the current pending workout,
      // skip straight to the workout — only re-show it once a new workout is generated.
      const marker: ReadinessMarker | null = markerRaw ? JSON.parse(markerRaw) : null;
      const hasPlan = !!(plan?.plan || plan?.nextSessionJson?.exercises?.length);
      // A make-up, skip-ahead or train-ahead always re-runs readiness → regenerate for
      // the chosen slot, so never short-circuit to the already-generated (natural
      // next-day) plan.
      if (!route.params?.freeSession && !route.params?.makeUp && !route.params?.skipNext && !route.params?.trainAhead && plan && hasPlan && marker && plan.generatedAt && marker.planAt === plan.generatedAt) {
        applyPlanResult(plan);
        if (marker.mood) setMood(marker.mood);
        if (typeof marker.energyLevel === 'number') setEnergyLevel(marker.energyLevel);
        if (marker.sleepHours) setSleepHours(marker.sleepHours);
        if (marker.bodyweight) setBodyweight(marker.bodyweight);
        setStep(2);
      }

      if (!cancelled) setInitializing(false);
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Fetched on arrival at step 2 rather than in init: the forecast reads the PENDING
  // session to know whether a single or triple is programmed, so asking before
  // generation would report "no attempt scheduled" against the previous workout.
  // Covers both routes into step 2 (a fresh generation and the already-checked
  // short-circuit). Failure is silent — a missing forecast hides the card, and the
  // session must never be blocked by an advisory read.
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    aiCoachService.prForecast()
      .then((f) => { if (!cancelled) setPrForecast(f); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [step]);

  const validate = (): boolean => {
    const newErrors: { sleep?: string; bodyweight?: string } = {};
    const sleep = parseFloat(sleepHours);
    const bw = parseFloat(bodyweight);
    if (!sleepHours || isNaN(sleep) || sleep <= 0 || sleep > 24) {
      newErrors.sleep = t('session.readinessRequired');
    }
    if (!bodyweight || isNaN(bw) || bw <= 0) {
      newErrors.bodyweight = t('session.bodyweightRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Runs the actual plan generation + transition to step 2. `fatigueDecision` carries
  // the athlete's answer to the readiness gate ('accept' = recover, 'dismiss' = feel fine).
  const proceedGeneration = async (fatigueDecision?: 'accept' | 'dismiss') => {
    setFatigueGate(null);
    // Hand off from the button spinner (preflight) to the full-screen quiz takeover
    // that covers the long AI build.
    setPlanLoading(false);
    setPlanReady(false);
    setGenerating(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Check if a plan was already generated today
      let result = await aiCoachService.getPlan();
      const planFromToday = result.generatedAt ? result.generatedAt.startsWith(today) : false;
      const makeUp = route.params?.makeUp === true;
      const skipNext = route.params?.skipNext === true;
      const trainAhead = route.params?.trainAhead === true;

      // Regenerate when there's no plan for today, OR when making up a missed day,
      // OR when skipping the upcoming slot to do the one after it, OR when training
      // ahead after already completing today's session. In all three flag cases the
      // existing plan targets the wrong (already-completed / natural next) day, so it
      // must be replaced with one for the chosen slot — and the `planFromToday` guard
      // must NOT suppress that (training twice in one calendar day is the case it
      // otherwise mishandles: it re-serves the just-finished session).
      if (!planFromToday || makeUp || skipNext || trainAhead) {
        // Generate fresh plan using today's readiness data
        await aiCoachService.generatePlan({
          mood,
          energyLevel,
          sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        }, undefined, makeUp, skipNext, fatigueDecision);
        // Re-fetch to get nextSessionJson and cycle metadata
        result = await aiCoachService.getPlan();
      }

      applyPlanResult(result);

      // Pin this readiness check to the resulting workout so it isn't shown again
      // until a new workout is generated (it can be redone once a new one exists).
      if (uid && result.generatedAt) {
        const marker: ReadinessMarker = { planAt: result.generatedAt, mood, energyLevel, sleepHours, bodyweight };
        await AsyncStorage.setItem(readinessAppliedKey(uid), JSON.stringify(marker)).catch(() => {});
      }
      // Plan is ready in the background — keep the quiz up and flip it to the
      // "Continue" CTA. The step-2 reveal happens when the athlete taps Continue.
      setPlanReady(true);
    } catch (err: unknown) {
      Alert.alert(t('common.error'), apiErrorMessage(err, 'Unknown error'));
      setGenerating(false);
      setPlanReady(false);
    }
  };

  // "Taper into it" — the peak-preserving answer when a max attempt is close. Opens the
  // taper window server-side FIRST, then generates: the session that comes back is
  // already the taper (volume down, intensity held), and the attempt is deferred to the
  // end of the window rather than spent tired. Never sends 'accept' — that means deload,
  // which would clear the fatigue and leave the athlete flat for the attempt.
  const acceptTaper = async () => {
    setTaperBusy(true);
    try {
      const res = await aiCoachService.triggerRecoveryWeek('taper');
      setTaperBusy(false);
      if (res.fatigueWarning) Alert.alert(t('session.fatigueGate.taperSetTitle', { defaultValue: 'Taper set' }), res.fatigueWarning);
      await proceedGeneration();
    } catch (err: unknown) {
      setTaperBusy(false);
      // Already in a window / already deloading — the alarm still deserves an answer,
      // so fall through to the normal fatigue-aware generation rather than dead-ending.
      Alert.alert(t('common.error'), apiErrorMessage(err, 'Could not start the taper'));
      await proceedGeneration();
    }
  };

  const handleSeeWorkout = async () => {
    if (!validate()) return;
    setPlanLoading(true);

    // Cheap, LLM-free pre-flight: only when we're about to regenerate (a fresh plan
    // for today / make-up / skip), ask the backend whether a reactive HIGH-fatigue
    // alarm needs the athlete's call. If so, surface it and let them choose recovery
    // or "I feel fine" before spending an AI generation.
    try {
      const existing = await aiCoachService.getPlan();
      const today = new Date().toISOString().split('T')[0];
      const planFromToday = existing.generatedAt ? existing.generatedAt.startsWith(today) : false;
      const willRegenerate = !planFromToday || route.params?.makeUp === true || route.params?.skipNext === true || route.params?.trainAhead === true;
      if (willRegenerate) {
        const gate = await aiCoachService.fatigueCheck().catch(() => null);
        if (gate?.requiresAck && gate.reasons.length && (gate.level === 'high' || gate.level === 'elevated')) {
          setPlanLoading(false);
          setFatigueGate({ reasons: gate.reasons, level: gate.level, recommendation: gate.recommendation });
          return;
        }
      }
    } catch {
      // Pre-flight failed (offline, etc.) — fall through to normal generation.
    }

    await proceedGeneration();
  };

  const doCreateSession = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const session = await sessionService.createSession({
        date: today,
        bodyweight: bodyweight ? parseFloat(bodyweight) : undefined,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        energyLevel,
        mood,
      });
      navigation.replace('ActiveWorkout', {
        sessionId: session.id,
        plannedExercises: plannedExercises.length ? plannedExercises : undefined,
      });
    } catch {
      Alert.alert(t('common.error'), t('session.couldNotStart'));
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const active = await sessionService.getActiveSession();
      if (active) {
        Alert.alert(
          t('session.workoutInProgress'),
          'You have an unfinished workout. Starting a new one will end it.',
          [
            { text: t('session.resumeWorkout'), style: 'cancel', onPress: () => navigation.replace('ActiveWorkout', { sessionId: active.id, plannedExercises: plannedExercises.length ? plannedExercises : undefined }) },
            {
              text: t('session.endAndStart'),
              style: 'destructive',
              onPress: async () => {
                await sessionService.cancelSession(active.id).catch(() => { });
                await doCreateSession();
              },
            },
          ],
        );
        return;
      }
    } catch {
      // No active session or network error — proceed normally
    }
    await doCreateSession();
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // While the AI builds today's workout, keep the athlete engaged with the quiz
  // instead of a bare spinner. Continue (revealed once ready) drops them into step 2.
  if (generating) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FitnessQuiz
          loading={!planReady}
          title={t('aiCoach.generating')}
          subtitle={t('aiCoach.buildingWorkout')}
          onFinish={() => {
            setGenerating(false);
            setPlanReady(false);
            setStep(2);
          }}
        />
      </SafeAreaView>
    );
  }

  // A peak is close: the gate swaps its deload/trim wording for the taper offer.
  const isTaperGate = fatigueGate?.recommendation?.action === 'taper';

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed header — outside ScrollView so it never scrolls away */}
      <View style={styles.header}>
        <Text style={styles.title}>{step === 1 ? t('session.readinessCheck') : t('session.todaysWorkout')}</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>
            {safeLocaleDateString(new Date(), locale, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {step === 2 && cycleInfo && (
            <View style={styles.cycleBadge}>
              <Text style={styles.cycleBadgeText}>
                {t('session.weekBadge', { week: cycleInfo.week, session: cycleInfo.session, total: cycleInfo.total })}
              </Text>
            </View>
          )}
          {step === 2 && comp && <CompCountdown date={comp.date} type={comp.type} />}
        </View>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>
      </View>

      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {step === 1 ? (
          <>
            {/* Mood */}
            <Card background={palette.gray[800]} bordered={false} padding={20} style={styles.cardSpacing}>
              <Text style={styles.cardLabel}>{t('session.howAreYouFeeling')}</Text>
              <View style={styles.moodRow}>
                {MOODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                    onPress={() => setMood(m.value)}
                  >
                    <View style={styles.moodEmoji}>{m.icon}</View>
                    <Text style={[styles.moodName, mood === m.value && styles.moodNameActive]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Energy Level */}
            <Card background={palette.gray[800]} bordered={false} padding={20} style={styles.cardSpacing}>
              <Text style={styles.cardLabel}>{t('session.energyLevel')}</Text>
              <Text style={styles.energyValue}>{ENERGY_LABELS[energyLevel]}</Text>
              <View style={styles.energyDots}>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <TouchableOpacity key={lvl} onPress={() => setEnergyLevel(lvl)} style={styles.dotWrap}>
                    <View style={[styles.dot, lvl <= energyLevel && styles.dotActive]} />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, errors.bodyweight && styles.statCardError]}>
                <Text style={styles.statLabel}>{t('session.bodyweight')} <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.statInput}
                    value={bodyweight}
                    onChangeText={(v) => { setBodyweight(v); if (errors.bodyweight) setErrors((e) => ({ ...e, bodyweight: undefined })); }}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor={palette.gray[500]}
                  />
                  <Text style={styles.statUnit}>kg</Text>
                </View>
                {errors.bodyweight && <Text style={styles.errorText}>{errors.bodyweight}</Text>}
              </View>
              <View style={[styles.statCard, errors.sleep && styles.statCardError]}>
                <Text style={styles.statLabel}>{t('session.sleep')} <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.statInput}
                    value={sleepHours}
                    onChangeText={(v) => { setSleepHours(v); if (errors.sleep) setErrors((e) => ({ ...e, sleep: undefined })); }}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor={palette.gray[500]}
                  />
                  <Text style={styles.statUnit}>hrs</Text>
                </View>
                {errors.sleep && <Text style={styles.errorText}>{errors.sleep}</Text>}
              </View>
            </View>

            {/* Continue to workout */}
            <TouchableOpacity
              style={[styles.startBtn, planLoading && styles.startBtnDisabled]}
              onPress={handleSeeWorkout}
              disabled={planLoading}
            >
              {planLoading
                ? <ActivityIndicator color={palette.white} />
                : <Text style={styles.startBtnText}>{t('session.seeWorkout')}</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Is a record on today? Sits ABOVE the workout: it is the one thing that
                changes how an athlete walks into the session, and it's the last screen
                before the bar. Advisory — it never alters the prescribed loads below. */}
            <PRForecastCard forecast={prForecast} />

            {/* Coach's Plan Preview */}
            {plannedExercises.length > 0 ? (
              <View style={styles.planCard}>
                <Text style={styles.cardLabel}>{t('session.todaysProgram')}</Text>
                {plannedExercises.map((ex, i) => (
                  <View key={i} style={styles.planRow}>
                    <Text style={styles.planExName}>{exName(ex.name)}</Text>
                    <Text style={styles.planExDetail}>
                      {ex.sets}×{ex.reps} @ {ex.weight > 0 ? `${ex.weight}kg` : 'BW'}{ex.weightPerc ? ` · ${ex.weightPerc}% 1RM` : ''}{ex.rpe ? ` · RPE ${ex.rpe}` : ''}
                    </Text>
                    {ex.cue ? <Text style={styles.planExCue}>"{ex.cue}"</Text> : null}
                  </View>
                ))}
                {coachsCall ? (
                  <View style={styles.coachsCall}>
                    <Text style={styles.coachsCallLabel}>{t('session.coachsCall', { defaultValue: "Coach's call" })}</Text>
                    <Text style={styles.coachsCallText}>{coachsCall}</Text>
                  </View>
                ) : null}
              </View>
            ) : route.params?.freeSession ? (
              <Card background={palette.gray[800]} bordered={false} padding={20} style={styles.cardSpacing}>
                <Text style={styles.cardLabel}>{t('session.freeSession')}</Text>
                <Text style={styles.noplanText}>{t('session.noPlansLoaded')}</Text>
              </Card>
            ) : (
              <Card background={palette.gray[800]} bordered={false} padding={20} style={styles.cardSpacing}>
                <Text style={styles.cardLabel}>{t('session.planNotLoaded')}</Text>
                <Text style={styles.noplanText}>{t('session.planNotLoadedSub')}</Text>
              </Card>
            )}

            {/* Start Button */}
            <TouchableOpacity
              style={[styles.startBtn, loading && styles.startBtnDisabled]}
              onPress={handleStart}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.startBtnText}>{t('session.startSession')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

      </KeyboardAwareScreen>

      {/* A max attempt is close enough that the deload/trim answer is the wrong one —
          the gate offers the taper instead (volume down, intensity held, attempt deferred). */}
      {/* Readiness gate — reactive fatigue alarm awaiting the athlete's call.
          HIGH: accept = full recovery deload. ELEVATED: accept = apply the volume
          trim (plain generation — the fatigue context trims it); dismiss = "I feel
          fine", which cancels the trim server-side. Never send 'accept' from an
          elevated gate: the backend treats 'accept' as opting into a deload. */}
      <Modal visible={fatigueGate !== null} transparent animationType="fade" onRequestClose={() => setFatigueGate(null)}>
        <View style={styles.gateOverlay}>
          <View style={styles.gateCard}>
            <View style={styles.gateIcon}><Fire size={28} color={fatigueGate?.level === 'high' ? palette.brand[500] : palette.warning[400]} weight="fill" /></View>
            <Text style={styles.gateTitle}>
              {isTaperGate
                ? fatigueGate!.recommendation!.headline
                : fatigueGate?.level === 'high'
                  ? t('session.fatigueGate.title')
                  : t('session.fatigueGate.elevatedTitle', { defaultValue: 'Fatigue is building' })}
            </Text>
            <Text style={styles.gateSubtitle}>
              {isTaperGate
                ? fatigueGate!.recommendation!.detail
                : fatigueGate?.level === 'high'
                  ? t('session.fatigueGate.subtitle')
                  : t('session.fatigueGate.elevatedSubtitle', { defaultValue: 'Your coach wants to trim a few sets today to protect recovery. Your call:' })}
            </Text>
            <View style={styles.gateReasons}>
              {(fatigueGate?.reasons ?? []).map((r, i) => (
                <View key={i} style={styles.gateReasonRow}>
                  <Text style={styles.gateBullet}>•</Text>
                  <Text style={styles.gateReasonText}>{r}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.gateQuestion}>
              {isTaperGate
                ? t('session.fatigueGate.taperQuestion', { defaultValue: 'Taper into the attempt, or run today as planned?' })
                : fatigueGate?.level === 'high'
                  ? t('session.fatigueGate.question')
                  : t('session.fatigueGate.elevatedQuestion', { defaultValue: 'Trim today’s session, or run it in full?' })}
            </Text>
            <TouchableOpacity
              style={styles.gateAcceptBtn}
              disabled={taperBusy}
              onPress={() => (isTaperGate ? acceptTaper() : proceedGeneration(fatigueGate?.level === 'high' ? 'accept' : undefined))}
            >
              {taperBusy ? <ActivityIndicator color={palette.white} /> : (
                <Text style={styles.gateAcceptText}>
                  {isTaperGate
                    ? t('session.fatigueGate.taperAccept', { defaultValue: 'Taper — keep the peak' })
                    : fatigueGate?.level === 'high'
                      ? t('session.fatigueGate.accept')
                      : t('session.fatigueGate.elevatedAccept', { defaultValue: 'Trim it — protect recovery' })}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.gateDismissBtn} disabled={taperBusy} onPress={() => proceedGeneration('dismiss')}>
              <Text style={styles.gateDismissText}>
                {isTaperGate
                  ? t('session.fatigueGate.taperDismiss', { defaultValue: 'I feel fine — train as planned' })
                  : fatigueGate?.level === 'high'
                    ? t('session.fatigueGate.dismiss')
                    : t('session.fatigueGate.elevatedDismiss', { defaultValue: 'I feel fine — full session' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },

  subtitleRow: { alignItems: 'center', marginBottom: 16, gap: 8 },
  subtitle: { textAlign: 'center', fontSize: 13, color: palette.gray[400] },
  cycleBadge: {
    backgroundColor: palette.brand[600] + '33',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.brand[500],
  },
  cycleBadgeText: { fontSize: 12, fontWeight: '700', color: palette.brand[400] },

  compBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: alpha(palette.warning[500], 0.133),
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.warning[700],
  },
  compBadgeCritical: {
    backgroundColor: alpha(palette.error[500], 0.153),
    borderColor: palette.error[600],
  },
  compBadgeText: { fontSize: 11, fontWeight: '700', color: palette.warning[400] },
  compBadgeTextCritical: { color: palette.error[400] },

  cardSpacing: { marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 16 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  moodBtnActive: { backgroundColor: palette.brand[600] + '33' },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodName: { fontSize: 10, color: palette.gray[400], fontWeight: '600' },
  moodNameActive: { color: palette.brand[400] },

  energyValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginBottom: 14 },
  energyDots: { flexDirection: 'row', gap: 10 },
  dotWrap: { padding: 4 },
  dot: {
    width: 36, height: 10, borderRadius: 5,
    backgroundColor: palette.gray[600],
  },
  dotActive: { backgroundColor: palette.brand[500] },

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.gray[600] },
  stepDotActive: { backgroundColor: palette.brand[500] },
  stepLine: { width: 48, height: 2, backgroundColor: palette.gray[600], marginHorizontal: 6 },

  noplanText: { fontSize: 14, color: palette.gray[400], textAlign: 'center', paddingVertical: 8 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 18,
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statInput: {
    fontSize: 28, fontWeight: '700', color: theme.colors.text,
    flex: 1, padding: 0,
  },
  statUnit: { fontSize: 14, color: palette.gray[400], fontWeight: '600' },
  statCardError: { borderWidth: 1, borderColor: palette.error[500] },
  required: { color: palette.error[500], fontSize: 11 },
  errorText: { fontSize: 10, color: palette.error[500], marginTop: 6 },

  startBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: palette.white },

  // ── Readiness / fatigue gate modal ──
  gateOverlay: { flex: 1, backgroundColor: alpha(palette.black, 0.702), justifyContent: 'center', padding: 24 },
  gateCard: { backgroundColor: palette.gray[800], borderRadius: 20, padding: 24 },
  gateIcon: {
    alignSelf: 'center', width: 56, height: 56, borderRadius: 28,
    backgroundColor: palette.brand[600] + '33', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  gateTitle: { fontSize: 19, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 6 },
  gateSubtitle: { fontSize: 13, color: palette.gray[400], textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  gateReasons: { gap: 8, marginBottom: 18 },
  gateReasonRow: { flexDirection: 'row', gap: 8 },
  gateBullet: { color: palette.brand[400], fontSize: 14, lineHeight: 20, fontWeight: '700' },
  gateReasonText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  gateQuestion: { fontSize: 14, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 16 },
  gateAcceptBtn: { backgroundColor: palette.brand[600], borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  gateAcceptText: { fontSize: 15, fontWeight: '700', color: palette.white },
  gateDismissBtn: { backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: palette.gray[600] },
  gateDismissText: { fontSize: 15, fontWeight: '600', color: palette.gray[300] },

  planCard: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: palette.brand[500],
  },
  planRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.gray[700] },
  planExName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  planExDetail: { fontSize: 13, color: palette.brand[400], fontWeight: '600', marginTop: 2 },
  planExCue: { fontSize: 11, color: palette.gray[500], fontStyle: 'italic', marginTop: 3 },
  coachsCall: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.gray[700] },
  coachsCallLabel: { fontSize: 11, fontWeight: '700', color: palette.brand[400], letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  coachsCallText: { fontSize: 13, lineHeight: 19, color: palette.gray[300] },
});
