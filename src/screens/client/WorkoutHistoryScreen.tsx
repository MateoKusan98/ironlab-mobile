import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LOCALES, safeLocaleDateString } from '../../i18n';
import { useExerciseName } from '../../hooks/useExerciseName';
import { useSettingsStore } from '../../stores/settings.store';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { sessionService, WorkoutSession } from '../../services/session.service';
import { aiCoachService } from '../../services/ai-coach.service';
import { useAuthStore } from '../../stores/auth.store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Trophy, PersonSimpleRun } from 'phosphor-react-native';

const DAYS_KEYS = ['history.monday', 'history.tuesday', 'history.wednesday', 'history.thursday', 'history.friday', 'history.saturday', 'history.sunday'] as const;

// Cardio types whose i18n key differs from the stored value
const CARDIO_I18N_KEY: Record<string, string> = { jump_rope: 'jumpRope' };

function getWeekBounds(offset: number, locale: string): { start: Date; end: Date; labelKey: 'thisWeek' | 'lastWeek' | null; labelDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const labelDate = safeLocaleDateString(monday, locale, { month: 'short', day: 'numeric' }) +
    ' – ' +
    safeLocaleDateString(sunday, locale, { month: 'short', day: 'numeric', year: 'numeric' });

  const labelKey = offset === 0 ? 'thisWeek' : offset === -1 ? 'lastWeek' : null;

  return { start: monday, end: sunday, labelKey, labelDate };
}

const DAY_NAME_TO_IDX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

function getSessionsForWeek(sessions: WorkoutSession[], start: Date, end: Date): Map<number, WorkoutSession[]> {
  const map = new Map<number, WorkoutSession[]>(); // key = 0(Mon)..6(Sun)
  for (const s of sessions) {
    const d = new Date(s.completedAt ?? s.startedAt);
    if (d >= start && d <= end) {
      const dayOfWeek = d.getDay();
      const key = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0..Sun=6
      const existing = map.get(key) ?? [];
      existing.push(s);
      map.set(key, existing);
    }
  }
  return map;
}

function sessionStats(session: WorkoutSession) {
  const completed = session.sets
    .filter((s) => s.isCompleted)
    .sort((a, b) => new Date(a.loggedAt ?? 0).getTime() - new Date(b.loggedAt ?? 0).getTime());
  const exercises = [...new Set(completed.map((s) => s.exerciseName))];
  const volume = completed.reduce((sum, s) => sum + (s.weightUsed ?? 0) * (s.repsCompleted ?? 0), 0);
  const hasPR = completed.some((s) => s.isPR);
  return { exercises: exercises.length, sets: completed.length, volume, hasPR, topExerciseNames: exercises.slice(0, 3), extraCount: Math.max(0, exercises.length - 3) };
}

