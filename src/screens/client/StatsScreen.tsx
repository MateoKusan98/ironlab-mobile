import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  sessionService, AthleteStats, MuscleGroup, TopExercise, ExerciseProgression,
  MainLiftData, MuscleLandmark, PRTimelineEntry, RepMaxRecord, StrengthLift,
  BodyCompositionPoint,
} from '../../services/session.service';
import { useTranslation } from 'react-i18next';
import { useExerciseName } from '../../hooks/useExerciseName';
import { theme, palette, alpha } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { UserAvatar } from '../../components/ui/UserAvatar';
import {
  Moon, Minus, ThumbsUp, Fire, Lightning, Barbell,
  Trophy, Medal, Timer, Heart, Pulse, Scales, Gauge, ChartLineUp,
} from 'phosphor-react-native';

import { Card } from '../../components/ui';
// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtVol = (kg: number): string => {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}kt`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
};

const fmtNum = (n: number): string => n.toLocaleString();

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const fmtDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const MOOD_ICON: Record<string, React.ReactElement> = {
  tired:   <Moon size={18} weight="fill" color={theme.mood.tired} />,
  neutral: <Minus size={18} weight="bold" color={theme.mood.neutral} />,
  good:    <ThumbsUp size={18} weight="fill" color={theme.mood.good} />,
  great:   <Fire size={18} weight="fill" color={theme.mood.great} />,
  elite:   <Lightning size={18} weight="fill" color={theme.mood.elite} />,
};

// Muscle-group and tier colours are shared design data — a second stats view
// must not invent its own scale. See theme.chart / theme.rank.
const MUSCLE_COLORS = theme.chart.muscleGroup;

const LIFT_ICON: Record<string, React.ReactElement> = {
  squat:      <Barbell size={18} weight="bold" color={palette.brand[400]} />,
  benchPress: <Barbell size={18} weight="fill" color={palette.info[300]} />,
  deadlift:   <Lightning size={18} weight="fill" color={palette.yellow[500]} />,
};

const LIFT_META: Record<string, { label: string }> = {
  squat: { label: 'Squat' },
  benchPress: { label: 'Bench Press' },
  deadlift: { label: 'Deadlift' },
};

const LANDMARK_STATUS: Record<MuscleLandmark['status'], { color: string; label: string }> = {
  under:        { color: theme.volumeStatus.under, label: 'Below MEV' },
  optimal:      { color: theme.volumeStatus.optimal, label: 'Optimal' },
  high:         { color: theme.volumeStatus.high, label: 'High' },
  overreaching: { color: theme.volumeStatus.overreaching, label: 'Overreaching' },
};

