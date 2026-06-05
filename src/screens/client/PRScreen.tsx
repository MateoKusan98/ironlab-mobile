import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useExerciseName } from '../../hooks/useExerciseName';
import { theme, palette } from '../../theme';
import { Trophy } from 'phosphor-react-native';
import { sessionService } from '../../services/session.service';

interface RepPR { exerciseName: string; reps: string; maxWeight: string; achievedAt: string }

export const PRScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const [repPRs, setRepPRs] = useState<RepPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await sessionService.getPRs();
      setRepPRs(data.repPRs ?? []);
    } catch { /* show empty state */ }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} size="large" />
      </SafeAreaView>
    );
  }

  const exercises = [...new Set(repPRs.map((p) => p.exerciseName))].sort();
  const activeExercise = selectedExercise ?? exercises[0] ?? null;

  const reps = repPRs
    .filter((p) => p.exerciseName === activeExercise)
    .sort((a, b) => parseInt(a.reps) - parseInt(b.reps));

  // Best (1RM or heaviest single-rep)
  const best = reps[0];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>{t('prs.title')}</Text>

      {exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Trophy size={64} weight="fill" color={palette.brand[400]} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>{t('prs.noPRs')}</Text>
          <Text style={styles.emptySubtitle}>{t('prs.noPRsSub')}</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.brand[500]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise Picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exercisePicker} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {exercises.map((ex) => (
              <TouchableOpacity
                key={ex}
                style={[styles.exerciseChip, activeExercise === ex && styles.exerciseChipActive]}
                onPress={() => setSelectedExercise(ex)}
              >
                <Text style={[styles.exerciseChipText, activeExercise === ex && styles.exerciseChipTextActive]}>
                  {exName(ex)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeExercise && (
            <View style={styles.content}>
              {/* Best lift hero */}
              {best && parseInt(best.reps) === 1 && (
                <View style={styles.heroCard}>
                  <Text style={styles.heroLabel}>{t('prs.oneRepMax')}</Text>
                  <Text style={styles.heroValue}>{parseFloat(best.maxWeight).toFixed(1)}kg</Text>
                  {best.achievedAt && (
                    <Text style={styles.heroDate}>
                      {new Date(best.achievedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              )}

              {/* Rep Maxes Grid */}
              {reps.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('prs.repMax')}</Text>
                  <View style={styles.repGrid}>
                    {reps.map((r) => (
                      <View key={r.reps} style={styles.repCard}>
                        <Text style={styles.repLabel}>{r.reps}RM</Text>
                        <Text style={styles.repValue}>{parseFloat(r.maxWeight).toFixed(1)}kg</Text>
                        <Text style={styles.repDate}>
                          {r.achievedAt ? new Date(r.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pageTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.text, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: palette.gray[400], textAlign: 'center', lineHeight: 20 },

  exercisePicker: { flexGrow: 0, marginBottom: 16 },
  exerciseChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: palette.gray[700],
    backgroundColor: palette.gray[900],
  },
  exerciseChipActive: { backgroundColor: palette.brand[600], borderColor: palette.brand[600] },
  exerciseChipText: { fontSize: 13, fontWeight: '600', color: palette.gray[400] },
  exerciseChipTextActive: { color: '#fff' },

  content: { paddingHorizontal: 16 },

  heroCard: {
    backgroundColor: '#78350f' + '40',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#fcd34d', letterSpacing: 1.5, marginBottom: 8 },
  heroValue: { fontSize: 56, fontWeight: '900', color: '#fcd34d', letterSpacing: -2 },
  heroDate: { fontSize: 12, color: '#fbbf24', marginTop: 6 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: palette.gray[500], letterSpacing: 1, marginBottom: 12 },

  repGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  repCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: palette.gray[800],
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  repLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 4 },
  repValue: { fontSize: 20, fontWeight: '800', color: palette.brand[400] },
  repDate: { fontSize: 10, color: palette.gray[600], marginTop: 4 },
});
