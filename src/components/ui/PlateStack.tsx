import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, alpha } from '../../theme';
import { platesPerSide, formatPlates, PlateSet } from '../../utils/plateMath';
import type { LiftingUnit } from '../../units/weight';

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
 *     or the athlete lifts in pounds and no pound plate set came with the plan,
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

/**
 * Pound bumpers carry their own code (45 blue, 35 yellow, 25 green, 10 white); iron is
 * black anyway, so as with kilos the colour is a size code first.
 */
const LB_PLATE_COLORS: Record<string, string> = {
  '45': palette.info[600],
  '35': palette.warning[500],
  '25': palette.success[600],
  '10': palette.gray[100],
  '5': palette.error[800],
  '2.5': palette.gray[300],
  '1.25': palette.gray[400],
};

/** A 45lb plate is a 20kg plate; heights are drawn on the kilo scale for both units. */
const LB_TO_HEIGHT_SCALE = 0.4536;

/** Plate height scales with weight, floored so a change plate is still visible. */
const plateHeight = (kg: number) => Math.max(10, Math.min(24, 10 + kg * 0.58));

export interface PlateStackProps {
  /** The prescribed total bar weight, in `unit` — the number printed beside it. */
  weight: number;
  /** The athlete's bar and plates in that same unit (units/weight.ts plateSetFor). Null = nothing to draw. */
  bar: PlateSet | null | undefined;
  unit: LiftingUnit;
  /** Word for "per side", supplied by the caller so this stays translation-free. */
  perSideLabel: string;
}

export const PlateStack: React.FC<PlateStackProps> = ({ weight, bar, unit, perSideLabel }) => {
  if (!bar) return null;

  const plates = platesPerSide(weight, bar);
  if (!plates) return null;

  // An empty bar is a real prescription (technique work, a first warm-up), and
  // "just the bar" is the whole instruction — there is no stack to draw.
  const barOnly = plates.length === 0;
  const isLb = unit === 'lb';
  const u = isLb ? 'lb' : 'kg';
  const colors = isLb ? LB_PLATE_COLORS : PLATE_COLORS;

  const label = barOnly
    ? `${weight} ${u}: the empty ${bar.bar} ${u} bar`
    : `${weight} ${u}: a ${bar.bar} ${u} bar plus ${formatPlates(plates)} ${isLb ? 'pounds' : 'kilos'} per side`;

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.barStub} />
      <View style={styles.collar}>
        <Text style={styles.collarText}>{bar.bar}</Text>
      </View>

      {/* Largest first — the order they actually go on the sleeve. */}
      {plates.map((plate, i) => (
        <View
          key={`${plate}-${i}`}
          style={[
            styles.plate,
            {
              height: plateHeight(isLb ? plate * LB_TO_HEIGHT_SCALE : plate),
              backgroundColor: colors[String(plate)] ?? palette.gray[300],
            },
          ]}
        />
      ))}

      <Text style={styles.legend} numberOfLines={1}>
        {barOnly ? `${bar.bar} ${u} bar` : `${formatPlates(plates)} ${perSideLabel}`}
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
