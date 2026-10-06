import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'phosphor-react-native';
import { palette } from '../../../theme';
import { PlateStack } from '../../../components/ui/PlateStack';
import { LocalSet } from '../workoutState';
import { styles } from '../ActiveWorkoutScreen.styles';

export interface SetRowProps {
  set: LocalSet;
  /** Draw the plate stack under this row (the first row of each prescribed load). */
  showPlates: boolean;
  barWeight: number | undefined;
  barLoading: { barKg: number; plates: number[] } | null | undefined;
  onChangeField: (field: 'weight' | 'reps' | 'rpe', value: string) => void;
  onEndEditing: (field: 'weight' | 'rpe') => void;
  onRpeFocus: () => void;
  onRemove: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
}

/**
 * One set: weight / reps / RPE inputs, remove and complete actions, the plate stack
 * for its load, and any PRs it earned.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export const SetRow: React.FC<SetRowProps> = ({
  set, showPlates, barWeight, barLoading, onChangeField, onEndEditing, onRpeFocus, onRemove, onComplete, onUncomplete,
}) => {
  const { t } = useTranslation();
  const hasTruePR = !!set.prs?.some((p) => p.tier === 'pr');
  return (
    <View>
      <View style={[styles.setRow, set.isCompleted && styles.setRowDone, hasTruePR && styles.setRowPR]}>
        <Text style={[styles.setNum, set.isCompleted && styles.setNumDone, hasTruePR && styles.setNumPR]}>
          {hasTruePR ? <Trophy size={14} weight="fill" color={palette.brand[400]} /> : set.setNumber}
        </Text>

        <TextInput
          style={[styles.setInput, { flex: 1 }, set.isCompleted && styles.setInputDone]}
          value={set.weight}
          onChangeText={(v) => onChangeField('weight', v)}
          onEndEditing={() => onEndEditing('weight')}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={palette.gray[600]}
          editable={!set.isCompleted}
        />
        <TextInput
          style={[styles.setInput, { flex: 1 }, set.isCompleted && styles.setInputDone]}
          value={set.reps}
          onChangeText={(v) => onChangeField('reps', v)}
          keyboardType="number-pad"
          placeholder="—"
          placeholderTextColor={palette.gray[600]}
          editable={!set.isCompleted}
        />
        <TextInput
          style={[styles.setInput, { width: 50 }, set.isCompleted && styles.setInputDone]}
          value={set.rpe}
          onChangeText={(v) => onChangeField('rpe', v)}
          onEndEditing={() => onEndEditing('rpe')}
          onFocus={onRpeFocus}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={palette.gray[600]}
          editable={!set.isCompleted}
        />

        <View style={styles.setActions}>
          <TouchableOpacity
            style={styles.removeSetBtn}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('activeWorkout.removeSet', { defaultValue: 'Remove set' })}
          >
            <Text style={styles.removeSetBtnText}>✕</Text>
          </TouchableOpacity>
          {set.isSaving ? (
            <View style={styles.logBtn}>
              <ActivityIndicator color={palette.white} size="small" />
            </View>
          ) : set.isCompleted ? (
            <TouchableOpacity
              style={styles.doneCheck}
              onPress={onUncomplete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('activeWorkout.uncompleteSet', { defaultValue: 'Mark set not done' })}
              accessibilityState={{ checked: true }}
            >
              <Text style={styles.doneCheckText}>✓</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.logBtn}
              onPress={onComplete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.completeSet', { defaultValue: 'Mark set complete' })}
              accessibilityState={{ checked: false }}
            >
              <Text style={styles.logBtnText}>✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* What to hang on the bar for this set's prescribed load.
          Presentational — it reads targetWeight, never writes one. */}
      {showPlates && (
        <PlateStack
          weightKg={barWeight!}
          bar={barLoading}
          perSideLabel={t('activeWorkout.perSide', { defaultValue: 'per side' })}
        />
      )}

      {/* PR badges */}
      {set.prs && set.prs.length > 0 && (
        <View style={[styles.prBadgeRow, !hasTruePR && styles.prBadgeRowMini]}>
          {set.prs.map((pr) => (
            <View key={pr.type} style={[styles.prBadge, pr.tier === 'mini' && styles.prBadgeMini]}>
              <Text style={[styles.prBadgeText, pr.tier === 'mini' && styles.prBadgeMiniText]}>
                {pr.tier === 'pr'
                  ? `🏆 PR · ${pr.e1rm ?? pr.value}kg 1RM${pr.prevE1rm ? ` (+${((pr.e1rm ?? pr.value) - pr.prevE1rm).toFixed(1)})` : ' · First ever!'}`
                  : `mini PR · ${pr.label}: ${pr.value}kg${pr.previous ? ` (+${(pr.value - pr.previous).toFixed(1)})` : ''}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
