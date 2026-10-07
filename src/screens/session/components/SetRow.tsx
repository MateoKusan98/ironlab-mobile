import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CloudSlash, Trophy } from 'phosphor-react-native';
import { palette } from '../../../theme';
import { PlateStack } from '../../../components/ui/PlateStack';
import type { PlateSet } from '../../../utils/plateMath';
import type { PRResult } from '../../../services/session.service';
import { LiftingUnit, formatGain, formatWeight } from '../../../units/weight';
import { useLiftingUnit } from '../../../units/useLiftingUnit';
import { LocalSet } from '../workoutState';
import { styles } from '../ActiveWorkoutScreen.styles';

export interface SetRowProps {
  set: LocalSet;
  /** Draw the plate stack under this row (the first row of each prescribed load). */
  showPlates: boolean;
  /** The prescribed load in the athlete's unit — the number the plate stack must agree with. */
  barWeight: number | undefined;
  plateSet: PlateSet | null;
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
  set, showPlates, barWeight, plateSet, onChangeField, onEndEditing, onRpeFocus, onRemove, onComplete, onUncomplete,
}) => {
  const { t } = useTranslation();
  const unit = useLiftingUnit();
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
          {/* No spinner: a set is ticked the moment it is tapped and saved behind the
              tick (setSync.ts). A save in the air only blocks a second tap. */}
          {set.isCompleted ? (
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

      {set.unsynced && (
        <View
          style={styles.unsyncedRow}
          accessible
          accessibilityLabel={t('activeWorkout.notSyncedA11y', { defaultValue: 'Not synced yet. Saved on this phone, will retry.' })}
        >
          <CloudSlash size={12} color={palette.gray[400]} />
          <Text style={styles.unsyncedText}>
            {t('activeWorkout.notSynced', { defaultValue: 'Not synced yet · saved on this phone' })}
          </Text>
        </View>
      )}

      {/* What to hang on the bar for this set's prescribed load.
          Presentational — it reads targetWeight, never writes one. */}
      {showPlates && (
        <PlateStack
          weight={barWeight!}
          bar={plateSet}
          unit={unit}
          perSideLabel={t('activeWorkout.perSide', { defaultValue: 'per side' })}
        />
      )}

      {/* PR badges */}
      {set.prs && set.prs.length > 0 && (
        <View style={[styles.prBadgeRow, !hasTruePR && styles.prBadgeRowMini]}>
          {set.prs.map((pr) => (
            <View key={pr.type} style={[styles.prBadge, pr.tier === 'mini' && styles.prBadgeMini]}>
              <Text style={[styles.prBadgeText, pr.tier === 'mini' && styles.prBadgeMiniText]}>
                {prBadgeText(pr, unit)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/** "🏆 PR · 180kg 1RM (+2.5)" — every number in the athlete's unit, the gain included. */
export function prBadgeText(pr: PRResult, unit: LiftingUnit): string {
  const gain = (now: number, before: number) => formatGain(now, before, unit);
  if (pr.tier === 'pr') {
    const best = pr.e1rm ?? pr.value;
    return `🏆 PR · ${formatWeight(best, unit)} 1RM${pr.prevE1rm ? ` (+${gain(best, pr.prevE1rm)})` : ' · First ever!'}`;
  }
  return `mini PR · ${pr.label}: ${formatWeight(pr.value, unit)}${pr.previous ? ` (+${gain(pr.value, pr.previous)})` : ''}`;
}
