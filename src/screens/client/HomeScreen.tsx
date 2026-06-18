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
import { theme, palette } from '../../theme';
import { aiCoachService, NextSession } from '../../services/ai-coach.service';
import { sessionService, TodaySummary } from '../../services/session.service';
import { proposalsService, AIProposal } from '../../services/proposals.service';
import { devTimeService, DevTimeStatus } from '../../services/dev-time.service';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { UserAvatar } from '../../components/ui/UserAvatar';
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
} from 'phosphor-react-native';

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
  } | null>(null);
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [devTime, setDevTime] = useState<DevTimeStatus | null>(null);
  const [creatineMode, setCreatineMode] = useState<'setup' | 'daily' | null>(null);
  const creatineSlide = useRef(new Animated.Value(300)).current;
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [plan, active, pending, summary] = await Promise.all([
        aiCoachService.getPlan().catch(() => null),
        sessionService.getActiveSession().catch(() => null),
        proposalsService.getPending().catch(() => null),
        sessionService.getTodaySummary(today).catch(() => null),
      ]);
      setPlanData(plan ? { nextSessionJson: plan.nextSessionJson, trainingDays: plan.trainingDays, planText: plan.plan, missedSession: plan.missedSession, catchUpRecommendation: plan.catchUpRecommendation } : null);
      setActiveSessionId(active?.id ?? null);
      setProposal(pending);
      setTodaySummary(summary);
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

  const handleRefresh = () => {
    loadDashboard(true);
    refetchLogs();
  };

  const totalCalories = foodLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
  const isTrainingDay = planData?.trainingDays?.includes(todayDayName) ?? false;
  const nextSession = planData?.nextSessionJson;
  const hasTrainingSchedule = (planData?.trainingDays?.length ?? 0) > 0;

  // Missed-session catch-up: server detects a scheduled day earlier this week with
  // no logged session and recommends make-up vs skip (48h-spacing rule).
  const missed = planData?.missedSession ?? null;
  const catchUpRec = planData?.catchUpRecommendation ?? null;
  const showCatchUp = !!missed && !catchUpDismissed && !activeSessionId;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const startMakeUpWorkout = () => {
    navigation.navigate('StartSession', { makeUp: true });
  };

  const startTodayWorkout = () => {
    if (activeSessionId) {
      navigation.navigate('ActiveWorkout', {
        sessionId: activeSessionId,
        plannedExercises: nextSession?.exercises ?? undefined,
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
            <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')} style={styles.headerBtn}>
              <CalendarBlank size={20} weight="bold" color={palette.gray[300]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('SupportChat')} style={styles.headerBtn}>
              <Question size={20} weight="bold" color={palette.gray[300]} />
            </TouchableOpacity>
          </View>
        }
      />
      {devTime && (
        <TouchableOpacity style={styles.devTimeBanner} onLongPress={handleDevTimeReset} activeOpacity={0.7}>
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
                style={[styles.proposalBtn, styles.proposalBtnDecline]}
                onPress={handleDecline}
                disabled={proposalLoading}
              >
                <Text style={styles.proposalBtnDeclineText}>{t('home.notForMe')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proposalBtn, styles.proposalBtnAccept]}
                onPress={handleAccept}
                disabled={proposalLoading}
              >
                {proposalLoading
                  ? <ActivityIndicator color="#fff" size="small" />
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
                style={[styles.catchUpBtn, catchUpRec === 'skip' ? styles.catchUpBtnGhost : styles.catchUpBtnPrimary]}
                onPress={startMakeUpWorkout}
              >
                <Text style={catchUpRec === 'skip' ? styles.catchUpBtnGhostText : styles.catchUpBtnPrimaryText}>
                  {t('home.catchUp.doToday', { defaultValue: "Do it today" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
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
        <View style={[styles.card, activeSessionId ? styles.cardActive : isTrainingDay && styles.cardHighlight]}>
          <View style={styles.cardHeader}>
            {activeSessionId
              ? <Timer size={22} weight="fill" color="#ef4444" />
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
            >
              <View style={styles.resumePulse} />
              <Text style={styles.resumeBtnText}>{t('home.tapToResume')}</Text>
              <Text style={styles.resumeChevron}>›</Text>
            </TouchableOpacity>
          ) : planLoading ? (
            <ActivityIndicator color={palette.brand[500]} style={{ marginVertical: 16 }} />
          ) : !hasTrainingSchedule ? (
            <TouchableOpacity style={styles.setupPrompt} onPress={openAICoach}>
              <Text style={styles.setupPromptText}>{t('home.noSchedule')}</Text>
              <Text style={styles.setupPromptSub}>{t('home.generateFirst')}</Text>
            </TouchableOpacity>
          ) : !isTrainingDay ? (
            <View style={styles.restDayBlock}>
              <Moon size={40} weight="fill" color={palette.gray[500]} style={{ marginBottom: 6 }} />
              <Text style={styles.restDayText}>{t('home.restDay')}</Text>
              {(() => {
                const days = planData?.trainingDays ?? [];
                const todayIdx = new Date().getDay();
                for (let i = 1; i <= 7; i++) {
                  const candidate = DAY_NAMES[(todayIdx + i) % 7];
                  if (days.includes(candidate)) {
                    return <Text style={styles.restDaySub}>{t('home.nextSession')}: {candidate.charAt(0).toUpperCase() + candidate.slice(1)}</Text>;
                  }
                }
                return null;
              })()}
            </View>
          ) : nextSession ? (
            <>
              <View style={styles.sessionReadyRow}>
                <View style={styles.sessionReadyDot} />
                <Text style={styles.sessionReadyText}>{t('home.sessionReady')}</Text>
              </View>
              <TouchableOpacity style={styles.startBtn} onPress={startTodayWorkout}>
                <Text style={styles.startBtnText}>{t('home.startWorkout')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.setupPrompt} onPress={openAICoach}>
              <Text style={styles.setupPromptText}>{t('home.noPlan')}</Text>
              <Text style={styles.setupPromptSub}>{t('home.generateFirst')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nutrition Card */}
        <View style={styles.card}>
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
        </View>

        {/* Steps Card */}
        {stepsAvailable && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sneaker size={22} weight="bold" color={palette.brand[400]} />
              <Text style={styles.cardTitle}>{t('home.todaysSteps')}</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepCount}>{steps.toLocaleString()}</Text>
              <Text style={styles.stepGoal}>/ {STEP_GOAL.toLocaleString()}</Text>
            </View>
            <View style={styles.stepBarBg}>
              <View style={[styles.stepBarFill, { width: `${Math.min((steps / STEP_GOAL) * 100, 100)}%` as any }]} />
            </View>
            <Text style={styles.stepPercent}>
              {steps >= STEP_GOAL ? t('home.goalReached') : t('home.percentOfGoal', { percent: Math.round((steps / STEP_GOAL) * 100) })}
            </Text>
          </View>
        )}

        {/* Today's Recap Card */}
        {(todaySummary?.strength || (todaySummary?.cardio?.length ?? 0) > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ChartLineUp size={22} weight="bold" color={palette.brand[400]} />
              <Text style={styles.cardTitle}>Today's Recap</Text>
              {(todaySummary?.strength?.prsCount ?? 0) > 0 && (
                <View style={styles.prBadge}>
                  <Lightning size={10} weight="fill" color="#fbbf24" />
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
                    {ex.isPR && <Lightning size={11} weight="fill" color="#fbbf24" style={{ marginLeft: 3 }} />}
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
          </View>
        )}

        {/* Quick nav */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('WorkoutHistory')}>
            <CalendarBlank size={26} weight="bold" color={palette.brand[400]} />
            <Text style={styles.quickLabel}>{t('nav.history')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={openAICoach}>
            <Robot size={26} weight="bold" color={palette.brand[400]} />
            <Text style={styles.quickLabel}>{t('home.aiCoach')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('StartSession', { freeSession: true })}>
            <Barbell size={26} weight="bold" color={palette.brand[400]} />
            <Text style={styles.quickLabel}>{t('home.logWorkout')}</Text>
          </TouchableOpacity>
        </View>

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
                <TouchableOpacity style={styles.creatineYesBtn} onPress={handleCreatineSetupYes}>
                  <Text style={styles.creatineYesBtnText}>{t('creatine.setupYes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.creatineNoBtn} onPress={handleCreatineSetupNo}>
                  <Text style={styles.creatineNoBtnText}>{t('creatine.setupNo')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.creatineQuestion}>{t('creatine.question')}</Text>
                <Text style={styles.creatineSubtitle}>{t('creatine.subtitle')}</Text>
                <TouchableOpacity style={styles.creatineYesBtn} onPress={handleCreatineTaken}>
                  <Text style={styles.creatineYesBtnText}>{t('creatine.yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.creatineNoBtn} onPress={handleCreatineNotYet}>
                  <Text style={styles.creatineNoBtnText}>{t('creatine.notYet')}</Text>
                </TouchableOpacity>
              </>
            )}
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
    backgroundColor: '#7c3aed',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  devTimeBannerText: {
    color: '#fff',
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

  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHighlight: {
    borderColor: palette.brand[600],
    backgroundColor: palette.brand[900] + '20',
  },
  cardActive: {
    borderColor: '#ef4444',
    backgroundColor: '#ef444410',
  },

  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444415',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  resumePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  resumeBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#ef4444' },
  resumeChevron: { fontSize: 20, color: '#ef4444', fontWeight: '700' },
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
  trainingDayBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  setupPrompt: { alignItems: 'center', paddingVertical: 12 },
  setupPromptText: { fontSize: 14, color: palette.gray[300], textAlign: 'center', fontWeight: '600', marginBottom: 4 },
  setupPromptSub: { fontSize: 12, color: palette.gray[500], textAlign: 'center' },

  restDayBlock: { alignItems: 'center', paddingVertical: 12 },
restDayText: { fontSize: 18, fontWeight: '700', color: palette.gray[300], marginBottom: 4 },
  restDaySub: { fontSize: 13, color: palette.gray[500] },

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
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

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
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.brand[700],
  },
  proposalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
proposalHeaderText: { flex: 1 },
  proposalLabel: { fontSize: 10, fontWeight: '800', color: palette.brand[400], letterSpacing: 1, marginBottom: 3 },
  proposalTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  proposalReasoning: { fontSize: 13, color: palette.gray[300], lineHeight: 19, marginBottom: 14 },
  proposalActions: { flexDirection: 'row', gap: 10 },
  proposalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  proposalBtnDecline: { backgroundColor: palette.gray[700] },
  proposalBtnAccept: { backgroundColor: palette.brand[600] },
  proposalBtnDeclineText: { fontSize: 13, fontWeight: '700', color: palette.gray[300] },
  proposalBtnAcceptText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Missed-session catch-up card
  catchUpCard: {
    backgroundColor: '#2a1e08',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.warning[700],
  },
  catchUpLabel: { fontSize: 10, fontWeight: '800', color: palette.warning[400], letterSpacing: 1, marginBottom: 4 },
  catchUpTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  catchUpSub: { fontSize: 13, color: palette.gray[300], lineHeight: 19, marginBottom: 14 },
  catchUpActions: { flexDirection: 'row', gap: 10 },
  catchUpBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  catchUpBtnPrimary: { backgroundColor: palette.brand[600] },
  catchUpBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  catchUpBtnGhost: { backgroundColor: palette.gray[700] },
  catchUpBtnGhostText: { fontSize: 13, fontWeight: '700', color: palette.gray[300] },

  // Today's Recap card
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#78350f40',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  prBadgeText: { fontSize: 10, fontWeight: '800', color: '#fbbf24', letterSpacing: 0.3 },

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
  deltaUp: { color: '#4ade80' },
  deltaDown: { color: '#f87171' },
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
    color: '#fff',
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
