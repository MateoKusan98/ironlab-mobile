import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { palette } from '../../../theme';
import { useExerciseName } from '../../../hooks/useExerciseName';
import { sessionService, ExerciseHistory } from '../../../services/session.service';
import { formatWeight, formatNumber, unitLabel } from '../../../units/weight';
import { useLiftingUnit } from '../../../units/useLiftingUnit';
import { formatLastSets } from '../../session/lastTime';
import { e1rmTrend, headlineBests } from './historyView';
import { TrendBars } from './TrendBars';
import { styles } from './ExerciseHistoryScreen.styles';

/**
 * Every logged session of one movement — "what did I do on pause bench over the last
 * two months?" (2026-10-07). Opened from the "Last time" line in the live workout, from
 * Stats, and from a past session's exercise.
 *
 * Reports what was logged and never proposes a load.
 */
export const ExerciseHistoryScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { exName } = useExerciseName();
  const unit = useLiftingUnit();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { name } = useRoute<RouteProp<RootStackParamList, 'ExerciseHistory'>>().params;

  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    sessionService.getExerciseHistory(name).then(setHistory).catch(() => setFailed(true));
  }, [name]);

  const dateOf = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  if (!history && !failed) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const sessions = history?.sessions ?? [];
  const trend = history ? e1rmTrend(sessions, unit) : null;
  const bests = history ? headlineBests(history.repBests) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{exName(name)}</Text>
        {sessions.length > 0 && (
          <Text style={styles.subtitle}>
            {t('exerciseHistory.sessionCount', { count: sessions.length, defaultValue: '{{count}} sessions logged' })}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {failed && (
          <Text style={styles.empty}>{t('exerciseHistory.loadFailed', { defaultValue: 'Could not load the history. Check your connection.' })}</Text>
        )}
        {history && sessions.length === 0 && (
          <Text style={styles.empty}>{t('exerciseHistory.empty', { defaultValue: 'Nothing logged on this exercise yet.' })}</Text>
        )}

        {bests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('exerciseHistory.bests', { defaultValue: 'BEST LIFTED' })}</Text>
            <View style={styles.chips}>
              {bests.map((b) => (
                <View key={b.reps} style={styles.chip}>
                  <Text style={styles.chipReps}>×{b.reps}</Text>
                  <Text style={styles.chipWeight}>{formatWeight(b.weight, unit)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {trend && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('exerciseHistory.trend', { defaultValue: 'ESTIMATED 1RM' })}</Text>
            <Text style={styles.trendLine}>
              {formatNumber(trend.first)} → {formatNumber(trend.last)}{unitLabel(unit)}
              <Text style={{ color: trend.changePct >= 0 ? palette.success[500] : palette.error[500] }}>
                {'  '}{trend.changePct >= 0 ? '+' : ''}{trend.changePct}%
              </Text>
            </Text>
            <TrendBars points={trend.points} rising={trend.changePct >= 0} />
          </View>
        )}

        {sessions.map((s) => (
          <TouchableOpacity
            key={s.sessionId}
            style={styles.sessionRow}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: s.sessionId })}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionDate}>{dateOf(s.completedAt)}</Text>
              <Text style={styles.sessionSets}>{formatLastSets(s.sets, unit)}</Text>
            </View>
            {s.topSet?.weight != null && (
              <Text style={styles.topSet}>{formatWeight(s.topSet.weight, unit)}×{s.topSet.reps}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
