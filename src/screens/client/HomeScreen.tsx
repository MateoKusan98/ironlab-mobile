import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
  DimensionValue,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LOCALES, safeLocaleDateString } from '../../i18n';
import { useSettingsStore } from '../../stores/settings.store';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pedometer } from 'expo-sensors';
import { useAuthStore } from '../../stores/auth.store';
import { useFoodLogs } from '../../hooks/useNutrition';
import { useExerciseName } from '../../hooks/useExerciseName';
import { theme, palette, alpha } from '../../theme';
import { aiCoachService, BarLoading, CheckInView, NextSession, ReviewStatus } from '../../services/ai-coach.service';
import { sessionService, TodaySummary } from '../../services/session.service';
import { proposalsService, AIProposal } from '../../services/proposals.service';
import { devTimeService, DevTimeStatus } from '../../services/dev-time.service';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { HomeQuizCard } from '../../components/HomeQuizCard';
import {
  CalendarBlank,
  Question,
  Barbell,
  Lightbulb,
  Moon,
  ForkKnife,
  Sneaker,
  Robot,
  Timer,
  Pill,
  ChartLineUp,
  Lightning,
  Heartbeat,
  FastForward,
  CheckCircle,
  ClipboardText,
} from 'phosphor-react-native';

import { Card } from '../../components/ui';
const CREATINE_ENABLED_KEY = '@ironlab_creatine_enabled';
const CREATINE_DATE_KEY = '@ironlab_creatine_date';
const STEPS_DATE_KEY = '@ironlab_steps_date';
const STEPS_COUNT_KEY = '@ironlab_steps_count';

const CARDIO_LABELS: Record<string, string> = {
  running: 'Running', cycling: 'Cycling', swimming: 'Swimming',
  rowing: 'Rowing', hiit: 'HIIT', stairmaster: 'Stairmaster',
  elliptical: 'Elliptical', jump_rope: 'Jump Rope', other: 'Cardio',
};
const cardioLabel = (type: string) => CARDIO_LABELS[type] ?? type;

