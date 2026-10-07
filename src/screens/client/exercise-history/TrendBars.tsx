import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette } from '../../../theme';

/** Tallest bar, in points. Short enough to sit in a card, tall enough to read a change. */
const MAX_HEIGHT = 40;
/** A flat stretch still draws as bars rather than vanishing. */
const MIN_HEIGHT = 3;

/** The e1RM trend as bars, oldest left — the same idiom as the Stats sparkline. */
export const TrendBars: React.FC<{ points: number[]; rising: boolean }> = ({ points, rising }) => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const color = rising ? palette.success[500] : palette.error[500];
  return (
    <View style={styles.row} accessible={false}>
      {points.map((p, i) => (
        <View
          key={i}
          style={[styles.bar, {
            height: Math.max(((p - min) / range) * MAX_HEIGHT, MIN_HEIGHT),
            backgroundColor: color,
            opacity: 0.5 + (i / points.length) * 0.5,
          }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 10, height: MAX_HEIGHT },
  bar: { flex: 1, maxWidth: 14, borderRadius: 2 },
});