const LEVEL_COLOR = theme.rank;

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode; accentColor?: string; subtitle?: string }> = ({
  title, children, accentColor, subtitle,
}) => (
  <Card background={palette.gray[800]} bordered={false} radius={20} style={[styles.cardSpacing, accentColor && { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    {children}
  </Card>
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
              {week.sessions > 0 && <View style={styles.barDot} />}
            </View>
          );
        })}
      </View>
      <View style={styles.barLabelsRow}>
        {data.map((week, i) => (
          <Text key={i} style={styles.barDateLabel}>{week.label.split(' ')[1]}</Text>
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
  if (!meta) return null;
  return (
    <View style={styles.liftCard}>
      <View style={styles.liftIcon}>{LIFT_ICON[liftKey]}</View>
      <Text style={styles.liftName}>{exName(meta.label)}</Text>
      {data ? (
        <>
          <Text style={styles.liftEst1RM}>{data.coach1RM ?? data.est1RM}<Text style={styles.liftUnit}>kg</Text></Text>
          <Text style={styles.liftSub}>{data.coach1RM != null ? t('stats.coachEst') : t('stats.epleyEst')}</Text>
          {data.coach1RM != null && (
            <Text style={styles.liftAltEst}>{t('stats.epleyEst')} · {data.est1RM}kg</Text>
          )}
          {data.weight != null && data.reps != null && (
            <Text style={styles.liftDetail}>{data.weight}kg × {data.reps}</Text>
          )}
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
        <View style={styles.sparkline}>
          {progression.points.slice(-12).map((p, i) => {
            const h = Math.max(((p.estimated1RM - minVal) / range) * 22, 2);
            return (
              <View key={i} style={[styles.sparkBar, {
                height: h,
                backgroundColor: isUp ? palette.success[500] : palette.error[500],
                opacity: 0.5 + (i / progression.points.length) * 0.5,
              }]} />
            );
          })}
        </View>
      </View>
      <Text style={[styles.progChange, { color: isUp ? palette.success[500] : palette.error[500] }]}>
        {isUp ? '+' : ''}{pct.toFixed(1)}%
      </Text>
    </View>
  );
};

const EnergyDots: React.FC<{ value: number }> = ({ value }) => (
  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <View key={n} style={[styles.energyDot, { backgroundColor: n <= Math.round(value) ? palette.brand[500] : palette.gray[700] }]} />
    ))}
  </View>
);

// ── Strength Standards ─────────────────────────────────────────────────────────

const StrengthLiftRow: React.FC<{ liftKey: string; lift: StrengthLift }> = ({ liftKey, lift }) => {
  const { exName } = useExerciseName();
  const meta = LIFT_META[liftKey];
  const color = LEVEL_COLOR[lift.level] ?? palette.brand[500];
  return (
    <View style={styles.ssRow}>
      <View style={styles.ssHeader}>
        <Text style={styles.ssLiftName}>{exName(meta?.label ?? liftKey)}</Text>
        <View style={[styles.ssBadge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.ssBadgeText, { color }]}>{lift.level}</Text>
        </View>
      </View>
      <View style={styles.ssMetaRow}>
        <Text style={styles.ssMeta}>{lift.e1RM}kg · {lift.ratio}× BW</Text>
        {lift.nextLevel && <Text style={styles.ssMetaDim}>→ {lift.nextLevel}</Text>}
      </View>
      <View style={styles.ssBarBg}>
        <View style={[styles.ssBarFill, { width: `${Math.round(lift.progressToNext * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

// ── PR Timeline ────────────────────────────────────────────────────────────────

const PRRow: React.FC<{ pr: PRTimelineEntry }> = ({ pr }) => {
  const { exName } = useExerciseName();
  const isTrue = pr.tier === 'pr';
  return (
    <View style={styles.prRow}>
      <View style={[styles.prIcon, { backgroundColor: isTrue ? alpha(palette.yellow[500], 0.133) : palette.gray[700] }]}>
        {isTrue
          ? <Trophy size={16} weight="fill" color={palette.yellow[500]} />
          : <Medal size={16} weight="regular" color={palette.gray[300]} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.prName}>{exName(pr.exerciseName)}</Text>
        <Text style={styles.prMeta}>{pr.weight}kg × {pr.reps} · {fmtDay(pr.date)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.prValue, { color: isTrue ? palette.yellow[500] : palette.gray[200] }]}>{pr.weight}kg</Text>
        <Text style={styles.prTier}>{isTrue ? 'PR' : 'Mini PR'}</Text>
      </View>
    </View>
  );
};

const RepMaxTable: React.FC<{ record: RepMaxRecord }> = ({ record }) => {
  const { exName } = useExerciseName();
  return (
    <View style={styles.rmCard}>
      <Text style={styles.rmTitle}>{exName(record.exerciseName)}</Text>
      <View style={styles.rmGrid}>
        {record.maxes.map(m => (
          <View key={m.reps} style={styles.rmCell}>
            <Text style={styles.rmReps}>{m.reps}RM</Text>
            <Text style={styles.rmWeight}>{m.weight}kg</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Consistency Heatmap ────────────────────────────────────────────────────────

const Heatmap: React.FC<{ data: AthleteStats['consistency']['heatmap'] }> = ({ data }) => {
  const byDate = new Map(data.map(d => [d.date, d]));
  const maxVol = Math.max(...data.map(d => d.volumeKg), 1);

  const today = new Date();
  const days: ({ date: string; vol: number; sessions: number } | null)[] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 363);
  const lead = start.getDay();
  for (let i = 0; i < lead; i++) days.push(null);
  for (let i = 0; i < 364; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().split('T')[0];
    const hit = byDate.get(key);
    days.push({ date: key, vol: hit?.volumeKg ?? 0, sessions: hit?.sessions ?? 0 });
  }
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const cellColor = (vol: number, sessions: number) => {
    if (sessions === 0) return palette.gray[800];
    const intensity = Math.min(vol / maxVol, 1);
    if (intensity > 0.66) return palette.brand[400];
    if (intensity > 0.33) return palette.brand[600];
    return palette.brand[700] ?? palette.brand[600];
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.heatGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.heatCol}>
            {week.map((day, di) => (
              <View
                key={di}
                style={[styles.heatCell, { backgroundColor: day ? cellColor(day.vol, day.sessions) : 'transparent' }]}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const DayOfWeekBars: React.FC<{ counts: number[] }> = ({ counts }) => {
  const max = Math.max(...counts, 1);
  return (
    <View style={styles.dowRow}>
      {counts.map((c, i) => (
        <View key={i} style={styles.dowCol}>
          <Text style={styles.dowVal}>{c}</Text>
          <View style={styles.dowBarBg}>
            <View style={[styles.dowBarFill, { height: `${Math.max((c / max) * 100, c > 0 ? 8 : 0)}%` }]} />
          </View>
          <Text style={styles.dowLabel}>{DOW_LABELS[i]}</Text>
        </View>
      ))}
    </View>
  );
};

// ── Muscle Landmarks ───────────────────────────────────────────────────────────

const LandmarkRow: React.FC<{ lm: MuscleLandmark }> = ({ lm }) => {
  const status = LANDMARK_STATUS[lm.status];
  const scaleMax = lm.mrv * 1.15;
  const pos = (v: number): DimensionValue => `${Math.min((v / scaleMax) * 100, 100)}%`;
  const zoneWidth = `${Math.min(((lm.mav - lm.mev) / scaleMax) * 100, 100)}%` as DimensionValue;
  return (
    <View style={styles.lmRow}>
      <View style={styles.muscleHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.muscleColorDot, { backgroundColor: MUSCLE_COLORS[lm.name] ?? palette.brand[500] }]} />
          <Text style={styles.muscleName}>{lm.name}</Text>
        </View>
        <Text style={[styles.lmStatus, { color: status.color }]}>{lm.weeklySets}/wk · {status.label}</Text>
      </View>
      <View style={styles.lmTrack}>
        <View style={[styles.lmZone, { left: pos(lm.mev), width: zoneWidth }]} />
        <View style={[styles.lmMarker, { left: pos(lm.weeklySets), backgroundColor: status.color }]} />
      </View>
      <View style={styles.lmScale}>
        <Text style={styles.lmScaleText}>MEV {lm.mev}</Text>
        <Text style={styles.lmScaleText}>MAV {lm.mav}</Text>
        <Text style={styles.lmScaleText}>MRV {lm.mrv}</Text>
      </View>
    </View>
  );
};

// ── Body Composition ───────────────────────────────────────────────────────────

const BodyCompMiniChart: React.FC<{ series: BodyCompositionPoint[]; pick: (p: BodyCompositionPoint) => number | null; color: string }> = ({ series, pick, color }) => {
  const vals = series.map(pick).filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  return (
    <View style={styles.bcChart}>
      {series.map((p, i) => {
        const v = pick(p);
        const h = v != null ? Math.max(((v - min) / range) * 44, 3) : 2;
        return <View key={i} style={[styles.bcBar, { height: h, backgroundColor: v != null ? color : palette.gray[700] }]} />;
      })}
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

type Tab = 'performance' | 'records' | 'body' | 'wellbeing';

export const StatsScreen: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('performance');

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

  const {
    overview, mainLifts, weeklyVolume, muscleGroups, muscleLandmarks, topExercises,
    exerciseProgression, records, consistency, intensity, density, strengthStandards,
    bodyComposition, cardio, milestones, wellbeing, bodyweight,
  } = stats;

  const totalSets = topExercises.reduce((s, e) => s + e.totalSets, 0);
  const truePRs = records.recentPRs.filter(p => p.tier === 'pr');
  const miniPRs = records.recentPRs.filter(p => p.tier === 'mini');

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
          <HeroStat label={t('stats.weekStreak')} value={`${overview.currentWeekStreak}w`} sub={overview.currentWeekStreak > 0 ? '🔥' : undefined} />
          <HeroStat label={t('stats.prsThisMonth')} value={overview.truePrsThisMonth} />
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
          {(['performance', 'records', 'body', 'wellbeing'] as const).map(tab => (
            <TouchableOpacity
              accessibilityRole="button"
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'performance' ? t('stats.performance')
                  : tab === 'records' ? t('stats.records')
                  : tab === 'body' ? t('stats.bodyParts')
                  : t('stats.wellbeing')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══════════════════════ PERFORMANCE TAB ══════════════════════════ */}
        {activeTab === 'performance' && (
          <>
            <SectionCard title={t('stats.strengthStandards')} accentColor={palette.brand[500]}>
              <View style={styles.liftGrid}>
                {Object.entries(mainLifts).map(([key, data]) => (
                  <MainLiftCard key={key} liftKey={key} data={data} />
                ))}
              </View>
              <Text style={styles.liftFootnote}>{t('stats.epleyFormula')}</Text>
            </SectionCard>

            {strengthStandards.available && (
              <SectionCard
                title={t('stats.strengthLevel')}
                accentColor={palette.yellow[500]}
                subtitle={t('stats.strengthLevelSub', { bw: strengthStandards.bodyweightKg })}
              >
                {(['squat', 'benchPress', 'deadlift'] as const).map(key => {
                  const lift = strengthStandards.lifts[key];
                  return lift ? <StrengthLiftRow key={key} liftKey={key} lift={lift} /> : null;
                })}
                <View style={styles.ssTotals}>
                  <View style={styles.ssTotalItem}>
                    <Text style={styles.ssTotalVal}>{strengthStandards.total}kg</Text>
                    <Text style={styles.ssTotalLabel}>{t('stats.big3Total')}</Text>
                  </View>
                  <View style={styles.ssTotalItem}>
                    <Text style={styles.ssTotalVal}>{strengthStandards.totalRatio ?? '—'}×</Text>
                    <Text style={styles.ssTotalLabel}>{t('stats.bodyweightRatio')}</Text>
                  </View>
                  <View style={styles.ssTotalItem}>
                    <Text style={styles.ssTotalVal}>{strengthStandards.dots ?? '—'}</Text>
                    <Text style={styles.ssTotalLabel}>{t('stats.dotsScore')}</Text>
                  </View>
                </View>
              </SectionCard>
            )}

            <SectionCard title={t('stats.weeklyVolume')}>
              <WeeklyBarChart data={weeklyVolume} />
              <View style={styles.weekSummaryRow}>
                <View style={styles.weekSummaryItem}>
                  <Text style={styles.weekSummaryVal}>{fmtVol(weeklyVolume.reduce((s, w) => s + w.volumeKg, 0))}</Text>
                  <Text style={styles.weekSummaryLabel}>{t('stats.weekTotal')}</Text>
                </View>
                <View style={styles.weekSummaryItem}>
                  <Text style={styles.weekSummaryVal}>{weeklyVolume.reduce((s, w) => s + w.sessions, 0)}</Text>
                  <Text style={styles.weekSummaryLabel}>{t('history.sessions').toLowerCase()}</Text>
                </View>
                <View style={styles.weekSummaryItem}>
                  <Text style={styles.weekSummaryVal}>{fmtVol(weeklyVolume[weeklyVolume.length - 1]?.volumeKg ?? 0)}</Text>
                  <Text style={styles.weekSummaryLabel}>{t('stats.thisWeek').toLowerCase()}</Text>
                </View>
              </View>
            </SectionCard>

            {(intensity.avgRpe != null || intensity.trend.some(x => x.avgIntensityPct != null)) && (
              <SectionCard title={t('stats.intensityTrend')}>
                <View style={styles.intHeader}>
                  <View style={styles.intStat}>
                    <Gauge size={18} weight="fill" color={palette.brand[400]} />
                    <Text style={styles.intVal}>{intensity.avgRpe ?? '—'}</Text>
                    <Text style={styles.intLabel}>{t('stats.avgRpe')}</Text>
                  </View>
                  <View style={styles.intStat}>
                    <ChartLineUp size={18} weight="bold" color={palette.success[500]} />
                    <Text style={styles.intVal}>
                      {(() => {
                        const last = [...intensity.trend].reverse().find(x => x.avgIntensityPct != null);
                        return last?.avgIntensityPct != null ? `${last.avgIntensityPct}%` : '—';
                      })()}
                    </Text>
                    <Text style={styles.intLabel}>{t('stats.recentIntensity')}</Text>
                  </View>
                </View>
                <View style={styles.intTrendRow}>
                  {intensity.trend.map((w, i) => {
                    const h = w.avgRpe != null ? (w.avgRpe / 10) * 100 : 2;
                    return (
                      <View key={i} style={styles.intCol}>
                        <View style={[styles.intBar, { height: `${Math.max(h, 2)}%`, backgroundColor: w.avgRpe != null ? palette.brand[500] : palette.gray[700] }]} />
                        <Text style={styles.intColLabel}>{w.label.split(' ')[1]}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.liftFootnote}>{t('stats.rpeFootnote')}</Text>
              </SectionCard>
            )}

            <SectionCard title={t('stats.workoutDensity')}>
              <View style={styles.densityGrid}>
                <View style={styles.densityItem}>
                  <Timer size={20} weight="regular" color={palette.brand[400]} />
                  <Text style={styles.densityVal}>{density.avgRestSeconds != null ? `${density.avgRestSeconds}s` : '—'}</Text>
                  <Text style={styles.densityLabel}>{t('stats.avgRest')}</Text>
                </View>
                <View style={styles.densityItem}>
                  <Gauge size={20} weight="regular" color={palette.success[500]} />
                  <Text style={styles.densityVal}>{density.avgDensityKgPerMin != null ? `${density.avgDensityKgPerMin}` : '—'}</Text>
                  <Text style={styles.densityLabel}>{t('stats.kgPerMin')}</Text>
                </View>
                <View style={styles.densityItem}>
                  <Barbell size={20} weight="regular" color={palette.violet[400]} />
                  <Text style={styles.densityVal}>{density.avgSetsPerSession}</Text>
                  <Text style={styles.densityLabel}>{t('stats.setsPerSession')}</Text>
                </View>
              </View>
            </SectionCard>

            {exerciseProgression.length > 0 && (
              <SectionCard title={t('stats.strengthProgression')}>
                {exerciseProgression.map(prog => (
                  <ProgressionRow key={prog.name} progression={prog} />
                ))}
              </SectionCard>
            )}

            <SectionCard title={t('stats.topExercises')}>
              {topExercises.map((ex, i) => (
                <ExerciseRow key={ex.name} exercise={ex} rank={i + 1} />
              ))}
            </SectionCard>
          </>
        )}

        {/* ══════════════════════ RECORDS TAB ══════════════════════════════ */}
        {activeTab === 'records' && (
          <>
            <View style={styles.heroGrid}>
              <HeroStat label={t('stats.totalPRs')} value={records.truePrCount} accent />
              <HeroStat label={t('stats.miniPRs')} value={records.miniPrCount} />
              <HeroStat label={t('stats.prsThisMonth')} value={overview.truePrsThisMonth} />
              <HeroStat label={t('stats.miniThisMonth')} value={overview.miniPrsThisMonth} />
            </View>

            {truePRs.length > 0 && (
              <SectionCard title={t('stats.recentPRs')} accentColor={palette.yellow[500]}>
                {truePRs.map((pr, i) => <PRRow key={`pr-${i}`} pr={pr} />)}
              </SectionCard>
            )}

            {miniPRs.length > 0 && (
              <SectionCard title={t('stats.recentMiniPRs')}>
                {miniPRs.map((pr, i) => <PRRow key={`mini-${i}`} pr={pr} />)}
              </SectionCard>
            )}

            {records.repMaxRecords.length > 0 && (
              <SectionCard title={t('stats.repMaxes')} subtitle={t('stats.repMaxesSub')}>
                {records.repMaxRecords.map(r => <RepMaxTable key={r.exerciseName} record={r} />)}
              </SectionCard>
            )}

            <SectionCard title={t('stats.milestones')}>
              {([
                { key: 'volume', icon: <Barbell size={18} weight="fill" color={palette.brand[400]} />, label: t('stats.weightMoved'), value: fmtVol(milestones.volume.value), next: milestones.volume.next ? fmtVol(milestones.volume.next) : null },
                { key: 'sessions', icon: <Fire size={18} weight="fill" color={palette.error[500]} />, label: t('stats.sessions'), value: fmtNum(milestones.sessions.value), next: milestones.sessions.next ? fmtNum(milestones.sessions.next) : null },
                { key: 'reps', icon: <Lightning size={18} weight="fill" color={palette.yellow[500]} />, label: t('stats.totalReps'), value: fmtNum(milestones.reps.value), next: milestones.reps.next ? fmtNum(milestones.reps.next) : null },
                { key: 'prs', icon: <Trophy size={18} weight="fill" color={palette.yellow[500]} />, label: t('stats.totalPRs'), value: fmtNum(milestones.prs.value), next: milestones.prs.next ? fmtNum(milestones.prs.next) : null },
              ]).map(m => (
                <View key={m.key} style={styles.mileRow}>
                  <View style={styles.mileIcon}>{m.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mileLabel}>{m.label}</Text>
                    {m.next && <Text style={styles.mileNext}>{t('stats.nextMilestone', { target: m.next })}</Text>}
                  </View>
                  <Text style={styles.mileVal}>{m.value}</Text>
                </View>
              ))}
            </SectionCard>
          </>
        )}

        {/* ══════════════════════ BODY PARTS TAB ═══════════════════════════ */}
        {activeTab === 'body' && (
          <>
            {muscleLandmarks.length > 0 && (
              <SectionCard title={t('stats.weeklySetsLandmarks')} accentColor={palette.success[500]} subtitle={t('stats.landmarksSub')}>
                {muscleLandmarks.map(lm => <LandmarkRow key={lm.name} lm={lm} />)}
              </SectionCard>
            )}

            <SectionCard title={t('stats.muscleDistribution')} accentColor={palette.info[500]}>
              {muscleGroups.map(group => <MuscleGroupBar key={group.name} {...group} />)}
            </SectionCard>

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

            {bodyComposition.series.length >= 2 && (
              <SectionCard title={t('stats.bodyComposition')} accentColor={palette.cyan[500]}>
                {bodyComposition.latest?.bodyFatPercentage != null && (
                  <View style={styles.bcBlock}>
                    <View style={styles.bcHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Scales size={16} weight="regular" color={palette.cyan[500]} />
                        <Text style={styles.bcLabel}>{t('stats.bodyFat')}</Text>
                      </View>
                      <Text style={styles.bcVal}>{bodyComposition.latest.bodyFatPercentage}%</Text>
                    </View>
                    <BodyCompMiniChart series={bodyComposition.series} pick={p => p.bodyFatPercentage} color={palette.cyan[500]} />
                  </View>
                )}
                {bodyComposition.latest?.muscleMassKg != null && (
                  <View style={styles.bcBlock}>
                    <View style={styles.bcHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Barbell size={16} weight="regular" color={palette.success[500]} />
                        <Text style={styles.bcLabel}>{t('stats.muscleMass')}</Text>
                      </View>
                      <Text style={styles.bcVal}>{bodyComposition.latest.muscleMassKg}kg</Text>
                    </View>
                    <BodyCompMiniChart series={bodyComposition.series} pick={p => p.muscleMassKg} color={palette.success[500]} />
                  </View>
                )}
              </SectionCard>
            )}

            {bodyweight.length > 1 && (
              <SectionCard title={t('stats.bodyweidghtTrend')}>
                <View style={styles.bwRow}>
                  <View style={styles.bwStat}>
                    <Text style={styles.bwVal}>{bodyweight[0].weight}kg</Text>
                    <Text style={styles.bwLabel}>{t('stats.firstLogged')}</Text>
                    <Text style={styles.bwDate}>{fmtDate(bodyweight[0].date)}</Text>
                  </View>
                  <Text style={[styles.bwArrow, { color: bodyweight[bodyweight.length - 1].weight <= bodyweight[0].weight ? palette.success[500] : palette.warning[500] }]}>→</Text>
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
                    return <View key={i} style={[styles.bwBar, { height: h }]} />;
                  })}
                </View>
              </SectionCard>
            )}
          </>
        )}

        {/* ══════════════════════ WELLBEING TAB ════════════════════════════ */}
        {activeTab === 'wellbeing' && (
          <>
            <SectionCard title={t('stats.consistency')} accentColor={palette.success[500]} subtitle={t('stats.lastYear')}>
              <Heatmap data={consistency.heatmap} />
              <View style={styles.consSummary}>
                <View style={styles.consItem}>
                  <Text style={styles.consVal}>{consistency.totalTrainingDays}</Text>
                  <Text style={styles.consLabel}>{t('stats.trainingDays')}</Text>
                </View>
                <View style={styles.consItem}>
                  <Text style={styles.consVal}>{consistency.longestWeekStreak}w</Text>
                  <Text style={styles.consLabel}>{t('stats.longestStreak')}</Text>
                </View>
                <View style={styles.consItem}>
                  <Text style={styles.consVal}>{consistency.avgSessionsPerWeek}</Text>
                  <Text style={styles.consLabel}>{t('stats.perWeekAvg')}</Text>
                </View>
              </View>
            </SectionCard>

            <SectionCard title={t('stats.trainingDaysOfWeek')}>
              <DayOfWeekBars counts={consistency.dayOfWeekCounts} />
            </SectionCard>

            <SectionCard title={t('stats.readinessRecovery')} accentColor={palette.success[500]}>
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
                    <Text style={{ fontSize: 11, color: wellbeing.avgSleepHours >= 7 ? palette.success[500] : palette.warning[500], marginTop: 4 }}>
                      {wellbeing.avgSleepHours >= 8 ? t('stats.optimal') : wellbeing.avgSleepHours >= 7 ? t('stats.good') : wellbeing.avgSleepHours >= 6 ? t('stats.fair') : t('stats.low')}
                    </Text>
                  )}
                </View>
              </View>
            </SectionCard>

            {cardio.totalSessions > 0 && (
              <SectionCard title={t('stats.cardio')} accentColor={palette.error[500]}>
                <View style={styles.cardioGrid}>
                  <View style={styles.cardioItem}>
                    <Heart size={18} weight="fill" color={palette.error[500]} />
                    <Text style={styles.cardioVal}>{cardio.totalSessions}</Text>
                    <Text style={styles.cardioLabel}>{t('stats.sessions')}</Text>
                  </View>
                  <View style={styles.cardioItem}>
                    <Timer size={18} weight="regular" color={palette.brand[400]} />
                    <Text style={styles.cardioVal}>{cardio.totalMinutes}m</Text>
                    <Text style={styles.cardioLabel}>{t('stats.duration')}</Text>
                  </View>
                  <View style={styles.cardioItem}>
                    <Pulse size={18} weight="regular" color={palette.warning[500]} />
                    <Text style={styles.cardioVal}>{cardio.totalDistanceKm}km</Text>
                    <Text style={styles.cardioLabel}>{t('stats.distance')}</Text>
                  </View>
                  <View style={styles.cardioItem}>
                    <Fire size={18} weight="fill" color={palette.brand[500]} />
                    <Text style={styles.cardioVal}>{fmtNum(cardio.totalCalories)}</Text>
                    <Text style={styles.cardioLabel}>{t('stats.calories')}</Text>
                  </View>
                </View>
              </SectionCard>
            )}

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
                  <Text style={styles.totalVal}>{overview.totalSets.toLocaleString()}</Text>
                  <Text style={styles.totalLabel}>{t('stats.totalSets')}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalVal}>{overview.totalSessions}</Text>
                  <Text style={styles.totalLabel}>{t('stats.sessions')}</Text>
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

  heroGrid: { flexDirection: 'row', backgroundColor: palette.gray[800], borderRadius: 20, padding: 20, marginBottom: 12 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  heroSub: { fontSize: 14, marginTop: -2 },
  heroLabel: { fontSize: 10, color: palette.gray[400], fontWeight: '600', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },

  activityRow: { flexDirection: 'row', backgroundColor: palette.gray[800], borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, marginBottom: 16 },
  activityChip: { flex: 1, alignItems: 'center' },
  activityVal: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  activityLabel: { fontSize: 10, color: palette.gray[400], marginTop: 2, textAlign: 'center' },
  activityDivider: { width: 1, backgroundColor: palette.gray[700] },

  tabRow: { flexDirection: 'row', backgroundColor: palette.gray[800], borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: palette.brand[600] },
  tabText: { fontSize: 11, fontWeight: '600', color: palette.gray[400] },
  tabTextActive: { color: palette.white },

  cardSpacing: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 16 },
  sectionSubtitle: { fontSize: 11, color: palette.gray[500], marginTop: -10, marginBottom: 14 },

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

  muscleRow: { marginBottom: 12 },
  muscleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  muscleColorDot: { width: 10, height: 10, borderRadius: 5 },
  muscleName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  muscleDetail: { fontSize: 11, color: palette.gray[400] },
  muscleBarBg: { height: 8, backgroundColor: palette.gray[700], borderRadius: 4 },
  muscleBarFill: { height: 8, borderRadius: 4 },

  liftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  liftCard: { flex: 1, minWidth: '45%', backgroundColor: palette.gray[700], borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 },
  liftIcon: { fontSize: 22, marginBottom: 4 },
  liftName: { fontSize: 11, fontWeight: '600', color: palette.gray[400], letterSpacing: 0.5, textAlign: 'center' },
  liftEst1RM: { fontSize: 28, fontWeight: '800', color: palette.brand[400], marginTop: 4 },
  liftUnit: { fontSize: 14, fontWeight: '600' },
  liftSub: { fontSize: 10, color: palette.gray[500] },
  liftAltEst: { fontSize: 11, color: palette.gray[400], marginTop: 4 },
  liftDetail: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  liftNoData: { fontSize: 28, color: palette.gray[600], marginTop: 4 },
  liftFootnote: { fontSize: 10, color: palette.gray[600], marginTop: 12, textAlign: 'center', fontStyle: 'italic' },

  ssRow: { marginBottom: 16 },
  ssHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ssLiftName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  ssBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  ssBadgeText: { fontSize: 11, fontWeight: '700' },
  ssMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  ssMeta: { fontSize: 12, color: palette.gray[300] },
  ssMetaDim: { fontSize: 12, color: palette.gray[500] },
  ssBarBg: { height: 8, backgroundColor: palette.gray[700], borderRadius: 4 },
  ssBarFill: { height: 8, borderRadius: 4 },
  ssTotals: { flexDirection: 'row', marginTop: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.gray[700] },
  ssTotalItem: { flex: 1, alignItems: 'center' },
  ssTotalVal: { fontSize: 18, fontWeight: '800', color: palette.yellow[500] },
  ssTotalLabel: { fontSize: 10, color: palette.gray[400], marginTop: 2, textAlign: 'center' },

  intHeader: { flexDirection: 'row', marginBottom: 14 },
  intStat: { flex: 1, alignItems: 'center', gap: 2 },
  intVal: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
  intLabel: { fontSize: 10, color: palette.gray[400] },
  intTrendRow: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3 },
  intCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  intBar: { width: '70%', borderRadius: 3, minHeight: 2 },
  intColLabel: { fontSize: 8, color: palette.gray[600], marginTop: 3 },

  densityGrid: { flexDirection: 'row', gap: 10 },
  densityItem: { flex: 1, backgroundColor: palette.gray[700], borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  densityVal: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  densityLabel: { fontSize: 10, color: palette.gray[400], textAlign: 'center' },

  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.gray[700], gap: 10 },
  exRank: { fontSize: 12, fontWeight: '700', color: palette.gray[500], width: 24 },
  exInfo: { flex: 1 },
  exName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  exMeta: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  exRight: { alignItems: 'flex-end' },
  ex1RM: { fontSize: 16, fontWeight: '800', color: palette.brand[400] },
  ex1RMLabel: { fontSize: 9, color: palette.gray[500] },

  progRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.gray[700], gap: 12 },
  progName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  progSub: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  progChange: { fontSize: 16, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 6, height: 24 },
  sparkBar: { width: 5, borderRadius: 2 },

  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.gray[700], gap: 12 },
  prIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  prName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  prMeta: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  prValue: { fontSize: 16, fontWeight: '800' },
  prTier: { fontSize: 9, color: palette.gray[500], marginTop: 1 },

  rmCard: { backgroundColor: palette.gray[700], borderRadius: 14, padding: 14, marginBottom: 10 },
  rmTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  rmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rmCell: { backgroundColor: palette.gray[800], borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 64 },
  rmReps: { fontSize: 10, color: palette.gray[400], fontWeight: '600' },
  rmWeight: { fontSize: 15, fontWeight: '800', color: palette.brand[400], marginTop: 2 },

  mileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.gray[700], gap: 12 },
  mileIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.gray[700], alignItems: 'center', justifyContent: 'center' },
  mileLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  mileNext: { fontSize: 11, color: palette.gray[500], marginTop: 2 },
  mileVal: { fontSize: 18, fontWeight: '800', color: palette.brand[400] },

  heatGrid: { flexDirection: 'row', gap: 3, paddingVertical: 4 },
  heatCol: { gap: 3 },
  heatCell: { width: 11, height: 11, borderRadius: 2 },
  consSummary: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.gray[700] },
  consItem: { flex: 1, alignItems: 'center' },
  consVal: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  consLabel: { fontSize: 10, color: palette.gray[400], marginTop: 2, textAlign: 'center' },

  dowRow: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 },
  dowCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  dowVal: { fontSize: 11, fontWeight: '700', color: palette.gray[300] },
  dowBarBg: { width: '60%', flex: 1, backgroundColor: palette.gray[700], borderRadius: 4, justifyContent: 'flex-end', marginVertical: 4 },
  dowBarFill: { width: '100%', backgroundColor: palette.brand[500], borderRadius: 4 },
  dowLabel: { fontSize: 10, color: palette.gray[500] },

  lmRow: { marginBottom: 18 },
  lmStatus: { fontSize: 11, fontWeight: '700' },
  lmTrack: { height: 10, backgroundColor: palette.gray[700], borderRadius: 5, marginTop: 4, justifyContent: 'center' },
  lmZone: { position: 'absolute', height: 10, backgroundColor: alpha(palette.success[500], 0.267), borderRadius: 5 },
  lmMarker: { position: 'absolute', width: 4, height: 16, borderRadius: 2, marginLeft: -2 },
  lmScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  lmScaleText: { fontSize: 9, color: palette.gray[600] },

  bcBlock: { marginBottom: 16 },
  bcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bcLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  bcVal: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  bcChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 48, backgroundColor: palette.gray[700], borderRadius: 10, padding: 6 },
  bcBar: { flex: 1, borderRadius: 2, opacity: 0.85 },

  cardioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardioItem: { flex: 1, minWidth: '45%', backgroundColor: palette.gray[700], borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  cardioVal: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  cardioLabel: { fontSize: 10, color: palette.gray[400], textAlign: 'center' },

  wellRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wellItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  wellDivider: { width: 1, backgroundColor: palette.gray[700], marginHorizontal: 8, alignSelf: 'stretch' },
  wellVal: { fontSize: 36, fontWeight: '800', color: theme.colors.text },
  wellUnit: { fontSize: 16, fontWeight: '600', color: palette.gray[400] },
  wellLabel: { fontSize: 12, color: palette.gray[400], marginTop: 4 },
  energyDot: { width: 28, height: 8, borderRadius: 4 },

  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  moodEmoji: { fontSize: 20, width: 28 },
  moodLabel: { fontSize: 13, color: theme.colors.text, fontWeight: '600', width: 60 },
  moodBarBg: { flex: 1, height: 8, backgroundColor: palette.gray[700], borderRadius: 4 },
  moodBarFill: { height: 8, backgroundColor: palette.brand[500], borderRadius: 4 },
  moodPct: { fontSize: 12, color: palette.gray[400], width: 32, textAlign: 'right' },

  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  totalItem: { flex: 1, minWidth: '45%', backgroundColor: palette.gray[700], borderRadius: 14, padding: 14, alignItems: 'center' },
  totalVal: { fontSize: 24, fontWeight: '800', color: palette.brand[400] },
  totalLabel: { fontSize: 11, color: palette.gray[400], marginTop: 4, textAlign: 'center' },

  bwRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 14 },
  bwStat: { alignItems: 'center' },
  bwVal: { fontSize: 26, fontWeight: '800', color: theme.colors.text },
  bwLabel: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  bwDate: { fontSize: 10, color: palette.gray[600] },
  bwArrow: { fontSize: 24, fontWeight: '700' },
  bwMiniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 56, backgroundColor: palette.gray[700], borderRadius: 10, padding: 6 },
  bwBar: { flex: 1, backgroundColor: palette.brand[500], borderRadius: 2, opacity: 0.8 },
});
