import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import type { BarLoading } from '../../../services/ai-coach.service';
import { Exercise } from '../workoutState';
import { warmupRamp } from '../warmup';

/**
 * The warm-up jumps to this exercise's first working set, as tappable chips:
 * "Bar×10 · 60×5 · 80×3 · 100×1". Ticking one is local only (see warmup.ts for why
 * warm-ups are never logged).
 *
 * Shown for bar-loaded movements until the first working set is done — after that the
 * athlete is warm and the strip is clutter.
 */
export const WarmupStrip: React.FC<{
  exercise: Exercise;
  barLoading: BarLoading | null;
  onToggle: (weight: number) => void;
}> = ({ exercise, barLoading, onToggle }) => {
  const { t } = useTranslation();
  if (!exercise.barLoaded || exercise.sets.some((s) => s.isCompleted)) return null;
  const first = exercise.sets[0];
  const topKg = first?.adjustedWeight ?? first?.targetWeight ?? parseFloat(first?.weight ?? '');
  const workReps = first?.targetReps ?? parseInt(first?.reps ?? '', 10);
  const ramp = warmupRamp(topKg, Number.isFinite(workReps) ? workReps : 5, barLoading);
  if (ramp.length < 2) return null;

  const done = new Set(exercise.warmupsDone ?? []);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('activeWorkout.warmup', { defaultValue: 'Warm-up' })}</Text>
      <View style={styles.chips}>
        {ramp.map((set, i) => {
          const isDone = done.has(set.weight);
          const weightLabel = i === 0 ? t('activeWorkout.emptyBar', { defaultValue: 'Bar' }) : String(set.weight);
          return (
            <TouchableOpacity
              key={set.weight}
              style={[styles.chip, isDone && styles.chipDone]}
              onPress={() => onToggle(set.weight)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
              accessibilityLabel={`${weightLabel} × ${set.reps}`}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <Text style={[styles.chipText, isDone && styles.chipTextDone]}>
                {isDone ? '✓ ' : ''}{weightLabel}×{set.reps}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginTop: 8, marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', color: palette.gray[500], letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.gray[600],
    backgroundColor: palette.gray[800],
  },
  chipDone: { borderColor: palette.brand[600], backgroundColor: palette.gray[900] },
  chipText: { fontSize: 13, fontWeight: '600', color: palette.gray[200] },
  chipTextDone: { color: palette.brand[400] },
});
