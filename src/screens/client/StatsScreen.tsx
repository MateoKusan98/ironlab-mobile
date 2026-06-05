import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { sessionService, AthleteStats, MuscleGroup, TopExercise, ExerciseProgression, MainLiftData } from '../../services/session.service';
import { useTranslation } from 'react-i18next';
import { useExerciseName } from '../../hooks/useExerciseName';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Moon, Minus, ThumbsUp, Fire, Lightning, Barbell, ArrowUp } from 'phosphor-react-native';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtVol = (kg: number): string => {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}kt`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg}kg`;
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const MOOD_ICON: Record<string, React.ReactElement> = {
  tired:   <Moon size={18} weight="fill" color="#6b7280" />,
  neutral: <Minus size={18} weight="bold" color="#9ca3af" />,
  good:    <ThumbsUp size={18} weight="fill" color="#f97316" />,
  great:   <Fire size={18} weight="fill" color="#ef4444" />,
  elite:   <Lightning size={18} weight="fill" color="#eab308" />,
};

const MUSCLE_COLORS: Record<string, string> = {
  'Chest': '#ef4444',
  'Back': '#3b82f6',
  'Shoulders': '#f59e0b',
  'Triceps': '#8b5cf6',
  'Biceps': '#06b6d4',
  'Quads': '#22c55e',
  'Hamstrings/Glutes': '#f97316',
  'Calves': '#84cc16',
  'Core': '#ec4899',
  'Other': palette.gray[500],
};

const LIFT_ICON: Record<string, React.ReactElement> = {
  squat:      <Barbell size={18} weight="bold" color={palette.brand[400]} />,
  benchPress: <Barbell size={18} weight="fill" color="#93c5fd" />,
  deadlift:   <Lightning size={18} weight="fill" color="#eab308" />,
  ohp:        <ArrowUp size={18} weight="bold" color="#a78bfa" />,
};

