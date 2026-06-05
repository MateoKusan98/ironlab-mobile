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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { useTranslation } from 'react-i18next';
import { useExerciseName } from '../../hooks/useExerciseName';
import { sessionService, WorkoutSession } from '../../services/session.service';
import { aiCoachService } from '../../services/ai-coach.service';
import { Moon, Minus, ThumbsUp, Fire, Lightning, Trophy } from 'phosphor-react-native';

type SummaryRouteProp = RouteProp<RootStackParamList, 'SessionSummary'>;

const MOOD_VALUES = ['tired', 'neutral', 'good', 'great', 'elite'] as const;
const MOOD_ICONS: Record<string, React.ReactElement> = {
  tired:   <Moon size={24} weight="fill" color="#6b7280" />,
  neutral: <Minus size={24} weight="bold" color="#9ca3af" />,
  good:    <ThumbsUp size={24} weight="fill" color="#f97316" />,
  great:   <Fire size={24} weight="fill" color="#ef4444" />,
  elite:   <Lightning size={24} weight="fill" color="#eab308" />,
};

export const SessionSummaryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { exName } = useExerciseName();
  const MOODS = MOOD_VALUES.map((v) => ({ icon: MOOD_ICONS[v], value: v, name: t(`session.moods.${v}`) }));
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SummaryRouteProp>();
  const { sessionId, durationMinutes, prs } = route.params;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('good');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    sessionService.getSession(sessionId).then((s) => {
      setSession(s);
      setMood(s.mood ?? 'good');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sessionId]);

  const getSummaryStats = () => {
    if (!session) return { exercises: 0, totalSets: 0, totalVolume: 0 };
    const exerciseNames = [...new Set(session.sets.map((s) => s.exerciseName))];
    const completedSets = session.sets.filter((s) => s.isCompleted);
    const totalVolume = completedSets.reduce((acc, s) => {
      return acc + ((s.weightUsed ?? 0) * (s.repsCompleted ?? 0));
    }, 0);
    return { exercises: exerciseNames.length, totalSets: completedSets.length, totalVolume };
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      await sessionService.completeSession(sessionId, {
        notes: notes.trim() || undefined,
        mood,
        durationMinutes,
      });
    } catch {
      Alert.alert(t('common.error'), t('errors.serverError'));
      setSaving(false);
      return;
    }
    setSaving(false);
    setGenerating(true);
    try {
      await aiCoachService.postSession(sessionId);
    } catch {
      // AI failure is non-fatal — navigate anyway
    }
    navigation.reset({ index: 0, routes: [{ name: 'ClientApp' }] });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const stats = getSummaryStats();
  const exerciseNames = session ? [...new Set(session.sets.map((s) => s.exerciseName))] : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.trophyBlock}>
          <Trophy size={56} weight="fill" color={palette.brand[400]} style={{ marginBottom: 8 }} />
          <Text style={styles.doneTitle}>{t('sessionSummary.sessionComplete')}</Text>
          <Text style={styles.doneSubtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{durationMinutes}m</Text>
            <Text style={styles.statLabel}>{t('sessionSummary.duration').toUpperCase()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>{t('sessionSummary.totalSets').toUpperCase()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.exercises}</Text>
            <Text style={styles.statLabel}>{t('sessionSummary.exercises').toUpperCase()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalVolume > 0 ? `${Math.round(stats.totalVolume / 1000)}k` : '—'}</Text>
            <Text style={styles.statLabel}>VOL (kg)</Text>
          </View>
        </View>

        {/* PR Recap */}
        {prs && prs.length > 0 && (
          <View style={styles.prCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Trophy size={18} weight="fill" color={palette.brand[400]} /><Text style={styles.prCardTitle}>Personal Records Broken!</Text></View>
            {prs.map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <View style={styles.prRowLeft}>
                  <Text style={styles.prExercise}>{exName(pr.exerciseName)}</Text>
                  <Text style={styles.prLabel}>{pr.label}</Text>
                </View>
                <View style={styles.prRowRight}>
                  <Text style={styles.prValue}>{pr.value}kg</Text>
                  <Text style={styles.prDelta}>
                    {pr.previous ? `+${(pr.value - pr.previous).toFixed(1)} from ${pr.previous}kg` : 'First ever! 🎉'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Exercise breakdown */}
        {exerciseNames.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('sessionSummary.exercises').toUpperCase()}</Text>
            {exerciseNames.map((name) => {
              const exSets = session!.sets.filter((s) => s.exerciseName === name && s.isCompleted);
              const topSet = exSets.reduce((best, s) => {
                const vol = (s.weightUsed ?? 0) * (s.repsCompleted ?? 0);
                const bestVol = (best?.weightUsed ?? 0) * (best?.repsCompleted ?? 0);
                return vol > bestVol ? s : best;
              }, exSets[0]);
              return (
                <View key={name} style={styles.exRow}>
                  <Text style={styles.exName}>{exName(name)}</Text>
                  <Text style={styles.exDetail}>
                    {exSets.length} sets
                    {topSet?.weightUsed ? ` · Top: ${topSet.weightUsed}kg × ${topSet.repsCompleted}` : ''}
                    {topSet?.rpe ? ` @ RPE ${topSet.rpe}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Post-session mood */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOW WAS THE WORKOUT?</Text>
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

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('sessionSummary.sessionNotes').toUpperCase()}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('sessionSummary.addNotes')}
            placeholderTextColor={palette.gray[500]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || generating) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || generating}
        >
          {saving || generating ? (
            <View style={styles.saveBtnInner}>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
              <Text style={styles.saveBtnText}>
                {generating ? t('sessionSummary.analyzingSession') : t('common.saving')}
              </Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>{t('sessionSummary.done')}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  trophyBlock: { alignItems: 'center', paddingVertical: 28 },
  trophyIcon: { fontSize: 56, marginBottom: 12 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  doneSubtitle: { fontSize: 14, color: palette.gray[400] },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: palette.gray[800],
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: palette.brand[400], marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: palette.gray[500], letterSpacing: 0.8 },

  card: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 14 },

  exRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.gray[700] },
  exName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  exDetail: { fontSize: 12, color: palette.gray[400], marginTop: 2 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { alignItems: 'center', flex: 1, paddingVertical: 10, borderRadius: 12, marginHorizontal: 2 },
  moodBtnActive: { backgroundColor: palette.brand[600] + '33' },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodName: { fontSize: 10, color: palette.gray[400], fontWeight: '600' },
  moodNameActive: { color: palette.brand[400] },

  notesInput: {
    backgroundColor: palette.gray[700],
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 90,
  },

  prCard: {
    backgroundColor: '#78350f' + '50',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  prCardTitle: { fontSize: 15, fontWeight: '800', color: '#fcd34d', marginBottom: 14 },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#92400e' + '60',
  },
  prRowLeft: { flex: 1 },
  prExercise: { fontSize: 14, fontWeight: '700', color: '#fef3c7' },
  prLabel: { fontSize: 11, color: '#fcd34d', marginTop: 2 },
  prRowRight: { alignItems: 'flex-end' },
  prValue: { fontSize: 18, fontWeight: '800', color: '#fcd34d' },
  prDelta: { fontSize: 10, color: '#fbbf24', marginTop: 2 },

  saveBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
