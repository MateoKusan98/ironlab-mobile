import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../../theme';

export interface RestTimerBannerProps {
  /** Seconds remaining; the banner renders nothing when null. */
  restSecs: number | null;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

/** Countdown colour shifts as rest runs out: green → amber → red. */
export function restColorFor(seconds: number): string {
  if (seconds > 30) return palette.success[500];
  if (seconds > 10) return palette.warning[500];
  return palette.error[500];
}

/** mm:ss, zero-padded. */
export function formatRest(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * The between-sets rest countdown, pinned under the header while it runs.
 *
 * Purely presentational — the timing, persistence and background-safe
 * notification all live in `useRestTimer`.
 */
export const RestTimerBanner: React.FC<RestTimerBannerProps> = ({
  restSecs,
  onAdjust,
  onSkip,
}) => {
  if (restSecs === null) return null;
  const color = restColorFor(restSecs);

  return (
    <View style={[styles.banner, { borderLeftColor: color }]}>
      <View style={styles.left}>
        <View>
          <Text style={styles.label}>REST</Text>
          <Text style={[styles.countdown, { color }]}>{formatRest(restSecs)}</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => onAdjust(-15)}
          accessibilityRole="button"
          accessibilityLabel="Subtract 15 seconds of rest"
        >
          <Text style={styles.btnText}>−15</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => onAdjust(15)}
          accessibilityRole="button"
          accessibilityLabel="Add 15 seconds of rest"
        >
          <Text style={styles.btnText}>+15</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.gray[800],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 10, fontWeight: '800', color: palette.gray[400], letterSpacing: 1.5 },
  countdown: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  controls: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  btn: {
    backgroundColor: palette.gray[700],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  skipBtn: {
    backgroundColor: palette.gray[700],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  skipText: { fontSize: 13, fontWeight: '600', color: palette.gray[400] },
});
