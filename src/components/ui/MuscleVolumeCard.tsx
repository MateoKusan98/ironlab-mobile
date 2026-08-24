import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette, alpha } from '../../theme';
import { aiCoachService, MuscleStatus, MuscleVolumeRow, MuscleVolumeSummary } from '../../services/ai-coach.service';

/**
 * WEEKLY VOLUME PER MUSCLE — the human-readable audit of what the coach has actually been
 * programming.
 *
 * Every volume mechanism in the engine reasons in MOVEMENT PATTERNS, because patterns are
 * what fatigue accumulates against. But a lifter checks whether their programming is sane
 * in MUSCLES, and the two disagree exactly where it matters: one athlete's "Push" read a
 * healthy 18.9 hard sets a week while every one of them was a bench variation and his
 * triceps and side delts had nothing direct in eleven weeks.
 *
 * So this card is deliberately a DEBUGGING instrument before it is a coaching one. It
 * shows the number, the range it is judged against, and this week's running total — the
 * inputs, not just the verdict — so a wrong call is visibly wrong rather than quietly
 * wrong. Sets are EFFECTIVE sets: a squat counts fully toward quads, three-quarters toward
 * glutes and half toward the lower back, because counting compounds only for their prime
 * mover tells a powerlifter his glutes are starving while he squats three times a week.
 */

const STATUS: Record<MuscleStatus, { label: string; color: string; tint: string }> = {
  not_enough: { label: 'LOW',     color: palette.warning[500], tint: theme.surfaceTint.warning },
  optimal:    { label: 'OPTIMAL', color: palette.success[500], tint: theme.surfaceTint.success },
  too_much:   { label: 'HIGH',    color: palette.error[500],   tint: theme.surfaceTint.error },
};

/** Where the athlete's weekly figure sits inside the productive band, clamped to the bar. */
function fill(row: MuscleVolumeRow): number {
  const span = Math.max(1, row.mrv);
  return Math.max(0.02, Math.min(1, row.weekly / span));
}

const Row: React.FC<{ row: MuscleVolumeRow }> = ({ row }) => {
  const s = STATUS[row.status];
  // The productive band drawn on the track, so "low" and "high" are visibly relative to
  // something rather than asserted.
  const mevAt = Math.min(1, row.mev / Math.max(1, row.mrv)) * 100;

  return (
    <View style={styles.row}>
      <Text style={styles.muscle} numberOfLines={1}>{row.label}</Text>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View style={[styles.band, { left: `${mevAt}%`, right: 0 }]} />
          <View style={[styles.fill, { width: `${fill(row) * 100}%`, backgroundColor: s.color }]} />
        </View>
        <Text style={styles.range}>{row.mev}–{row.mrv}</Text>
      </View>

      <View style={styles.numbers}>
        <Text style={[styles.weekly, { color: s.color }]}>{row.weekly}</Text>
        <Text style={styles.thisWeek}>{row.thisWeek} now</Text>
      </View>

      <View style={[styles.pill, { backgroundColor: s.tint }]}>
        <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
      </View>
    </View>
  );
};

export const MuscleVolumeCard: React.FC = () => {
  const [data, setData] = useState<MuscleVolumeSummary | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    aiCoachService.muscleVolume()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Nothing measured yet is not an error state worth a card — a new athlete has no
  // coverage to audit, and an empty grid reads as "you are failing at everything".
  if (!data || !data.weeksMeasured) return null;

  const problems = data.rows.filter((r) => r.status !== 'optimal');
  const shown = expanded ? data.rows : (problems.length ? problems : data.rows.slice(0, 4));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Weekly volume by muscle</Text>
          <Text style={styles.subtitle}>
            effective sets · {data.weeksMeasured}-week average
            {problems.length ? ` · ${problems.length} outside range` : ' · all in range'}
          </Text>
        </View>
      </View>

      {shown.map((r) => <Row key={r.muscle} row={r} />)}

      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Show fewer muscles' : 'Show all muscles'}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{expanded ? 'Show less' : `Show all ${data.rows.length}`}</Text>
      </TouchableOpacity>

      {/* A movement the classifier cannot place is volume nobody is counting. Surfacing
          it is the difference between a gap you can fix and a number quietly too low. */}
      {!!data.unclassified.length && (
        <Text style={styles.unclassified}>
          Not counted: {data.unclassified.join(', ')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.zinc[900],
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: alpha(palette.zinc[700], 0.5),
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { color: palette.zinc[200], fontSize: 15, fontWeight: '700' },
  subtitle: { color: palette.zinc[500], fontSize: 11, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  muscle: { color: palette.zinc[300], fontSize: 12, width: 78 },

  trackWrap: { flex: 1, marginRight: 10 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: alpha(palette.zinc[700], 0.6),
    overflow: 'hidden',
    justifyContent: 'center',
  },
  band: { position: 'absolute', top: 0, bottom: 0, backgroundColor: alpha(palette.success[500], 0.16) },
  fill: { height: 6, borderRadius: 3 },
  range: { color: palette.zinc[600], fontSize: 9, marginTop: 3 },

  numbers: { width: 46, alignItems: 'flex-end', marginRight: 8 },
  weekly: { fontSize: 13, fontWeight: '700' },
  thisWeek: { color: palette.zinc[600], fontSize: 9 },

  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, width: 62, alignItems: 'center' },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  toggle: { marginTop: 10, alignSelf: 'flex-start' },
  toggleText: { color: palette.brand[400], fontSize: 12, fontWeight: '600' },
  unclassified: { color: palette.zinc[600], fontSize: 10, marginTop: 8, fontStyle: 'italic' },
});
