import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { useLiftingUnit } from '../../../units/useLiftingUnit';
import type { LastPerformance } from '../../../services/session.service';
import { styles } from '../ActiveWorkoutScreen.styles';
import { daysSince, formatLastSets } from '../lastTime';

/**
 * "Last time (4 days ago): 3×5 @ 160kg · RPE 8" under the exercise name — the number a
 * lifter checks between sets. Reports what was logged; it never suggests a load.
 * Tapping it opens the movement's whole history.
 */
export const LastTimeLine: React.FC<{ lastTime: LastPerformance; exerciseName: string }> = ({ lastTime, exerciseName }) => {
  const { t } = useTranslation();
  const unit = useLiftingUnit();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Read once per mount: "4 days ago" does not need to tick during a workout.
  const [nowMs] = useState(Date.now);
  if (!lastTime.sets.length) return null;
  const days = daysSince(lastTime.completedAt, nowMs);
  const when = days == null
    ? null
    : days === 0
      ? t('activeWorkout.lastTimeToday', { defaultValue: 'today' })
      : days === 1
        ? t('activeWorkout.lastTimeYesterday', { defaultValue: 'yesterday' })
        : t('activeWorkout.lastTimeDaysAgo', { count: days, defaultValue: '{{count}} days ago' });
  const label = when
    ? t('activeWorkout.lastTimeWhen', { when, defaultValue: 'Last time ({{when}})' })
    : t('activeWorkout.lastTime', { defaultValue: 'Last time' });
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ExerciseHistory', { name: exerciseName })}
      accessibilityRole="button"
      accessibilityHint={t('exerciseHistory.openHint', { defaultValue: 'Opens every session of this exercise' })}
      hitSlop={{ top: 4, bottom: 4 }}
    >
      <Text style={styles.lastTime} numberOfLines={2}>
        {label}: {formatLastSets(lastTime.sets, unit)} ›
      </Text>
    </TouchableOpacity>
  );
};
