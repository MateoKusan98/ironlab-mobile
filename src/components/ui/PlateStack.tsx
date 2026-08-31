import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, alpha } from '../../theme';
import type { BarLoading } from '../../services/ai-coach.service';
import { platesPerSide, formatPlates } from '../../utils/plateMath';

/**
 * The prescribed weight, drawn as the bar that makes it.
 *
 * Purely presentational: it reads a load that has already been clamped, validated
 * and snapped to the athlete's plate increment server-side, and never produces
 * one. If it cannot draw the weight exactly it renders nothing — the athlete
 * still has the number, which is the prescription.
 *
 * Renders nothing at all when:
 *   - the venue has no barbell (`bar` is null — the athlete presses dumbbells),
 *   - the movement is not bar-loaded (the caller gates on `barLoaded`),
 *   - the plates on hand cannot make the weight exactly (see `platesPerSide`).
 */

/**
 * IPF plate colours. Not decoration — this is how plates are marked on every
 * competition platform and most commercial bumpers, so an athlete recognises the
 * stack by colour before they have read a single number. Home iron is black, in
 * which case the colours are simply a consistent size code.
 */
const PLATE_COLORS: Record<string, string> = {
  '25': palette.error[600],    // red
  '20': palette.info[600],     // blue
  '15': palette.warning[500],  // yellow
  '10': palette.success[600],  // green
  '5': palette.gray[100],      // white
  '2.5': palette.error[800],
  '1.25': palette.gray[300],
  '0.5': palette.gray[400],
  '0.25': palette.gray[500],
};

/** Plate height scales with weight, floored so a change plate is still visible. */
const plateHeight = (kg: number) => Math.max(10, Math.min(24, 10 + kg * 0.58));

export interface PlateStackProps {
  /** The prescribed total bar weight, in kg. */
  weightKg: number;
  /** The athlete's bar and plates, from the plan payload. Null = nothing to draw. */
  bar: BarLoading | null | undefined;
  /** Word for "per side", supplied by the caller so this stays translation-free. */
  perSideLabel: string;
}

export const PlateStack: React.FC<PlateStackProps> = ({ weightKg, bar, perSideLabel }) => {
  if (!bar) return null;

  const plates = platesPerSide(weightKg, bar);
  if (!plates) return null;

  // An empty bar is a real prescription (technique work, a first warm-up), and
  // "just the bar" is the whole instruction — there is no stack to draw.
  const barOnly = plates.length === 0;

  const label = barOnly
    ? `${weightKg} kg: the empty ${bar.barKg} kg bar`
    : `${weightKg} kg: a ${bar.barKg} kg bar plus ${formatPlates(plates)} kilos per side`;

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.barStub} />
      <View style={styles.collar}>
        <Text style={styles.collarText}>{bar.barKg}</Text>
      </View>

      {/* Largest first — the order they actually go on the sleeve. */}
      {plates.map((kg, i) => (
        <View
          key={`${kg}-${i}`}
          style={[
            styles.plate,
            {
              height: plateHeight(kg),
              backgroundColor: PLATE_COLORS[String(kg)] ?? palette.gray[300],
            },
          ]}
        />
      ))}

      <Text style={styles.legend} numberOfLines={1}>
        {barOnly ? `${bar.barKg} kg bar` : `${formatPlates(plates)} ${perSideLabel}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 2,
  },
  // The sleeve the plates sit on, so the stack reads as loaded rather than as a
  // free-floating row of coloured chips.
  barStub: {
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.gray[400],
  },
  collar: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: alpha(palette.gray[300], 0.18),
    marginRight: 2,
  },
  collarText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.gray[300],
  },
  plate: {
    width: 6,
    borderRadius: 1.5,
  },
  legend: {
    marginLeft: 8,
    flexShrink: 1,
    fontSize: 11,
    color: palette.gray[400],
    fontVariant: ['tabular-nums'],
  },
});
