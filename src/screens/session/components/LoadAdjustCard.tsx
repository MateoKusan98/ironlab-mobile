import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, palette, alpha } from '../../../theme';
import { InSessionAdjustment } from '../../../services/ai-coach.service';

export interface LoadAdjustCardProps {
  adjustment: InSessionAdjustment | null;
  exerciseName: string;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * The mid-workout load cut, offered inline under the exercise it belongs to.
 *
 * Deliberately NOT an Alert and not a modal. The athlete reading this is standing
 * between sets, often with a bar loaded and a rest clock running; a dialog that seizes
 * the screen is answered by whichever button dismisses it fastest. This sits in the
 * flow, states the number, and waits.
 *
 * Everything shown here is arithmetic the athlete can check: what they lifted, what
 * they rated it, what that prices their max at today, and what the remaining sets come
 * out to. The suggestion is only ever lighter — there is no upward branch anywhere in
 * this feature — so "Keep" is always the more aggressive choice and reads as the
 * secondary action.
 */
export const LoadAdjustCard: React.FC<LoadAdjustCardProps> = ({
  adjustment,
  exerciseName,
  onApply,
  onDismiss,
}) => {
  const { t } = useTranslation();
  if (!adjustment) return null;

  const { currentWeight, suggestedWeight, observedRpe, targetRpe, remainingSets, capped } = adjustment;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('activeWorkout.adjustLabel', { defaultValue: 'COACH' })}</Text>
      <Text style={styles.headline}>
        {t('activeWorkout.adjustHeadline', {
          rpe: observedRpe,
          target: targetRpe,
          defaultValue: 'That set came back at RPE {{rpe}} against a target of {{target}}.',
        })}
      </Text>
      <View style={styles.weights}>
        <Text style={styles.from}>{currentWeight}kg</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.to}>{suggestedWeight}kg</Text>
      </View>
      <Text style={styles.detail}>
        {t('activeWorkout.adjustDetail', {
          count: remainingSets,
          weight: suggestedWeight,
          exercise: exerciseName,
          defaultValue: 'For the remaining {{count}} sets of {{exercise}}.',
        })}
      </Text>
      {/* The honest recomputation was bigger than we are willing to act on from one set.
          Saying so is the point: the athlete knows whether it was a bad day or a typo,
          and we do not. */}
      {capped ? <Text style={styles.capped}>{t('activeWorkout.adjustCapped', { defaultValue: 'Capped — the full recomputation was larger. If this was a bad day rather than a mistyped RPE, cut further or end the lift here.' })}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={onApply}
          accessibilityRole="button"
          accessibilityLabel={t('activeWorkout.adjustApplyA11y', {
            weight: suggestedWeight,
            defaultValue: 'Drop the remaining sets to {{weight}} kilograms',
          })}
        >
          <Text style={styles.applyText}>{t('activeWorkout.adjustApply', { weight: suggestedWeight, defaultValue: 'Drop to {{weight}}kg' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.keepBtn}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('activeWorkout.adjustKeepA11y', {
            weight: currentWeight,
            defaultValue: 'Keep {{weight}} kilograms',
          })}
        >
          <Text style={styles.keepText}>{t('activeWorkout.adjustKeep', { defaultValue: 'Keep' })}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: alpha(palette.warning[500], 0.08),
    borderWidth: 1,
    borderColor: alpha(palette.warning[500], 0.35),
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 6,
  },
  label: { fontSize: 10, fontWeight: '800', color: palette.warning[500], letterSpacing: 1.4 },
  headline: { fontSize: 14, fontWeight: '600', color: theme.colors.text, lineHeight: 20 },
  weights: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
  from: { fontSize: 20, fontWeight: '700', color: palette.gray[500], textDecorationLine: 'line-through' },
  arrow: { fontSize: 16, color: palette.gray[500] },
  to: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  detail: { fontSize: 13, color: palette.gray[400], lineHeight: 18 },
  capped: { fontSize: 12, color: palette.warning[500], lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  applyBtn: {
    flex: 1,
    backgroundColor: palette.warning[500],
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  applyText: { fontSize: 14, fontWeight: '800', color: palette.gray[900] },
  keepBtn: {
    backgroundColor: palette.gray[700],
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  keepText: { fontSize: 14, fontWeight: '600', color: palette.gray[300] },
});
