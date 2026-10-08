import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import { formatRpe, quickRpeOptions } from '../quickRpe';

export interface QuickRpeChipsProps {
  targetRpe: number | undefined;
  /** Rate the set at this RPE and tick it, in one touch. */
  onLog: (rpe: string) => void;
}

/**
 * "Done @ 7.5 · 8 · 8.5 · 9 · 9.5" under the next set: the athlete's rating AND the
 * tick, one touch, no keyboard. The target is outlined so it can be found at a glance,
 * never selected for them — see quickRpe.ts for why a rating is never filled in.
 */
export const QuickRpeChips: React.FC<QuickRpeChipsProps> = ({ targetRpe, onLog }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t('activeWorkout.quickRpeLabel', { defaultValue: 'Done @ RPE' })}</Text>
      {quickRpeOptions(targetRpe).map((rpe) => {
        const text = formatRpe(rpe);
        const isTarget = targetRpe != null && rpe === targetRpe;
        return (
          <TouchableOpacity
            key={text}
            style={[styles.chip, isTarget && styles.chipTarget]}
            onPress={() => onLog(text)}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityLabel={t('activeWorkout.quickRpeA11y', { rpe: text, defaultValue: 'Log this set at RPE {{rpe}}' })}
          >
            <Text style={[styles.chipText, isTarget && styles.chipTextTarget]}>{text}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: palette.gray[400], marginRight: 2 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: palette.gray[700],
    borderWidth: 1,
    borderColor: palette.gray[700],
  },
  chipTarget: { borderColor: palette.brand[500] },
  chipText: { fontSize: 13, fontWeight: '700', color: palette.gray[200] },
  chipTextTarget: { color: palette.brand[300] },
});