export const WorkoutHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const locale = LANGUAGE_LOCALES[useSettingsStore((s) => s.language)] ?? 'en-US';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [plannedDayIndices, setPlannedDayIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [data, plan] = await Promise.all([
        sessionService.getSessions(200),
        aiCoachService.getPlan().catch(() => null),
      ]);
      setSessions(data.filter((s) => s.status === 'completed'));
      if (plan?.trainingDays) {
        const indices = new Set(
          plan.trainingDays.map((d) => DAY_NAME_TO_IDX[d.toLowerCase()]).filter((i) => i !== undefined)
        );
        setPlannedDayIndices(indices);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const DAYS = DAYS_KEYS.map((k) => t(k));
  const cardioLabel = (type: string | null) =>
    type ? t(`cardio.${CARDIO_I18N_KEY[type] ?? type}`) : t('cardio.title');
  const { start, end, labelKey, labelDate } = getWeekBounds(weekOffset, locale);
  const label = labelKey ? t(`history.${labelKey}`) : labelDate;
  const weekSessions = getSessionsForWeek(sessions, start, end);

  const allWeekSessions = Array.from(weekSessions.values()).flat();
  const totalSessionCount = allWeekSessions.length;
  const totalVolThisWeek = allWeekSessions.reduce((sum, s) => {
    return sum + s.sets.filter((x) => x.isCompleted).reduce((v, x) => v + (x.weightUsed ?? 0) * (x.repsCompleted ?? 0), 0);
  }, 0);
  const totalSetsThisWeek = allWeekSessions.reduce((sum, s) => sum + s.sets.filter((x) => x.isCompleted).length, 0);
  const prDays = Array.from(weekSessions.values()).filter((arr) => arr.some((s) => s.sets.some((x) => x.isPR))).length;

  const headerLeft = <UserAvatar user={user} size={36} />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader left={headerLeft} title={t('history.title')} />
        <ActivityIndicator color={palette.brand[500]} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader left={headerLeft} title={t('history.title')} />

      {/* Week Navigator */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navArrow} onPress={() => setWeekOffset((w) => w - 1)}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.navArrow, weekOffset >= 0 && styles.navArrowDisabled]}
          onPress={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset >= 0}
        >
          <Text style={[styles.navArrowText, weekOffset >= 0 && styles.navArrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day Strip */}
      <View style={styles.dayStrip}>
        {DAYS.map((day, idx) => {
          const daySessions = weekSessions.get(idx);
          const hasSession = daySessions && daySessions.length > 0;
          const hasPR = daySessions?.some((s) => s.sets.some((x) => x.isPR));
          const count = daySessions?.length ?? 0;
          const isPlanned = plannedDayIndices.has(idx);
          return (
            <View key={day} style={styles.dayCell}>
              <Text style={styles.dayName}>{day}</Text>
              {hasSession ? (
                <View style={[styles.dayDot, hasPR && styles.dayDotPR]}>
                  {hasPR ? (
                    <Trophy size={10} weight="fill" color={palette.brand[400]} />
                  ) : count > 1 ? (
                    <Text style={styles.dayDotCount}>{count}</Text>
                  ) : null}
                </View>
              ) : isPlanned ? (
                <View style={styles.dayDotPlanned} />
              ) : (
                <View style={styles.dayDotEmpty} />
              )}
            </View>
          );
        })}
      </View>

      {/* Week Summary Row */}
      {totalSessionCount > 0 && (
        <View style={styles.weekSummary}>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{totalSessionCount}</Text>
            <Text style={styles.weekStatLabel}>{t('history.sessions')}</Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{totalSetsThisWeek}</Text>
            <Text style={styles.weekStatLabel}>{t('common.sets').toUpperCase()}</Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{totalVolThisWeek > 0 ? `${Math.round(totalVolThisWeek / 1000)}k` : '—'}</Text>
            <Text style={styles.weekStatLabel}>{t('history.vol')} (kg)</Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{prDays > 0 ? `${prDays}` : '—'}</Text>
            <Text style={styles.weekStatLabel}>{t('history.prDays')}</Text>
          </View>
        </View>
      )}

      {/* Session Cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={palette.brand[500]} />}
      >
        {totalSessionCount === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>{t('history.noWorkouts')}</Text>
            {weekOffset < 0 && (
              <Text style={styles.emptySubtext}>Navigate forward to see more recent weeks</Text>
            )}
          </View>
        ) : (
          Array.from(weekSessions.entries())
            .sort((a, b) => a[0] - b[0])
            .flatMap(([, daySessions]) =>
              daySessions.map((session) => {
                const sessionDate = new Date(session.completedAt ?? session.startedAt);
                const dayLabel = safeLocaleDateString(sessionDate, locale, { weekday: 'long', month: 'short', day: 'numeric' });

                // Cardio sessions have no sets — render a dedicated card instead of
                // the strength layout (which would show "0 exercises · 0 sets").
                if (session.sessionType === 'cardio') {
                  const cardioStats = [
                    session.cardioDistanceKm ? `${session.cardioDistanceKm} km` : null,
                    session.cardioCaloriesBurned ? `${session.cardioCaloriesBurned} kcal` : null,
                    session.cardioAvgHeartRate ? `${session.cardioAvgHeartRate} bpm` : null,
                  ].filter(Boolean) as string[];
                  return (
                    <View key={session.id} style={[styles.sessionCard, styles.cardioCard]}>
                      <View style={styles.cardTop}>
                        <View style={styles.cardTopLeft}>
                          <Text style={styles.cardDay}>{dayLabel}</Text>
                          {!!session.durationMinutes && (
                            <Text style={styles.cardDuration}>{session.durationMinutes} min</Text>
                          )}
                        </View>
                        <View style={styles.cardioPill}>
                          <PersonSimpleRun size={13} weight="bold" color={palette.brand[400]} />
                          <Text style={styles.cardioPillText}>{cardioLabel(session.cardioType)}</Text>
                        </View>
                      </View>
                      {cardioStats.length > 0 && (
                        <View style={styles.cardStats}>
                          {cardioStats.map((s, i) => (
                            <React.Fragment key={s}>
                              {i > 0 && <Text style={styles.cardStatDot}>·</Text>}
                              <Text style={styles.cardStat}>{s}</Text>
                            </React.Fragment>
                          ))}
                        </View>
                      )}
                      {session.notes && (
                        <Text style={styles.cardNotes}>"{session.notes}"</Text>
                      )}
                    </View>
                  );
                }

                const stats = sessionStats(session);
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.sessionCard, stats.hasPR && styles.sessionCardPR]}
                    onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                    activeOpacity={0.75}
                  >
                    {/* Card Header */}
                    <View style={styles.cardTop}>
                      <View style={styles.cardTopLeft}>
                        <Text style={styles.cardDay}>{dayLabel}</Text>
                        {!!session.durationMinutes && (
                          <Text style={styles.cardDuration}>{session.durationMinutes} min</Text>
                        )}
                      </View>
                      {stats.hasPR && (
                        <View style={styles.prBadge}>
                          <Text style={styles.prBadgeText}>{t('history.prDay')}</Text>
                        </View>
                      )}
                    </View>

                    {/* Stats Row */}
                    <View style={styles.cardStats}>
                      <Text style={styles.cardStat}>{stats.exercises} {t('history.exercises')}</Text>
                      <Text style={styles.cardStatDot}>·</Text>
                      <Text style={styles.cardStat}>{stats.sets} sets</Text>
                      {stats.volume > 0 && (
                        <>
                          <Text style={styles.cardStatDot}>·</Text>
                          <Text style={styles.cardStat}>{Math.round(stats.volume).toLocaleString()}kg total</Text>
                        </>
                      )}
                    </View>

                    {/* Exercises */}
                    <Text style={styles.cardExercises}>
                      {stats.topExerciseNames.map(n => exName(n)).join(', ')}{stats.extraCount > 0 ? ` +${stats.extraCount} more` : ''}
                    </Text>

                    {/* PR Sets */}
                    {stats.hasPR && (() => {
                      const prSets = session.sets
                        .filter((s) => s.isPR && s.isCompleted)
                        .sort((a, b) => new Date(a.loggedAt ?? 0).getTime() - new Date(b.loggedAt ?? 0).getTime());
                      return (
                        <View style={styles.prSetList}>
                          {prSets.map((s) => (
                            <Text key={s.id} style={styles.prSetText}>
                              {exName(s.exerciseName)}: {s.weightUsed}kg × {s.repsCompleted} ({s.repsCompleted}RM) · PR
                            </Text>
                          ))}
                        </View>
                      );
                    })()}

                    {/* Energy / Mood */}
                    {(session.energyLevel != null || session.mood) && (
                      <View style={styles.cardMeta}>
                        {session.energyLevel != null && (
                          <Text style={styles.cardMetaText}>{t('history.energy')} {session.energyLevel}/5</Text>
                        )}
                        {session.mood && (
                          <Text style={styles.cardMetaText}>· {t('history.mood')}: {session.mood ? t(`session.moods.${session.mood}`, { defaultValue: session.mood }) : ''}</Text>
                        )}
                      </View>
                    )}

                    {/* Notes */}
                    {session.notes && (
                      <Text style={styles.cardNotes}>"{session.notes}"</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 22, color: theme.colors.text, fontWeight: '600' },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: palette.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  navArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: palette.gray[700],
  },
  navArrowDisabled: { backgroundColor: palette.gray[800] },
  navArrowText: { fontSize: 22, color: theme.colors.text, fontWeight: '700', lineHeight: 26 },
  navArrowTextDisabled: { color: palette.gray[600] },
  weekLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },

  dayStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: palette.gray[900],
    gap: 4,
  },
  dayCell: { flex: 1, alignItems: 'center', gap: 6 },
  dayName: { fontSize: 10, fontWeight: '700', color: palette.gray[500], letterSpacing: 0.5 },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotPR: { backgroundColor: '#92400e' },
  dayDotPRText: { fontSize: 14 },
  dayDotCount: { fontSize: 11, fontWeight: '800', color: '#fff' },
  dayDotPlanned: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: palette.brand[600],
  },
  dayDotEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.gray[800],
  },

  weekSummary: {
    flexDirection: 'row',
    backgroundColor: palette.gray[800],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
  },
  weekStat: { flex: 1, alignItems: 'center' },
  weekStatValue: { fontSize: 18, fontWeight: '800', color: palette.brand[400] },
  weekStatLabel: { fontSize: 9, fontWeight: '700', color: palette.gray[500], letterSpacing: 0.8, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: palette.gray[400], marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: palette.gray[600] },

  sessionCard: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.gray[700],
  },
  sessionCardPR: {
    borderColor: '#92400e',
    backgroundColor: '#78350f18',
  },
  cardioCard: {
    borderColor: palette.brand[800],
    backgroundColor: 'rgba(234,88,12,0.06)',
  },
  cardioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(234,88,12,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardioPillText: { fontSize: 12, fontWeight: '700', color: palette.brand[400] },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTopLeft: {},
  cardDay: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  cardDuration: { fontSize: 12, color: palette.gray[400], marginTop: 2 },

  prBadge: {
    backgroundColor: '#92400e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  prBadgeText: { fontSize: 12, fontWeight: '700', color: '#fcd34d' },

  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  cardStat: { fontSize: 13, color: palette.gray[400] },
  cardStatDot: { fontSize: 13, color: palette.gray[600] },

  cardExercises: {
    fontSize: 13,
    color: palette.gray[300],
    fontStyle: 'italic',
    marginBottom: 6,
  },

  prSetList: {
    marginTop: 6,
    gap: 3,
  },
  prSetText: {
    fontSize: 12,
    color: '#fcd34d',
    fontWeight: '600',
  },

  cardMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  cardMetaText: { fontSize: 12, color: palette.gray[500] },

  cardNotes: {
    fontSize: 12,
    color: palette.gray[500],
    fontStyle: 'italic',
    marginTop: 8,
  },
});
