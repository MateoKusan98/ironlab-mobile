import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LOCALES, safeLocaleDateString } from '../../i18n';
import { useExerciseName } from '../../hooks/useExerciseName';
import { useSettingsStore } from '../../stores/settings.store';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { sessionService } from '../../services/session.service';
import { aiCoachService } from '../../services/ai-coach.service';
import { Moon, Minus, ThumbsUp, Fire, Lightning } from 'phosphor-react-native';

const READINESS_DATE_KEY = '@ironlab_readiness_date';

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
  tired:   <Moon size={24} weight="fill" color="#6b7280" />,
  neutral: <Minus size={24} weight="bold" color="#9ca3af" />,
  good:    <ThumbsUp size={24} weight="fill" color="#f97316" />,
  great:   <Fire size={24} weight="fill" color="#ef4444" />,
  elite:   <Lightning size={24} weight="fill" color="#eab308" />,
};

export const StartSessionScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const locale = LANGUAGE_LOCALES[useSettingsStore((s) => s.language)] ?? 'en-US';
  const MOODS = MOOD_VALUES.map((v) => ({ icon: MOOD_ICONS[v], value: v, name: t(`session.moods.${v}`) }));
  const ENERGY_LABELS = ['', t('session.energyLabels.1'), t('session.energyLabels.2'), t('session.energyLabels.3'), t('session.energyLabels.4'), t('session.energyLabels.5')];
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'StartSession'>>();

  const [step, setStep] = useState<1 | 2>(1);
  const [initializing, setInitializing] = useState(true);
  const [bodyweight, setBodyweight] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [mood, setMood] = useState('good');
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
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
  const [errors, setErrors] = useState<{ sleep?: string; bodyweight?: string }>({});

  const applyPlanResult = (result: Awaited<ReturnType<typeof aiCoachService.getPlan>>) => {
    if (result.nextSessionJson?.exercises?.length) {
      setPlannedExercises(result.nextSessionJson.exercises);
    } else if (result.plan) {
      setPlannedExercises(parsePlanExercises(result.plan));
    }
    if (result.trainingWeek && result.sessionInWeek && result.sessionsPerCycle) {
      setCycleInfo({ week: result.trainingWeek, session: result.sessionInWeek, total: result.sessionsPerCycle });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];

    const init = async () => {
      // Pre-fill from last session
      sessionService.getLastReadiness().then((r) => {
        if (cancelled) return;
        if (r.lastBodyweight != null) setBodyweight(String(r.lastBodyweight));
        if (r.avgSleepHours != null) setSleepHours(String(r.avgSleepHours));
      }).catch(() => {});

      // Skip readiness if already submitted today — go straight to the workout view
      const lastReadinessDate = await AsyncStorage.getItem(READINESS_DATE_KEY).catch(() => null);
      if (!cancelled && lastReadinessDate === today) {
        setPlanLoading(true);
        try {
          const result = await aiCoachService.getPlan();
          if (!cancelled) applyPlanResult(result);
        } catch { } finally {
          if (!cancelled) { setPlanLoading(false); setStep(2); }
        }
      }

      if (!cancelled) setInitializing(false);
    };

    init();
    return () => { cancelled = true; };
  }, []);

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

  const handleSeeWorkout = async () => {
    if (!validate()) return;
    setPlanLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Mark readiness as done for today so the screen is skipped on re-entry
      await AsyncStorage.setItem(READINESS_DATE_KEY, today).catch(() => {});

      // Check if a plan was already generated today
      let result = await aiCoachService.getPlan();
      const planFromToday = result.generatedAt ? result.generatedAt.startsWith(today) : false;

      if (!planFromToday) {
        // Generate fresh plan using today's readiness data
        await aiCoachService.generatePlan({
          mood,
          energyLevel,
          sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        });
        // Re-fetch to get nextSessionJson and cycle metadata
        result = await aiCoachService.getPlan();
      }

      applyPlanResult(result);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
      Alert.alert(t('common.error'), String(Array.isArray(msg) ? msg.join('\n') : msg));
    } finally {
      setPlanLoading(false);
      setStep(2);
    }
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
            { text: t('session.resumeWorkout'), style: 'cancel', onPress: () => navigation.replace('ActiveWorkout', { sessionId: active.id }) },
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
        </View>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {step === 1 ? (
          <>
            {/* Mood */}
            <View style={styles.card}>
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
            </View>

            {/* Energy Level */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('session.energyLevel')}</Text>
              <Text style={styles.energyValue}>{ENERGY_LABELS[energyLevel]}</Text>
              <View style={styles.energyDots}>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <TouchableOpacity key={lvl} onPress={() => setEnergyLevel(lvl)} style={styles.dotWrap}>
                    <View style={[styles.dot, lvl <= energyLevel && styles.dotActive]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.startBtnText}>{t('session.seeWorkout')}</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Coach's Plan Preview */}
            {plannedExercises.length > 0 ? (
              <View style={styles.planCard}>
                <Text style={styles.cardLabel}>{t('session.todaysProgram')}</Text>
                {plannedExercises.map((ex, i) => (
                  <View key={i} style={styles.planRow}>
                    <Text style={styles.planExName}>{exName(ex.name)}</Text>
                    <Text style={styles.planExDetail}>
                      {ex.sets}×{ex.reps} @ {ex.weight > 0 ? `${ex.weight}kg` : 'BW'}{ex.rpe ? ` · RPE ${ex.rpe}` : ''}
                    </Text>
                    {ex.cue ? <Text style={styles.planExCue}>"{ex.cue}"</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>{t('session.freeSession')}</Text>
                <Text style={styles.noplanText}>{t('session.noPlansLoaded')}</Text>
              </View>
            )}

            {/* Start Button */}
            <TouchableOpacity
              style={[styles.startBtn, loading && styles.startBtnDisabled]}
              onPress={handleStart}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.startBtnText}>{t('session.startSession')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
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

  card: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
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
  statCardError: { borderWidth: 1, borderColor: '#ef4444' },
  required: { color: '#ef4444', fontSize: 11 },
  errorText: { fontSize: 10, color: '#ef4444', marginTop: 6 },

  startBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

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
});
