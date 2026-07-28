import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useExerciseName } from '../../hooks/useExerciseName';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { sessionService, WorkoutSession, SessionSet } from '../../services/session.service';
import { Moon, Minus, ThumbsUp, Fire, Lightning, Trophy } from 'phosphor-react-native';

const MOOD_ICON: Record<string, React.ReactElement> = {
  tired:   <Moon size={20} weight="fill" color={palette.coolGray[500]} />,
  neutral: <Minus size={20} weight="bold" color={palette.coolGray[400]} />,
  good:    <ThumbsUp size={20} weight="fill" color={palette.brand[500]} />,
  great:   <Fire size={20} weight="fill" color={palette.error[500]} />,
  elite:   <Lightning size={20} weight="fill" color={palette.yellow[500]} />,
};

function groupSetsByExercise(sets: SessionSet[]): { name: string; sets: SessionSet[] }[] {
  const sorted = [...sets]
    .filter((s) => s.isCompleted)
    .sort((a, b) => new Date(a.loggedAt ?? 0).getTime() - new Date(b.loggedAt ?? 0).getTime());

  const order: string[] = [];
  const map = new Map<string, SessionSet[]>();
  for (const s of sorted) {
    if (!map.has(s.exerciseName)) {
      order.push(s.exerciseName);
      map.set(s.exerciseName, []);
    }
    map.get(s.exerciseName)!.push(s);
  }
  return order.map((name) => ({ name, sets: map.get(name)! }));
}

export const SessionDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const route = useRoute<RouteProp<RootStackParamList, 'SessionDetail'>>();
  const { sessionId } = route.params;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionService.getSession(sessionId)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{t('sessionDetail.sessionNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const sessionDate = new Date(session.completedAt ?? session.startedAt);
  const dateLabel = sessionDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hasPR = session.sets.some((s) => s.isPR && s.isCompleted);
  const exerciseGroups = groupSetsByExercise(session.sets);
  const totalVolume = session.sets
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + (s.weightUsed ?? 0) * (s.repsCompleted ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{dateLabel}</Text>
          {session.durationMinutes != null && (
            <Text style={styles.headerSub}>{session.durationMinutes} min</Text>
          )}
        </View>
        {hasPR && (
          <View style={styles.prBadge}>
            <Text style={styles.prBadgeText}>{t('sessionDetail.prDay')}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Readiness row */}
        {(session.energyLevel != null || session.mood || session.bodyweight != null || session.sleepHours != null) && (
          <View style={styles.readinessCard}>
            <Text style={styles.sectionLabel}>{t('sessionDetail.readiness')}</Text>
            <View style={styles.readinessRow}>
              {session.mood && (
                <View style={styles.readinessStat}>
                  <View style={styles.readinessEmoji}>{MOOD_ICON[session.mood] ?? <ThumbsUp size={20} weight="fill" color={palette.brand[500]} />}</View>
                  <Text style={styles.readinessValue}>{session.mood.charAt(0).toUpperCase() + session.mood.slice(1)}</Text>
                </View>
              )}
              {session.energyLevel != null && (
                <View style={styles.readinessStat}>
                  <Text style={styles.readinessLabel}>{t('history.energy')}</Text>
                  <Text style={styles.readinessValue}>{session.energyLevel}/5</Text>
                </View>
              )}
              {session.bodyweight != null && (
                <View style={styles.readinessStat}>
                  <Text style={styles.readinessLabel}>{t('profile.weight')}</Text>
                  <Text style={styles.readinessValue}>{session.bodyweight}kg</Text>
                </View>
              )}
              {session.sleepHours != null && (
                <View style={styles.readinessStat}>
                  <Text style={styles.readinessLabel}>{t('session.sleep')}</Text>
                  <Text style={styles.readinessValue}>{session.sleepHours}h</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{exerciseGroups.length}</Text>
            <Text style={styles.summaryLabel}>{t('sessionDetail.exercises')}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{session.sets.filter((s) => s.isCompleted).length}</Text>
            <Text style={styles.summaryLabel}>{t('sessionDetail.sets')}</Text>
          </View>
          {totalVolume > 0 && (
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{Math.round(totalVolume).toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>{t('sessionDetail.kgTotal')}</Text>
            </View>
          )}
        </View>

        {/* Exercise blocks */}
        {exerciseGroups.map(({ name, sets }) => {
          const hasExPR = sets.some((s) => s.isPR);
          return (
            <View key={name} style={[styles.exerciseCard, hasExPR && styles.exerciseCardPR]}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exName(name)}</Text>
                {hasExPR && <View style={styles.prTag}><Trophy size={12} weight="fill" color={palette.brand[400]} /><Text style={styles.prTagText}> PR</Text></View>}
              </View>

              {sets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNum}>{i + 1}</Text>
                  <Text style={styles.setDetail}>
                    {s.weightUsed != null && s.weightUsed > 0
                      ? `${s.weightUsed}kg`
                      : 'BW'}
                    {' × '}
                    {s.repsCompleted ?? '—'} reps
                  </Text>
                  {s.rpe != null && (
                    <Text style={styles.setRpe}>RPE {s.rpe}</Text>
                  )}
                  {s.isPR && <Trophy size={14} weight="fill" color={palette.brand[400]} />}
                </View>
              ))}

              {/* Technique notes per exercise */}
              {sets.filter((s) => s.techniqueNotes?.trim()).slice(0, 1).map((s) => (
                <Text key={s.id} style={styles.techniqueNote}>
                  💬 {s.techniqueNotes}
                </Text>
              ))}
            </View>
          );
        })}

        {/* Session notes */}
        {session.notes?.trim() && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionLabel}>{t('sessionDetail.sessionNotes')}</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  errorText: { color: palette.gray[400], textAlign: 'center', marginTop: 80 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
    gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: theme.colors.text },
  headerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  headerSub: { fontSize: 12, color: palette.gray[500], marginTop: 1 },
  prBadge: {
    backgroundColor: palette.warning[800], borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  prBadgeText: { fontSize: 12, fontWeight: '700', color: palette.warning[400] },

  readinessCard: {
    backgroundColor: palette.gray[800], borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: palette.gray[500],
    letterSpacing: 1, marginBottom: 12,
  },
  readinessRow: { flexDirection: 'row', gap: 20 },
  readinessStat: { alignItems: 'center', gap: 2 },
  readinessEmoji: { marginBottom: 4 },
  readinessLabel: { fontSize: 11, color: palette.gray[500] },
  readinessValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },

  summaryRow: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  summaryStat: {
    flex: 1, backgroundColor: palette.gray[800],
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  summaryLabel: { fontSize: 11, color: palette.gray[500], marginTop: 2 },

  exerciseCard: {
    backgroundColor: palette.gray[800], borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: palette.gray[700],
  },
  exerciseCardPR: { borderLeftColor: palette.warning[500] },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  exerciseName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
  prTag: { flexDirection: 'row', alignItems: 'center' },
  prTagText: { fontSize: 12, fontWeight: '700', color: palette.warning[500] },

  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: palette.gray[700],
  },
  setNum: { width: 20, fontSize: 12, color: palette.gray[500], fontWeight: '600' },
  setDetail: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  setRpe: { fontSize: 12, color: palette.brand[400], fontWeight: '600' },

  techniqueNote: {
    fontSize: 12, color: palette.gray[400], fontStyle: 'italic',
    marginTop: 10, lineHeight: 18,
  },

  notesCard: {
    backgroundColor: palette.gray[800], borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  notesText: { fontSize: 14, color: palette.gray[300], lineHeight: 20 },
});