const LIFT_META: Record<string, { label: string }> = {
  squat: { label: 'Squat' },
  benchPress: { label: 'Bench Press' },
  deadlift: { label: 'Deadlift' },
  ohp: { label: 'Overhead Press' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode; accentColor?: string }> = ({
  title, children, accentColor,
}) => (
  <View style={[styles.card, accentColor && { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const HeroStat: React.FC<{ label: string; value: string | number; sub?: string; accent?: boolean }> = ({
  label, value, sub, accent,
}) => (
  <View style={styles.heroStat}>
    <Text style={[styles.heroValue, accent && { color: palette.brand[400] }]}>{value}</Text>
    {sub && <Text style={styles.heroSub}>{sub}</Text>}
    <Text style={styles.heroLabel}>{label}</Text>
  </View>
);

const WeeklyBarChart: React.FC<{ data: AthleteStats['weeklyVolume'] }> = ({ data }) => {
  const maxVol = Math.max(...data.map(w => w.volumeKg), 1);
  return (
    <View>
      <View style={styles.barChartContainer}>
        {data.map((week, i) => {
          const h = Math.max((week.volumeKg / maxVol) * 100, week.volumeKg > 0 ? 4 : 2);
          return (
            <View key={i} style={styles.barCol}>
              {week.sessions > 0 && (
                <Text style={styles.barVolLabel}>{fmtVol(week.volumeKg)}</Text>
              )}
              <View style={[
                styles.bar,
                { height: h, backgroundColor: week.volumeKg > 0 ? palette.brand[600] : palette.gray[700] },
              ]} />
              {week.sessions > 0 && (
                <View style={styles.barDot} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.barLabelsRow}>
        {data.map((week, i) => (
          <Text key={i} style={styles.barDateLabel}>
            {week.label.split(' ')[1]}
          </Text>
        ))}
      </View>
      <View style={styles.barMonthRow}>
        {data.map((week, i) => (
          <Text key={i} style={styles.barMonthLabel}>
            {i === 0 || week.label.split(' ')[0] !== data[i - 1].label.split(' ')[0]
              ? week.label.split(' ')[0]
              : ''}
          </Text>
        ))}
      </View>
    </View>
  );
};

const MuscleGroupBar: React.FC<MuscleGroup> = ({ name, volumeKg, sets, percentage }) => {
  const color = MUSCLE_COLORS[name] ?? palette.brand[500];
  return (
    <View style={styles.muscleRow}>
      <View style={styles.muscleHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.muscleColorDot, { backgroundColor: color }]} />
          <Text style={styles.muscleName}>{name}</Text>
        </View>
        <Text style={styles.muscleDetail}>{percentage}% · {sets} sets · {fmtVol(volumeKg)}</Text>
      </View>
      <View style={styles.muscleBarBg}>
        <View style={[styles.muscleBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const MainLiftCard: React.FC<{ liftKey: string; data: MainLiftData | null }> = ({ liftKey, data }) => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const meta = LIFT_META[liftKey];
  return (
    <View style={styles.liftCard}>
      <View style={styles.liftIcon}>{LIFT_ICON[liftKey]}</View>
      <Text style={styles.liftName}>{exName(meta.label)}</Text>
      {data ? (
        <>
          <Text style={styles.liftEst1RM}>{data.est1RM}<Text style={styles.liftUnit}>kg</Text></Text>
          <Text style={styles.liftSub}>{t('stats.est1RM')}</Text>
          <Text style={styles.liftDetail}>{data.weight}kg × {data.reps}</Text>
        </>
      ) : (
        <Text style={styles.liftNoData}>—</Text>
      )}
    </View>
  );
};

const ExerciseRow: React.FC<{ exercise: TopExercise; rank: number }> = ({ exercise, rank }) => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  return (
    <View style={styles.exRow}>
      <Text style={styles.exRank}>#{rank}</Text>
      <View style={styles.exInfo}>
        <Text style={styles.exName}>{exName(exercise.name)}</Text>
        <Text style={styles.exMeta}>{exercise.muscleGroup} · {exercise.totalSets} {t('stats.sets')} · {t('stats.best')} {exercise.bestWeight}kg</Text>
      </View>
      <View style={styles.exRight}>
        <Text style={styles.ex1RM}>{exercise.best1RM}kg</Text>
        <Text style={styles.ex1RMLabel}>{t('stats.est1RM')}</Text>
      </View>
    </View>
  );
};

const ProgressionRow: React.FC<{ progression: ExerciseProgression }> = ({ progression }) => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const first = progression.points[0].estimated1RM;
  const last = progression.points[progression.points.length - 1].estimated1RM;
  const pct = first > 0 ? ((last - first) / first * 100) : 0;
  const isUp = pct >= 0;

  // Sparkline: normalize points to 0–1 and draw mini-bars
  const maxVal = Math.max(...progression.points.map(p => p.estimated1RM));
  const minVal = Math.min(...progression.points.map(p => p.estimated1RM));
  const range = maxVal - minVal || 1;

  return (
    <View style={styles.progRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.progName}>{exName(progression.name)}</Text>
        <Text style={styles.progSub}>
          {first}kg → {last}kg {t('stats.est1RM')} · {t('stats.sessionCount', { count: progression.points.length })}
        </Text>
        {/* Sparkline */}
        <View style={styles.sparkline}>
          {progression.points.slice(-12).map((p, i) => {
            const h = Math.max(((p.estimated1RM - minVal) / range) * 22, 2);
            return (
              <View
                key={i}
                style={[styles.sparkBar, {
                  height: h,
                  backgroundColor: isUp ? '#22c55e' : '#ef4444',
                  opacity: 0.5 + (i / progression.points.length) * 0.5,
                }]}
              />
            );
          })}
        </View>
      </View>
      <Text style={[styles.progChange, { color: isUp ? '#22c55e' : '#ef4444' }]}>
        {isUp ? '+' : ''}{pct.toFixed(1)}%
      </Text>
    </View>
  );
};

const EnergyDots: React.FC<{ value: number }> = ({ value }) => (
  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <View
        key={n}
        style={[
          styles.energyDot,
          { backgroundColor: n <= Math.round(value) ? palette.brand[500] : palette.gray[700] },
        ]}
      />
    ))}
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

export const StatsScreen: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'performance' | 'body' | 'wellbeing'>('performance');

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      sessionService.getStats()
        .then(setStats)
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader left={<UserAvatar user={user} size={36} />} title={t('stats.title')} />
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={palette.brand[500]} />
          <Text style={styles.loadingText}>{t('stats.crunchingData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || stats.overview.totalSessions === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader left={<UserAvatar user={user} size={36} />} title={t('stats.title')} />
        <View style={styles.centerFill}>
          <Text style={{ fontSize: 48 }}>📊</Text>
          <Text style={styles.emptyTitle}>{t('stats.noDataYet')}</Text>
          <Text style={styles.emptyText}>{t('stats.noDataSub')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { overview, mainLifts, weeklyVolume, muscleGroups, topExercises, exerciseProgression, wellbeing, bodyweight } = stats;

  const totalSets = topExercises.reduce((s, e) => s + e.totalSets, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        left={<UserAvatar user={user} size={36} />}
        title={t('stats.title')}
        subtitle={overview.firstSessionDate ? t('stats.trainingSince', { date: fmtDate(overview.firstSessionDate) }) : undefined}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero Stats Grid ─────────────────────────────────────────────── */}
        <View style={styles.heroGrid}>
          <HeroStat label={t('stats.sessions')} value={overview.totalSessions} />
          <HeroStat label={t('stats.allTimeVolume')} value={fmtVol(overview.totalVolumeKg)} accent />
          <HeroStat label={t('stats.weekStreak')} value={`${overview.currentWeekStreak}w`} sub={overview.currentWeekStreak > 0 ? 'on fire' : undefined} />
          <HeroStat label={t('stats.prsThisMonth')} value={overview.prsThisMonth} />
        </View>

        {/* ── Quick Activity Row ──────────────────────────────────────────── */}
        <View style={styles.activityRow}>
          <View style={styles.activityChip}>
            <Text style={styles.activityVal}>{overview.sessionsLast7Days}</Text>
            <Text style={styles.activityLabel}>{t('stats.thisWeek')}</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityChip}>
            <Text style={styles.activityVal}>{overview.sessionsLast30Days}</Text>
            <Text style={styles.activityLabel}>{t('stats.last30Days')}</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityChip}>
            <Text style={styles.activityVal}>{overview.avgSessionDurationMinutes ?? '—'}{overview.avgSessionDurationMinutes ? 'min' : ''}</Text>
            <Text style={styles.activityLabel}>{t('stats.avgDuration')}</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityChip}>
            <Text style={styles.activityVal}>{overview.totalReps.toLocaleString()}</Text>
            <Text style={styles.activityLabel}>{t('stats.totalReps')}</Text>
          </View>
        </View>

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <View style={styles.tabRow}>
          {(['performance', 'body', 'wellbeing'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'performance' ? t('stats.performance') : tab === 'body' ? t('stats.bodyParts') : t('stats.wellbeing')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══════════════════════ PERFORMANCE TAB ══════════════════════════ */}
        {activeTab === 'performance' && (
          <>
            {/* Main Lifts */}
            <SectionCard title={t('stats.strengthStandards')} accentColor={palette.brand[500]}>
              <View style={styles.liftGrid}>
                {Object.entries(mainLifts).map(([key, data]) => (
                  <MainLiftCard key={key} liftKey={key} data={data} />
                ))}
              </View>
              <Text style={styles.liftFootnote}>{t('stats.epleyFormula')}</Text>
            </SectionCard>

            {/* Weekly Volume Chart */}
            <SectionCard title={t('stats.weeklyVolume')}>
              <WeeklyBarChart data={weeklyVolume} />
              <View style={styles.weekSummaryRow}>
                <View style={styles.weekSummaryItem}>
                  <Text style={styles.weekSummaryVal}>
                    {fmtVol(weeklyVolume.reduce((s, w) => s + w.volumeKg, 0))}
                  </Text>
                  <Text style={styles.weekSummaryLabel}>{t('stats.weekTotal')}</Text>
                </View>
                <View style={styles.weekSummaryItem}>
                  <Text style={styles.weekSummaryVal}>
                    {weeklyVolume.reduce((s, w) => s + w.sessions, 0)}
                  </Text>
                  <Text style={styles.weekSummaryLabel}>{t('history.sessions').toLowerCase()}</Text>
                </View>
                <View style={styles.weekSummaryItem}>
                  <Text style={styles.weekSummaryVal}>
                    {fmtVol(weeklyVolume[weeklyVolume.length - 1]?.volumeKg ?? 0)}
                  </Text>
                  <Text style={styles.weekSummaryLabel}>{t('stats.thisWeek').toLowerCase()}</Text>
                </View>
              </View>
            </SectionCard>

            {/* Progression */}
            {exerciseProgression.length > 0 && (
              <SectionCard title={t('stats.strengthProgression')}>
                {exerciseProgression.map(prog => (
                  <ProgressionRow key={prog.name} progression={prog} />
                ))}
              </SectionCard>
            )}

            {/* Top Exercises */}
            <SectionCard title={t('stats.topExercises')}>
              {topExercises.map((ex, i) => (
                <ExerciseRow key={ex.name} exercise={ex} rank={i + 1} />
              ))}
            </SectionCard>
          </>
        )}

        {/* ══════════════════════ BODY PARTS TAB ═══════════════════════════ */}
        {activeTab === 'body' && (
          <>
            <SectionCard title={t('stats.muscleDistribution')} accentColor="#3b82f6">
              {muscleGroups.map(group => (
                <MuscleGroupBar key={group.name} {...group} />
              ))}
            </SectionCard>

            {/* Sets distribution */}
            <SectionCard title={t('stats.setsPerMuscle')}>
              {muscleGroups.map(group => {
                const color = MUSCLE_COLORS[group.name] ?? palette.brand[500];
                const pct = totalSets > 0 ? Math.round((group.sets / totalSets) * 100) : 0;
                return (
                  <View key={group.name} style={styles.muscleRow}>
                    <View style={styles.muscleHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.muscleColorDot, { backgroundColor: color }]} />
                        <Text style={styles.muscleName}>{group.name}</Text>
                      </View>
                      <Text style={styles.muscleDetail}>{group.sets} sets ({pct}%)</Text>
                    </View>
                    <View style={styles.muscleBarBg}>
                      <View style={[styles.muscleBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
            </SectionCard>

            {/* Bodyweight trend */}
            {bodyweight.length > 1 && (
              <SectionCard title={t('stats.bodyweidghtTrend')}>
                <View style={styles.bwRow}>
                  <View style={styles.bwStat}>
                    <Text style={styles.bwVal}>{bodyweight[0].weight}kg</Text>
                    <Text style={styles.bwLabel}>{t('stats.firstLogged')}</Text>
                    <Text style={styles.bwDate}>{fmtDate(bodyweight[0].date)}</Text>
                  </View>
                  <Text style={[
                    styles.bwArrow,
                    { color: bodyweight[bodyweight.length - 1].weight <= bodyweight[0].weight ? '#22c55e' : '#f59e0b' },
                  ]}>→</Text>
                  <View style={styles.bwStat}>
                    <Text style={styles.bwVal}>{bodyweight[bodyweight.length - 1].weight}kg</Text>
                    <Text style={styles.bwLabel}>{t('stats.latest')}</Text>
                    <Text style={styles.bwDate}>{fmtDate(bodyweight[bodyweight.length - 1].date)}</Text>
                  </View>
                </View>
                <View style={styles.bwMiniChart}>
                  {bodyweight.slice(-20).map((bw, i) => {
                    const minW = Math.min(...bodyweight.map(b => b.weight));
                    const maxW = Math.max(...bodyweight.map(b => b.weight));
                    const range = maxW - minW || 1;
                    const h = Math.max(((bw.weight - minW) / range) * 50, 4);
                    return (
                      <View
                        key={i}
                        style={[styles.bwBar, { height: h }]}
                      />
                    );
                  })}
                </View>
              </SectionCard>
            )}
          </>
        )}

        {/* ══════════════════════ WELLBEING TAB ════════════════════════════ */}
        {activeTab === 'wellbeing' && (
          <>
            <SectionCard title={t('stats.readinessRecovery')} accentColor="#22c55e">
              <View style={styles.wellRow}>
                <View style={styles.wellItem}>
                  <Text style={styles.wellVal}>
                    {wellbeing.avgEnergyLevel != null ? wellbeing.avgEnergyLevel : '—'}
                    {wellbeing.avgEnergyLevel != null && <Text style={styles.wellUnit}>/5</Text>}
                  </Text>
                  <Text style={styles.wellLabel}>{t('stats.avgEnergy')}</Text>
                  {wellbeing.avgEnergyLevel != null && <EnergyDots value={wellbeing.avgEnergyLevel} />}
                </View>
                <View style={styles.wellDivider} />
                <View style={styles.wellItem}>
                  <Text style={styles.wellVal}>
                    {wellbeing.avgSleepHours != null ? wellbeing.avgSleepHours : '—'}
                    {wellbeing.avgSleepHours != null && <Text style={styles.wellUnit}>hr</Text>}
                  </Text>
                  <Text style={styles.wellLabel}>{t('stats.avgSleep')}</Text>
                  {wellbeing.avgSleepHours != null && (
                    <Text style={{ fontSize: 11, color: wellbeing.avgSleepHours >= 7 ? '#22c55e' : '#f59e0b', marginTop: 4 }}>
                      {wellbeing.avgSleepHours >= 8 ? t('stats.optimal') : wellbeing.avgSleepHours >= 7 ? t('stats.good') : wellbeing.avgSleepHours >= 6 ? t('stats.fair') : t('stats.low')}
                    </Text>
                  )}
                </View>
              </View>
            </SectionCard>

            {/* Mood distribution */}
            {Object.keys(wellbeing.moodDistribution).length > 0 && (
              <SectionCard title={t('stats.moodDistribution')}>
                {(['elite', 'great', 'good', 'neutral', 'tired'] as const)
                  .filter(m => wellbeing.moodDistribution[m])
                  .map(mood => {
                    const count = wellbeing.moodDistribution[mood] ?? 0;
                    const pct = overview.totalSessions > 0 ? Math.round((count / overview.totalSessions) * 100) : 0;
                    return (
                      <View key={mood} style={styles.moodRow}>
                        <View style={styles.moodEmoji}>{MOOD_ICON[mood]}</View>
                        <Text style={styles.moodLabel}>{mood.charAt(0).toUpperCase() + mood.slice(1)}</Text>
                        <View style={styles.moodBarBg}>
                          <View style={[styles.moodBarFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.moodPct}>{pct}%</Text>
                      </View>
                    );
                  })}
              </SectionCard>
            )}

            {/* Training consistency */}
            <SectionCard title={t('stats.trainingConsistency')}>
              <View style={styles.consistencyGrid}>
                <View style={styles.consistencyItem}>
                  <Text style={styles.consistencyVal}>{wellbeing.sessionsLast7Days}</Text>
                  <Text style={styles.consistencyLabel}>{t('stats.sessionsThisWeek')}</Text>
                </View>
                <View style={styles.consistencyItem}>
                  <Text style={styles.consistencyVal}>{wellbeing.sessionsLast30Days}</Text>
                  <Text style={styles.consistencyLabel}>{t('stats.sessionsLast30d')}</Text>
                </View>
                <View style={styles.consistencyItem}>
                  <Text style={styles.consistencyVal}>{overview.currentWeekStreak}w</Text>
                  <Text style={styles.consistencyLabel}>{t('stats.currentStreak')}</Text>
                </View>
                <View style={styles.consistencyItem}>
                  <Text style={styles.consistencyVal}>
                    {overview.avgSessionDurationMinutes ? `${overview.avgSessionDurationMinutes}m` : '—'}
                  </Text>
                  <Text style={styles.consistencyLabel}>{t('stats.avgSession')}</Text>
                </View>
              </View>
            </SectionCard>

            {/* All-time totals */}
            <SectionCard title={t('stats.allTimeTotals')}>
              <View style={styles.totalsGrid}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalVal}>{fmtVol(overview.totalVolumeKg)}</Text>
                  <Text style={styles.totalLabel}>{t('stats.weightMoved')}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalVal}>{overview.totalReps.toLocaleString()}</Text>
                  <Text style={styles.totalLabel}>{t('stats.totalReps')}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalVal}>{overview.totalSessions}</Text>
                  <Text style={styles.totalLabel}>{t('stats.sessions')}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalVal}>{overview.prsThisMonth}</Text>
                  <Text style={styles.totalLabel}>{t('stats.prsThisMonth')}</Text>
                </View>
              </View>
            </SectionCard>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: palette.gray[400], fontSize: 14, marginTop: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: palette.gray[400], textAlign: 'center', paddingHorizontal: 32, marginTop: 6 },


  // Hero grid
  heroGrid: {
    flexDirection: 'row',
    backgroundColor: palette.gray[800],
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    gap: 0,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  heroSub: { fontSize: 14, marginTop: -2 },
  heroLabel: { fontSize: 10, color: palette.gray[400], fontWeight: '600', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },

  // Activity row
  activityRow: {
    flexDirection: 'row',
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  activityChip: { flex: 1, alignItems: 'center' },
  activityVal: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  activityLabel: { fontSize: 10, color: palette.gray[400], marginTop: 2, textAlign: 'center' },
  activityDivider: { width: 1, backgroundColor: palette.gray[700] },

  // Tab switcher
  tabRow: { flexDirection: 'row', backgroundColor: palette.gray[800], borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: palette.brand[600] },
  tabText: { fontSize: 12, fontWeight: '600', color: palette.gray[400] },
  tabTextActive: { color: '#fff' },

  // Section card
  card: {
    backgroundColor: palette.gray[800],
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 16 },

  // Bar chart
  barChartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 3, marginBottom: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar: { width: '80%', borderRadius: 4, minHeight: 2 },
  barDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.brand[400] },
  barVolLabel: { fontSize: 7, color: palette.gray[500], textAlign: 'center' },
  barLabelsRow: { flexDirection: 'row', marginTop: 2 },
  barDateLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: palette.gray[500], fontWeight: '600' },
  barMonthRow: { flexDirection: 'row', marginTop: 1 },
  barMonthLabel: { flex: 1, textAlign: 'center', fontSize: 9, color: palette.gray[600] },

  weekSummaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.gray[700] },
  weekSummaryItem: { alignItems: 'center' },
  weekSummaryVal: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  weekSummaryLabel: { fontSize: 10, color: palette.gray[400], marginTop: 2 },

  // Muscle groups
  muscleRow: { marginBottom: 12 },
  muscleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  muscleColorDot: { width: 10, height: 10, borderRadius: 5 },
  muscleName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  muscleDetail: { fontSize: 11, color: palette.gray[400] },
  muscleBarBg: { height: 8, backgroundColor: palette.gray[700], borderRadius: 4 },
  muscleBarFill: { height: 8, borderRadius: 4 },

  // Main lifts
  liftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  liftCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: palette.gray[700],
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  liftIcon: { fontSize: 22, marginBottom: 4 },
  liftName: { fontSize: 11, fontWeight: '600', color: palette.gray[400], letterSpacing: 0.5, textAlign: 'center' },
  liftEst1RM: { fontSize: 28, fontWeight: '800', color: palette.brand[400], marginTop: 4 },
  liftUnit: { fontSize: 14, fontWeight: '600' },
  liftSub: { fontSize: 10, color: palette.gray[500] },
  liftDetail: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  liftNoData: { fontSize: 28, color: palette.gray[600], marginTop: 4 },
  liftFootnote: { fontSize: 10, color: palette.gray[600], marginTop: 12, textAlign: 'center', fontStyle: 'italic' },

  // Exercises
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
    gap: 10,
  },
  exRank: { fontSize: 12, fontWeight: '700', color: palette.gray[500], width: 24 },
  exInfo: { flex: 1 },
  exName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  exMeta: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  exRight: { alignItems: 'flex-end' },
  ex1RM: { fontSize: 16, fontWeight: '800', color: palette.brand[400] },
  ex1RMLabel: { fontSize: 9, color: palette.gray[500] },

  // Progression
  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
    gap: 12,
  },
  progName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  progSub: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  progChange: { fontSize: 16, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 6, height: 24 },
  sparkBar: { width: 5, borderRadius: 2 },

  // Wellbeing
  wellRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wellItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  wellDivider: { width: 1, backgroundColor: palette.gray[700], marginHorizontal: 8, alignSelf: 'stretch' },
  wellVal: { fontSize: 36, fontWeight: '800', color: theme.colors.text },
  wellUnit: { fontSize: 16, fontWeight: '600', color: palette.gray[400] },
  wellLabel: { fontSize: 12, color: palette.gray[400], marginTop: 4 },
  energyDot: { width: 28, height: 8, borderRadius: 4 },

  // Mood
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  moodEmoji: { fontSize: 20, width: 28 },
  moodLabel: { fontSize: 13, color: theme.colors.text, fontWeight: '600', width: 60 },
  moodBarBg: { flex: 1, height: 8, backgroundColor: palette.gray[700], borderRadius: 4 },
  moodBarFill: { height: 8, backgroundColor: palette.brand[500], borderRadius: 4 },
  moodPct: { fontSize: 12, color: palette.gray[400], width: 32, textAlign: 'right' },

  // Consistency grid
  consistencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  consistencyItem: {
    flex: 1, minWidth: '45%',
    backgroundColor: palette.gray[700],
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  consistencyVal: { fontSize: 26, fontWeight: '800', color: theme.colors.text },
  consistencyLabel: { fontSize: 11, color: palette.gray[400], marginTop: 4, textAlign: 'center' },

  // Totals
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  totalItem: {
    flex: 1, minWidth: '45%',
    backgroundColor: palette.gray[700],
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  totalVal: { fontSize: 24, fontWeight: '800', color: palette.brand[400] },
  totalLabel: { fontSize: 11, color: palette.gray[400], marginTop: 4, textAlign: 'center' },

  // Bodyweight
  bwRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 14 },
  bwStat: { alignItems: 'center' },
  bwVal: { fontSize: 26, fontWeight: '800', color: theme.colors.text },
  bwLabel: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  bwDate: { fontSize: 10, color: palette.gray[600] },
  bwArrow: { fontSize: 24, fontWeight: '700' },
  bwMiniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 56, backgroundColor: palette.gray[700], borderRadius: 10, padding: 6 },
  bwBar: { flex: 1, backgroundColor: palette.brand[500], borderRadius: 2, opacity: 0.8 },
});