const STEP_GOAL = 10_000;
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(false);
  const baseRef = useRef(0);

  useEffect(() => {
    let sub: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    const today = new Date().toISOString().split('T')[0];
    const init = async () => {
      try {
        const ok = await Pedometer.isAvailableAsync();
        if (!ok) { setAvailable(false); return; }

        // Motion / activity-recognition permission is required on both
        // platforms (and is a runtime "dangerous" permission on Android).
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted) { setAvailable(false); return; }
        setAvailable(true);

        if (Platform.OS === 'ios') {
          // iOS can query the OS for today's steps since midnight — this is
          // authoritative and already survives app restarts.
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, new Date());
          baseRef.current = result.steps;
          setSteps(result.steps);
        } else {
          // Android has no historical query, and watchStepCount only counts
          // from the subscription point — so it resets to 0 on every restart.
          // Restore today's running total from storage; start fresh on a new day.
          const [savedDate, savedCount] = await Promise.all([
            AsyncStorage.getItem(STEPS_DATE_KEY),
            AsyncStorage.getItem(STEPS_COUNT_KEY),
          ]);
          const restored = savedDate === today ? (parseInt(savedCount ?? '0', 10) || 0) : 0;
          baseRef.current = restored;
          setSteps(restored);
        }

        // Live updates work on both platforms (counts steps since this point).
        sub = Pedometer.watchStepCount((update) => {
          const total = baseRef.current + update.steps;
          setSteps(total);
          // Persist Android's total so it's remembered across restarts.
          if (Platform.OS !== 'ios') {
            AsyncStorage.multiSet([
              [STEPS_DATE_KEY, today],
              [STEPS_COUNT_KEY, String(total)],
            ]).catch(() => {});
          }
        });
      } catch {
        setAvailable(false);
      }
    };
    init();
    return () => { sub?.remove(); };
  }, []);

  return { steps, available };
}

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const locale = LANGUAGE_LOCALES[useSettingsStore((s) => s.language)] ?? 'en-US';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().split('T')[0];
  const todayDayName = DAY_NAMES[new Date().getDay()];

  const { steps, available: stepsAvailable } = useStepCounter();
  const { data: foodLogs, isLoading: logsLoading, refetch: refetchLogs } = useFoodLogs(today);

  const [planData, setPlanData] = useState<{
    nextSessionJson: NextSession | null;
    trainingDays: string[] | null;
    planText: string | null;
    missedSession: { day: string; lifts: string[] } | null;
    catchUpRecommendation: 'make_up' | 'skip' | null;
    nextScheduledDay: string | null;
    skipAheadDay: string | null;
    completedToday: boolean | null;
    regenerating: boolean | null;
    // The athlete's bar and plates, for drawing a prescribed load as the stack that
    // makes it. Carried into the workout screen on the resume path, which never
    // passes through StartSession.
    barLoading: BarLoading | null;
  } | null>(null);
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);
  // Schedule-shift confirm sheet: 'early' = train on a rest day (pull next session
  // forward), 'skip' = skip the upcoming scheduled day and do the one after it.
  const [shiftSheet, setShiftSheet] = useState<{ kind: 'early' | 'skip'; day: string } | null>(null);
  const shiftSlide = useRef(new Animated.Value(300)).current;
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [devTime, setDevTime] = useState<DevTimeStatus | null>(null);
  const [creatineMode, setCreatineMode] = useState<'setup' | 'daily' | null>(null);
  const creatineSlide = useRef(new Animated.Value(300)).current;
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInView | null>(null);
  /**
   * Whether this athlete's sessions go through a coach. Rescheduling affordances
   * (make-up, train-anyway, skip-ahead) all ask for a DIFFERENT session than the one
   * that was approved, which needs its own review cycle — so for a coached athlete they
   * are hidden rather than left visible and inert.
   */
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [plan, active, pending, summary, todaysCheckIn, review] = await Promise.all([
        aiCoachService.getPlan().catch(() => null),
        sessionService.getActiveSession().catch(() => null),
        proposalsService.getPending().catch(() => null),
        sessionService.getTodaySummary(today).catch(() => null),
        // Advisory: a failed read hides the card. The dashboard must never fail
        // to render because a check-in could not be fetched.
        aiCoachService.getCheckIn().catch(() => null),
        aiCoachService.getReviewStatus().catch(() => null),
      ]);
      setPlanData(plan ? { nextSessionJson: plan.nextSessionJson, trainingDays: plan.trainingDays, planText: plan.plan, missedSession: plan.missedSession, catchUpRecommendation: plan.catchUpRecommendation, nextScheduledDay: plan.nextScheduledDay, skipAheadDay: plan.skipAheadDay, completedToday: plan.completedToday, regenerating: plan.regenerating, barLoading: plan.barLoading } : null);
      setActiveSessionId(active?.id ?? null);
      setProposal(pending);
      setTodaySummary(summary);
      setCheckIn(todaysCheckIn);
      setReviewStatus(review);
    } finally {
      setPlanLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleAccept = async () => {
    if (!proposal) return;
    setProposalLoading(true);
    try {
      await proposalsService.accept(proposal.id);
      setProposal(null);
    } finally {
      setProposalLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!proposal) return;
    setProposalLoading(true);
    try {
      await proposalsService.decline(proposal.id);
      setProposal(null);
    } finally {
      setProposalLoading(false);
    }
  };

  const openCreatineModal = (mode: 'setup' | 'daily') => {
    setCreatineMode(mode);
  };

  // Run the slide-up entrance *after* the modal mounts. Starting a native-driven
  // animation synchronously in openCreatineModal (before the render commits) is
  // unreliable on the New Architecture / release builds — the sheet's native node
  // doesn't exist yet, so the animation is dropped and the sheet never appears.
  useEffect(() => {
    if (creatineMode === null) return;
    creatineSlide.setValue(300);
    let anim: Animated.CompositeAnimation | undefined;
    const raf = requestAnimationFrame(() => {
      anim = Animated.spring(creatineSlide, { toValue: 0, useNativeDriver: true, bounciness: 4 });
      anim.start();
    });
    return () => { cancelAnimationFrame(raf); anim?.stop(); };
  }, [creatineMode, creatineSlide]);

  const closeCreatineModal = (onDone?: () => void) => {
    Animated.timing(creatineSlide, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => {
      setCreatineMode(null);
      onDone?.();
    });
  };

  const checkCreatine = useCallback(async () => {
    const enabled = await AsyncStorage.getItem(CREATINE_ENABLED_KEY).catch(() => null);
    if (enabled === null) {
      openCreatineModal('setup');
    } else if (enabled === 'yes') {
      const taken = await AsyncStorage.getItem(CREATINE_DATE_KEY).catch(() => null);
      if (taken !== today) openCreatineModal('daily');
    }
  }, [today]);

  const handleCreatineSetupYes = async () => {
    await AsyncStorage.setItem(CREATINE_ENABLED_KEY, 'yes').catch(() => {});
    const taken = await AsyncStorage.getItem(CREATINE_DATE_KEY).catch(() => null);
    closeCreatineModal(taken !== today ? () => openCreatineModal('daily') : undefined);
  };

  const handleCreatineSetupNo = async () => {
    await AsyncStorage.setItem(CREATINE_ENABLED_KEY, 'no').catch(() => {});
    closeCreatineModal();
  };

  const handleCreatineTaken = async () => {
    await AsyncStorage.setItem(CREATINE_DATE_KEY, today).catch(() => {});
    closeCreatineModal();
  };

  const handleCreatineNotYet = () => {
    closeCreatineModal();
  };

  const loadDevTime = useCallback(async () => {
    try {
      const status = await devTimeService.getStatus();
      setDevTime(status.virtual ? status : null);
    } catch {
      setDevTime(null);
    }
  }, []);

  const handleDevTimeReset = async () => {
    try {
      await devTimeService.reset();
      setDevTime(null);
      loadDashboard(true);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    loadDashboard();
    checkCreatine();
    loadDevTime();
  }, [loadDashboard, checkCreatine, loadDevTime]));

  // While the next-session plan regenerates in the background, poll silently until it
  // lands so the spinner flips to the fresh workout without needing a manual pull-to-refresh.
  const regeneratingFlag = planData?.regenerating ?? false;
  useEffect(() => {
    if (!regeneratingFlag) return;
    const id = setInterval(() => { loadDashboard(); }, 4000);
    return () => clearInterval(id);
  }, [regeneratingFlag, loadDashboard]);

  const handleRefresh = () => {
    loadDashboard(true);
    refetchLogs();
  };

  const totalCalories = foodLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
  // Today's strength session is already logged. Treat the rest of today like a rest
  // day so the card offers the NEXT session (e.g. "train Wednesday early") instead of
  // re-issuing the session just completed.
  const completedToday = planData?.completedToday ?? false;
  const isTrainingDay = (planData?.trainingDays?.includes(todayDayName) ?? false) && !completedToday;
  // The next session's plan is regenerated in the background after finishing a workout.
  // While that runs, the stored nextSessionJson is still the session just completed, so
  // hide the stale preview behind a spinner instead of re-surfacing the old workout.
  const regenerating = planData?.regenerating ?? false;
  const nextSession = planData?.nextSessionJson;
  const hasTrainingSchedule = (planData?.trainingDays?.length ?? 0) > 0;

  // Missed-session catch-up: server detects a scheduled day earlier this week with
  // no logged session and recommends make-up vs skip (48h-spacing rule).
  const missed = planData?.missedSession ?? null;
  const catchUpRec = planData?.catchUpRecommendation ?? null;
  // A coached athlete's sessions are approved one at a time, so anything that asks for
  // a different day has no approved session behind it. Hidden rather than inert.
  const coached = reviewStatus != null && reviewStatus.state !== 'none';
  const showCatchUp = !!missed && !catchUpDismissed && !activeSessionId && !coached;
  const nextScheduledDay = planData?.nextScheduledDay ?? null;
  const skipAheadDay = planData?.skipAheadDay ?? null;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const startMakeUpWorkout = () => {
    navigation.navigate('StartSession', { makeUp: true });
  };

  // Compact preview of the AI-generated upcoming session — rendered on training
  // days (above Start) and on rest/done days (under "Next session: …"), so the
  // plan produced after each workout is actually visible before StartSession.
  const renderSessionPreview = (spaced = false) => {
    const exercises = nextSession?.exercises;
    if (!exercises?.length) return null;
    return (
      <View style={[styles.previewCard, spaced && styles.previewCardSpaced]}>
        {exercises.map((ex, i) => (
          <View key={i} style={[styles.previewRow, i === exercises.length - 1 && styles.previewRowLast]}>
            <Text style={styles.previewExName} numberOfLines={1}>{exName(ex.name)}</Text>
            <Text style={styles.previewExDetail}>
              {ex.sets}×{ex.reps} @ {ex.weight > 0 ? `${ex.weight}kg` : 'BW'}{ex.weightPerc ? ` · ${ex.weightPerc}% 1RM` : ''}{ex.rpe ? ` · RPE ${ex.rpe}` : ''}
            </Text>
          </View>
        ))}
        {nextSession?.coachsCall ? (
          <View style={styles.previewCoachsCall}>
            <Text style={styles.previewCoachsCallLabel}>{t('session.coachsCall', { defaultValue: "Coach's call" })}</Text>
            <Text style={styles.previewCoachsCallText}>{nextSession.coachsCall}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // Schedule-shift sheet animation — entrance runs after mount (rAF) so the native
  // node exists, matching the creatine sheet (synchronous entrance drops on New Arch).
  useEffect(() => {
    if (shiftSheet === null) return;
    shiftSlide.setValue(300);
    let anim: Animated.CompositeAnimation | undefined;
    const raf = requestAnimationFrame(() => {
      anim = Animated.spring(shiftSlide, { toValue: 0, useNativeDriver: true, bounciness: 4 });
      anim.start();
    });
    return () => { cancelAnimationFrame(raf); anim?.stop(); };
  }, [shiftSheet, shiftSlide]);

  const closeShiftSheet = (onDone?: () => void) => {
    Animated.timing(shiftSlide, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => {
      setShiftSheet(null);
      onDone?.();
    });
  };

  // "Train anyway": pull the next scheduled session forward.
  //  - Genuine rest day (nothing done today): the plan already targets
  //    nextScheduledDay, so reuse it directly — no AI wait, no flag.
  //  - Already trained today (training-ahead, e.g. did Wed and now want Fri): the
  //    stored plan still targets the day just completed, and the `planFromToday`
  //    guard would re-serve it. Force a fresh build for the next slot via trainAhead.
  const confirmTrainEarly = () => {
    closeShiftSheet(() => navigation.navigate('StartSession',
      completedToday
        ? { trainAhead: true }
        : {
            plan: planData?.planText ?? undefined,
            nextSessionJson: planData?.nextSessionJson ?? undefined,
          },
    ));
  };

  // Skip the upcoming scheduled day and generate the one after it (skipNext).
  const confirmSkipAhead = () => {
    closeShiftSheet(() => navigation.navigate('StartSession', { skipNext: true }));
  };

  const startTodayWorkout = () => {
    if (activeSessionId) {
      navigation.navigate('ActiveWorkout', {
        sessionId: activeSessionId,
        plannedExercises: nextSession?.exercises ?? undefined,
        barLoading: planData?.barLoading ?? null,
      });
      return;
    }
    navigation.navigate('StartSession', {
      plan: planData?.planText ?? undefined,
      nextSessionJson: planData?.nextSessionJson ?? undefined,
    });
  };

  // AI Coach is gated behind setup — never let the user reach the plan/generate
  // screen without an AI profile. Route them through the setup flow instead.
  const openAICoach = () => {
    navigation.navigate(user?.isAICoachSetupComplete ? 'AICoachPlan' : 'AICoachWelcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        left={<UserAvatar user={user} size={36} />}
        title={isTrainingDay ? t('home.trainingDay') : `Hey, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle={safeLocaleDateString(new Date(), locale, { weekday: 'long', month: 'long', day: 'numeric' })}
        right={
          <View style={styles.headerBtnRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('WorkoutHistory')}
              style={styles.headerBtn}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('nav.history')}
            >
              <CalendarBlank size={20} weight="bold" color={palette.gray[300]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('SupportChat')}
              style={styles.headerBtn}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('support.title', { defaultValue: 'Support' })}
            >
              <Question size={20} weight="bold" color={palette.gray[300]} />
            </TouchableOpacity>
          </View>
        }
      />
      {devTime && (
        <TouchableOpacity accessibilityRole="button" style={styles.devTimeBanner} onLongPress={handleDevTimeReset} activeOpacity={0.7}>
          <Text style={styles.devTimeBannerText}>
            DEV · {new Date(devTime.currentDate).toDateString()} · Long-press to reset
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || logsLoading}
            onRefresh={handleRefresh}
            tintColor={palette.brand[500]}
          />
        }
      >

        {/* Coach Proposal Card */}
        {proposal && (
          <View style={styles.proposalCard}>
            <View style={styles.proposalHeader}>
              <Lightbulb size={22} weight="fill" color={palette.brand[400]} style={{ marginTop: 2 }} />
              <View style={styles.proposalHeaderText}>
                <Text style={styles.proposalLabel}>{t('home.coachSuggestion')}</Text>
                <Text style={styles.proposalTitle}>{proposal.title}</Text>
              </View>
            </View>
            <Text style={styles.proposalReasoning}>{proposal.reasoning}</Text>
            <View style={styles.proposalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.proposalBtn, styles.proposalBtnDecline]}
                onPress={handleDecline}
                disabled={proposalLoading}
              >
                <Text style={styles.proposalBtnDeclineText}>{t('home.notForMe')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.proposalBtn, styles.proposalBtnAccept]}
                onPress={handleAccept}
                disabled={proposalLoading}
              >
                {proposalLoading
                  ? <ActivityIndicator color={palette.white} size="small" />
                  : <Text style={styles.proposalBtnAcceptText}>{t('home.soundsGood')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Missed-session catch-up — offer to make up the missed day or skip it */}
        {showCatchUp && missed && (
          <View style={styles.catchUpCard}>
            <Text style={styles.catchUpLabel}>{t('home.catchUp.label', { defaultValue: 'MISSED SESSION' })}</Text>
            <Text style={styles.catchUpTitle}>
              {t('home.catchUp.title', {
                defaultValue: 'You missed {{day}} ({{lifts}})',
                day: cap(missed.day),
                lifts: missed.lifts.length ? missed.lifts.join(' + ') : t('home.catchUp.accessory', { defaultValue: 'accessory work' }),
              })}
            </Text>
            <Text style={styles.catchUpSub}>
              {catchUpRec === 'skip'
                ? t('home.catchUp.skipHint', { defaultValue: "Heads up — it's too close to your next session, so skipping is the safer call." })
                : t('home.catchUp.makeUpHint', { defaultValue: "It won't clash with your next session — a good one to make up." })}
            </Text>
            <View style={styles.catchUpActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.catchUpBtn, catchUpRec === 'skip' ? styles.catchUpBtnGhost : styles.catchUpBtnPrimary]}
                onPress={startMakeUpWorkout}
              >
                <Text style={catchUpRec === 'skip' ? styles.catchUpBtnGhostText : styles.catchUpBtnPrimaryText}>
                  {t('home.catchUp.doToday', { defaultValue: "Do it today" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.catchUpBtn, catchUpRec === 'skip' ? styles.catchUpBtnPrimary : styles.catchUpBtnGhost]}
                onPress={() => setCatchUpDismissed(true)}
              >
                <Text style={catchUpRec === 'skip' ? styles.catchUpBtnPrimaryText : styles.catchUpBtnGhostText}>
                  {t('home.catchUp.skip', { defaultValue: 'Skip it' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Workout Card — takes over entirely when a session is in progress */}
        <Card style={[styles.cardSpacing, activeSessionId ? styles.cardActive : isTrainingDay && styles.cardHighlight]}>
          <View style={styles.cardHeader}>
            {activeSessionId
              ? <Timer size={22} weight="fill" color={palette.error[500]} />
              : <Barbell size={22} weight="bold" color={palette.brand[400]} />
            }
            <Text style={styles.cardTitle}>{activeSessionId ? t('session.workoutInProgress') : t('home.todaysWorkout')}</Text>
            {!activeSessionId && isTrainingDay && (
              <View style={styles.trainingDayBadge}><Text style={styles.trainingDayBadgeText}>{t('home.trainingBadge')}</Text></View>
            )}
          </View>

          {activeSessionId ? (
            /* ── Active session state — nothing else shown ── */
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={startTodayWorkout}
              accessibilityRole="button"
              accessibilityLabel={t('home.tapToResume')}
            >
              <View style={styles.resumePulse} />
              <Text style={styles.resumeBtnText}>{t('home.tapToResume')}</Text>
              <Text style={styles.resumeChevron}>›</Text>
            </TouchableOpacity>
          ) : planLoading ? (
            <ActivityIndicator color={palette.brand[500]} style={{ marginVertical: 16 }} />
          ) : !hasTrainingSchedule ? (
            <TouchableOpacity accessibilityRole="button" style={styles.setupPrompt} onPress={openAICoach}>
              <Text style={styles.setupPromptText}>{t('home.noSchedule')}</Text>
              <Text style={styles.setupPromptSub}>{t('home.generateFirst')}</Text>
            </TouchableOpacity>
          ) : !isTrainingDay ? (
            <View style={styles.restDayBlock}>
              {completedToday ? (
                <CheckCircle size={40} weight="fill" color={palette.brand[400]} style={{ marginBottom: 6 }} />
              ) : (
                <Moon size={40} weight="fill" color={palette.gray[500]} style={{ marginBottom: 6 }} />
              )}
              <Text style={styles.restDayText}>
                {completedToday
                  ? t('home.doneForToday', { defaultValue: 'Nice work — done for today' })
                  : t('home.restDay')}
              </Text>
              {nextScheduledDay && (
                <Text style={styles.restDaySub}>{t('home.nextSession')}: {cap(nextScheduledDay)}</Text>
              )}
              {regenerating ? (
                /* Next session's plan is still regenerating in the background — show a
                   spinner instead of the just-completed workout, and hide "Train anyway"
                   until the fresh session lands (polled in silently). */
                <View style={styles.regenBlock}>
                  <ActivityIndicator color={palette.brand[500]} />
                  <Text style={styles.regenText}>
                    {t('home.preparingNext', { defaultValue: 'Preparing your next session…' })}
                  </Text>
                </View>
              ) : (
                <>
                  {renderSessionPreview(true)}
                  {nextScheduledDay && !coached && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.shiftLink}
                      onPress={() => setShiftSheet({ kind: 'early', day: nextScheduledDay })}
                    >
                      <Text style={styles.shiftLinkText}>{t('home.trainEarly.cta', { defaultValue: 'Train anyway' })}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : nextSession ? (
            <>
              <View style={styles.sessionReadyRow}>
                <View style={styles.sessionReadyDot} />
                <Text style={styles.sessionReadyText}>{t('home.sessionReady')}</Text>
              </View>
              {renderSessionPreview()}
              <TouchableOpacity accessibilityRole="button" style={styles.startBtn} onPress={startTodayWorkout}>
                <Text style={styles.startBtnText}>{t('home.startWorkout')}</Text>
              </TouchableOpacity>
              {skipAheadDay && skipAheadDay !== todayDayName && !coached && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.shiftLink}
                  onPress={() => setShiftSheet({ kind: 'skip', day: skipAheadDay })}
                >
                  <Text style={styles.shiftLinkText}>{t('home.skipAhead.cta', { defaultValue: 'Skip → do {{day}} instead', day: cap(skipAheadDay) })}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity accessibilityRole="button" style={styles.setupPrompt} onPress={openAICoach}>
              <Text style={styles.setupPromptText}>{t('home.noPlan')}</Text>
              <Text style={styles.setupPromptSub}>{t('home.generateFirst')}</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Daily Check-in Card — the athlete's report to their coach for today. */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('home.checkInTitle')}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DailyCheckIn')}
        >
          <Card style={styles.cardSpacing}>
            <View style={styles.cardHeader}>
              <ClipboardText size={22} weight="bold" color={palette.brand[400]} />
              <Text style={styles.cardTitle}>{t('home.checkInTitle')}</Text>
              {checkIn?.submitted && (
                <CheckCircle size={20} weight="fill" color={palette.success[500]} />
              )}
            </View>
            <Text style={styles.checkInPrompt}>
              {checkIn?.submitted ? t('home.checkInDone') : t('home.checkInPrompt')}
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Nutrition Card */}
        <Card style={styles.cardSpacing}>
          <View style={styles.cardHeader}>
            <ForkKnife size={22} weight="bold" color={palette.brand[400]} />
            <Text style={styles.cardTitle}>{t('home.nutritionToday')}</Text>
          </View>
          <View style={styles.nutritionRow}>
            <View style={styles.nutritionStat}>
              <Text style={styles.nutritionValue}>{totalCalories}</Text>
              <Text style={styles.nutritionLabel}>{t('home.calories')}</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionStat}>
              <Text style={styles.nutritionValue}>{foodLogs?.length || 0}</Text>
              <Text style={styles.nutritionLabel}>{t('home.meals')}</Text>
            </View>
          </View>
        </Card>

        {/* Steps Card */}
        {stepsAvailable && (
          <Card style={styles.cardSpacing}>
            <View style={styles.cardHeader}>
              <Sneaker size={22} weight="bold" color={palette.brand[400]} />
              <Text style={styles.cardTitle}>{t('home.todaysSteps')}</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepCount}>{steps.toLocaleString()}</Text>
              <Text style={styles.stepGoal}>/ {STEP_GOAL.toLocaleString()}</Text>
            </View>
            <View style={styles.stepBarBg}>
              <View style={[styles.stepBarFill, { width: `${Math.min((steps / STEP_GOAL) * 100, 100)}%` as DimensionValue }]} />
            </View>
            <Text style={styles.stepPercent}>
              {steps >= STEP_GOAL ? t('home.goalReached') : t('home.percentOfGoal', { percent: Math.round((steps / STEP_GOAL) * 100) })}
            </Text>
          </Card>
        )}

        {/* Today's Recap Card */}
        {(todaySummary?.strength || (todaySummary?.cardio?.length ?? 0) > 0) && (
          <Card style={styles.cardSpacing}>
            <View style={styles.cardHeader}>
              <ChartLineUp size={22} weight="bold" color={palette.brand[400]} />
              <Text style={styles.cardTitle}>Today's Recap</Text>
              {(todaySummary?.strength?.prsCount ?? 0) > 0 && (
                <View style={styles.prBadge}>
                  <Lightning size={10} weight="fill" color={palette.warning[400]} />
                  <Text style={styles.prBadgeText}>
                    {todaySummary!.strength!.prsCount} PR{todaySummary!.strength!.prsCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {todaySummary?.strength && (
              <>
                <View style={styles.recapSectionRow}>
                  <Barbell size={13} weight="bold" color={palette.gray[500]} />
                  <Text style={styles.recapSectionLabel}>STRENGTH</Text>
                  <Text style={styles.recapSectionMeta}>
                    {todaySummary.strength.totalVolumeKg.toLocaleString()} kg
                    {todaySummary.strength.durationMinutes ? `  ·  ${todaySummary.strength.durationMinutes} min` : ''}
                  </Text>
                </View>
                {todaySummary.strength.exercises.map((ex) => (
                  <View key={ex.name} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                    <Text style={styles.exerciseSet}>{ex.bestWeight} kg × {ex.bestReps}</Text>
                    {ex.deltaKg !== null ? (
                      <Text style={[
                        styles.exerciseDelta,
                        ex.deltaKg > 0 ? styles.deltaUp : ex.deltaKg < 0 ? styles.deltaDown : styles.deltaFlat,
                      ]}>
                        {ex.deltaKg > 0 ? `↑ +${ex.deltaKg}` : ex.deltaKg < 0 ? `↓ ${ex.deltaKg}` : '→'}
                      </Text>
                    ) : (
                      <Text style={styles.deltaNew}>new</Text>
                    )}
                    {ex.isPR && <Lightning size={11} weight="fill" color={palette.warning[400]} style={{ marginLeft: 3 }} />}
                  </View>
                ))}
              </>
            )}

            {(todaySummary?.cardio?.length ?? 0) > 0 && todaySummary!.cardio.map((c, i) => (
              <View key={i} style={[styles.cardioRow, todaySummary?.strength ? styles.cardioRowTop : undefined]}>
                <Heartbeat size={13} weight="bold" color={palette.gray[500]} />
                <Text style={styles.cardioType}>{cardioLabel(c.cardioType)}</Text>
                <Text style={styles.cardioMeta}>
                  {[
                    c.durationMinutes ? `${c.durationMinutes} min` : null,
                    c.distanceKm ? `${c.distanceKm} km` : null,
                    c.caloriesBurned ? `${c.caloriesBurned} kcal` : null,
                  ].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Quick nav */}
        <View style={styles.quickRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.quickCard} onPress={() => navigation.navigate('WorkoutHistory')}>
            <CalendarBlank size={26} weight="bold" color={palette.brand[400]} />
            <Text style={styles.quickLabel}>{t('nav.history')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.quickCard} onPress={openAICoach}>
            <Robot size={26} weight="bold" color={palette.brand[400]} />
            <Text style={styles.quickLabel}>{t('home.aiCoach')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.quickCard} onPress={() => navigation.navigate('StartSession', { freeSession: true })}>
            <Barbell size={26} weight="bold" color={palette.brand[400]} />
            <Text style={styles.quickLabel}>{t('home.logWorkout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Rated quiz — one question, answered inline; shares the Elo rating
            with the full quiz screen */}
        <HomeQuizCard style={{ marginTop: theme.spacing.md }} />

      </ScrollView>
      {/* Creatine reminder (setup one-time OR daily check) */}
      <Modal transparent visible={creatineMode !== null} animationType="none" onRequestClose={handleCreatineNotYet}>
        <View style={styles.creatineOverlay}>
          <Animated.View style={[styles.creatineSheet, { transform: [{ translateY: creatineSlide }] }]}>
            <View style={styles.creatineHandle} />
            <View style={styles.creatineIconWrap}>
              <Pill size={36} weight="fill" color={palette.brand[400]} />
            </View>
            {creatineMode === 'setup' ? (
              <>
                <Text style={styles.creatineQuestion}>{t('creatine.setupTitle')}</Text>
                <Text style={styles.creatineSubtitle}>{t('creatine.setupSubtitle')}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineYesBtn} onPress={handleCreatineSetupYes}>
                  <Text style={styles.creatineYesBtnText}>{t('creatine.setupYes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineNoBtn} onPress={handleCreatineSetupNo}>
                  <Text style={styles.creatineNoBtnText}>{t('creatine.setupNo')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.creatineQuestion}>{t('creatine.question')}</Text>
                <Text style={styles.creatineSubtitle}>{t('creatine.subtitle')}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineYesBtn} onPress={handleCreatineTaken}>
                  <Text style={styles.creatineYesBtnText}>{t('creatine.yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineNoBtn} onPress={handleCreatineNotYet}>
                  <Text style={styles.creatineNoBtnText}>{t('creatine.notYet')}</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Schedule-shift confirm — train early on a rest day, or skip the next slot */}
      <Modal transparent visible={shiftSheet !== null} animationType="none" onRequestClose={() => closeShiftSheet()}>
        <View style={styles.creatineOverlay}>
          <Animated.View style={[styles.creatineSheet, { transform: [{ translateY: shiftSlide }] }]}>
            <View style={styles.creatineHandle} />
            <View style={styles.creatineIconWrap}>
              {shiftSheet?.kind === 'early'
                ? <Moon size={36} weight="fill" color={palette.brand[400]} />
                : <FastForward size={36} weight="fill" color={palette.brand[400]} />}
            </View>
            {shiftSheet?.kind === 'early' ? (
              <>
                <Text style={styles.creatineQuestion}>{t('home.trainEarly.title', { defaultValue: "Today's a rest day" })}</Text>
                <Text style={styles.creatineSubtitle}>{t('home.trainEarly.body', { defaultValue: "This pulls {{day}}'s session forward. Train now?", day: cap(shiftSheet.day) })}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineYesBtn} onPress={confirmTrainEarly}>
                  <Text style={styles.creatineYesBtnText}>{t('home.trainEarly.confirm', { defaultValue: 'Train now' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineNoBtn} onPress={() => closeShiftSheet()}>
                  <Text style={styles.creatineNoBtnText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                </TouchableOpacity>
              </>
            ) : shiftSheet?.kind === 'skip' ? (
              <>
                <Text style={styles.creatineQuestion}>{t('home.skipAhead.title', { defaultValue: "Skip today's session?" })}</Text>
                <Text style={styles.creatineSubtitle}>{t('home.skipAhead.body', { defaultValue: "You'll do {{day}}'s workout instead.", day: cap(shiftSheet.day) })}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineYesBtn} onPress={confirmSkipAhead}>
                  <Text style={styles.creatineYesBtnText}>{t('home.skipAhead.confirm', { defaultValue: 'Do {{day}} instead', day: cap(shiftSheet.day) })}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.creatineNoBtn} onPress={() => closeShiftSheet()}>
                  <Text style={styles.creatineNoBtnText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1, paddingHorizontal: 16 },

  devTimeBanner: {
    backgroundColor: palette.violet[600],
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  devTimeBannerText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  headerBtnRow: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 36,
    height: 36,
    backgroundColor: palette.gray[800],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Spacing only — the surface itself comes from <Card>.
  cardSpacing: { marginBottom: 12 },
  cardHighlight: {
    borderColor: palette.brand[600],
    backgroundColor: palette.brand[900] + '20',
  },
  cardActive: {
    borderColor: palette.error[500],
    backgroundColor: alpha(palette.error[500], 0.063),
  },

  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: alpha(palette.error[500], 0.082),
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: alpha(palette.error[500], 0.251),
  },
  resumePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.error[500],
  },
  resumeBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: palette.error[500] },
  resumeChevron: { fontSize: 20, color: palette.error[500], fontWeight: '700' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, flex: 1 },
  trainingDayBadge: {
    backgroundColor: palette.brand[600],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trainingDayBadgeText: { fontSize: 10, fontWeight: '800', color: palette.white, letterSpacing: 0.5 },

  setupPrompt: { alignItems: 'center', paddingVertical: 12 },
  setupPromptText: { fontSize: 14, color: palette.gray[300], textAlign: 'center', fontWeight: '600', marginBottom: 4 },
  setupPromptSub: { fontSize: 12, color: palette.gray[500], textAlign: 'center' },

  restDayBlock: { alignItems: 'center', paddingVertical: 12 },
restDayText: { fontSize: 18, fontWeight: '700', color: palette.gray[300], marginBottom: 4 },
  restDaySub: { fontSize: 13, color: palette.gray[500] },
  shiftLink: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'center' },
  shiftLinkText: { fontSize: 14, fontWeight: '600', color: palette.brand[400] },
  regenBlock: { alignItems: 'center', gap: 10, marginTop: 16, paddingVertical: 8 },
  regenText: { fontSize: 13, color: palette.gray[400], textAlign: 'center' },

  previewCard: {
    backgroundColor: palette.gray[800],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignSelf: 'stretch',
    borderLeftWidth: 3,
    borderLeftColor: palette.brand[500],
  },
  previewCardSpaced: { marginTop: 12 },
  previewRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.gray[700] },
  previewRowLast: { borderBottomWidth: 0 },
  previewExName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  previewExDetail: { fontSize: 12, color: palette.brand[400], fontWeight: '600', marginTop: 2 },
  previewCoachsCall: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: palette.gray[700] },
  previewCoachsCallLabel: { fontSize: 10, fontWeight: '700', color: palette.brand[400], letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  previewCoachsCallText: { fontSize: 12, lineHeight: 18, color: palette.gray[300] },

  sessionReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sessionReadyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.brand[500],
  },
  sessionReadyText: {
    fontSize: 13,
    color: palette.gray[400],
  },
  startBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },

  checkInPrompt: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  nutritionRow: { flexDirection: 'row', alignItems: 'center' },
  nutritionStat: { flex: 1, alignItems: 'center' },
  nutritionValue: { fontSize: 28, fontWeight: '800', color: theme.colors.accent },
  nutritionLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  nutritionDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },

  stepRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  stepCount: { fontSize: 32, fontWeight: '900', color: theme.colors.text },
  stepGoal: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 4 },
  stepBarBg: { height: 6, borderRadius: 3, backgroundColor: palette.gray[700], overflow: 'hidden', marginBottom: 6 },
  stepBarFill: { height: '100%', borderRadius: 3, backgroundColor: palette.brand[500] },
  stepPercent: { fontSize: 12, color: theme.colors.textSecondary },

  proposalCard: {
    backgroundColor: palette.indigo[950],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.brand[700],
  },
  proposalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
proposalHeaderText: { flex: 1 },
  proposalLabel: { fontSize: 10, fontWeight: '800', color: palette.brand[400], letterSpacing: 1, marginBottom: 3 },
  proposalTitle: { fontSize: 15, fontWeight: '700', color: palette.white },
  proposalReasoning: { fontSize: 13, color: palette.gray[300], lineHeight: 19, marginBottom: 14 },
  proposalActions: { flexDirection: 'row', gap: 10 },
  proposalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  proposalBtnDecline: { backgroundColor: palette.gray[700] },
  proposalBtnAccept: { backgroundColor: palette.brand[600] },
  proposalBtnDeclineText: { fontSize: 13, fontWeight: '700', color: palette.gray[300] },
  proposalBtnAcceptText: { fontSize: 13, fontWeight: '700', color: palette.white },

  // Missed-session catch-up card
  catchUpCard: {
    backgroundColor: theme.surfaceTint.warningDeep,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.warning[700],
  },
  catchUpLabel: { fontSize: 10, fontWeight: '800', color: palette.warning[400], letterSpacing: 1, marginBottom: 4 },
  catchUpTitle: { fontSize: 15, fontWeight: '700', color: palette.white, marginBottom: 4 },
  catchUpSub: { fontSize: 13, color: palette.gray[300], lineHeight: 19, marginBottom: 14 },
  catchUpActions: { flexDirection: 'row', gap: 10 },
  catchUpBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  catchUpBtnPrimary: { backgroundColor: palette.brand[600] },
  catchUpBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: palette.white },
  catchUpBtnGhost: { backgroundColor: palette.gray[700] },
  catchUpBtnGhostText: { fontSize: 13, fontWeight: '700', color: palette.gray[300] },

  // Today's Recap card
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: alpha(palette.warning[900], 0.251),
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: palette.warning[700],
  },
  prBadgeText: { fontSize: 10, fontWeight: '800', color: palette.warning[400], letterSpacing: 0.3 },

  recapSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    marginTop: 2,
  },
  recapSectionLabel: { fontSize: 10, fontWeight: '800', color: palette.gray[500], letterSpacing: 0.8, flex: 1 },
  recapSectionMeta: { fontSize: 11, color: palette.gray[500] },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 8,
  },
  exerciseName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  exerciseSet: { fontSize: 13, color: palette.gray[300], minWidth: 80, textAlign: 'right' },
  exerciseDelta: { fontSize: 12, fontWeight: '700', minWidth: 58, textAlign: 'right' },
  deltaUp: { color: palette.success[400] },
  deltaDown: { color: palette.error[400] },
  deltaFlat: { color: palette.gray[500] },
  deltaNew: { fontSize: 11, fontWeight: '700', color: palette.brand[400], minWidth: 58, textAlign: 'right' },

  cardioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  cardioRowTop: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cardioType: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  cardioMeta: { flex: 1, fontSize: 12, color: palette.gray[400], textAlign: 'right' },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  quickCard: {
    flex: 1,
    backgroundColor: palette.gray[800],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
quickLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[300], letterSpacing: 0.3 },

  creatineOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  creatineSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  creatineHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray[600],
    marginBottom: 20,
  },
  creatineIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.brand[900] + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.brand[700],
  },
  creatineQuestion: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  creatineSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  creatineYesBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  creatineYesBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.white,
  },
  creatineNoBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  creatineNoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.gray[400],
  },
});
