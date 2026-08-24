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

/** Where the weekly figure sits on a track that runs 0 → a little past the ceiling. */
function fill(row: MuscleVolumeRow): number {
  const span = Math.max(1, row.mrv * 1.15);
  return Math.max(0.02, Math.min(1, row.weekly / span));
}

const Row: React.FC<{ row: MuscleVolumeRow }> = ({ row }) => {
  const tracked = row.supports.length > 0;
  const s = tracked ? STATUS[row.status] : STATUS.optimal;
  const span = Math.max(1, row.mrv * 1.15);
  // The productive band drawn ON the track, so "low" and "high" are visibly relative to
  // something rather than asserted by a coloured pill.
  const bandLeft = (row.mev / span) * 100;
  const bandWidth = ((row.mrv - row.mev) / span) * 100;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={[styles.muscle, !tracked && styles.muted]} numberOfLines={1}>{row.label}</Text>
        <Text style={[styles.weekly, { color: tracked ? s.color : palette.zinc[600] }]}>{row.weekly}</Text>
        <Text style={styles.perWeek}>/wk</Text>
        {tracked ? (
          <View style={[styles.pill, { backgroundColor: s.tint }]}>
            <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
          </View>
        ) : (
          <Text style={styles.naText}>n/a</Text>
        )}
      </View>

      <View style={styles.track}>
        <View style={[styles.band, { left: `${bandLeft}%`, width: `${bandWidth}%` }]} />
        <View style={[styles.fill, { width: `${fill(row) * 100}%`, backgroundColor: tracked ? s.color : palette.zinc[600] }]} />
      </View>

      <View style={styles.rowFoot}>
        <Text style={styles.range}>target {row.mev}–{row.mrv}</Text>
        {row.thisWeek > 0 && <Text style={styles.range}>{row.thisWeek} this week</Text>}
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

  // A muscle that builds none of the three lifts is not a problem for this athlete — a
  // powerlifter's calves and side delts are always "low" and always fine. Showing them as
  // problems buries the ones that matter under noise the coach itself ignores.
  const thisWeekTotal = Math.round(data.rows.reduce((n, r) => n + r.thisWeek, 0));
  const problems = data.rows.filter((r) => r.status !== 'optimal' && r.supports.length > 0);
  const shown = expanded ? data.rows : (problems.length ? problems : data.rows.slice(0, 4));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Weekly volume by muscle</Text>
          <Text style={styles.subtitle}>
            {problems.length
              ? `${problems.length} outside target range`
              : 'everything inside target range'}
          </Text>
          <Text style={styles.subtitleDim}>
            effective sets per week, averaged over your last {data.weeksMeasured} full weeks
            {thisWeekTotal > 0 ? ` · ${thisWeekTotal} logged so far this week` : ' · nothing logged yet this week'}
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
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: alpha(palette.zinc[700], 0.5),
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  title: { color: palette.zinc[200], fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { color: palette.zinc[400], fontSize: 12, marginTop: 3, fontWeight: '600' },
  subtitleDim: { color: palette.zinc[600], fontSize: 11, marginTop: 4, lineHeight: 15 },

  row: { marginBottom: 18 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 7 },
  muscle: { color: palette.zinc[300], fontSize: 13, fontWeight: '600', flex: 1 },
  muted: { color: palette.zinc[600] },
  weekly: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  perWeek: { color: palette.zinc[600], fontSize: 10, marginLeft: 2, marginRight: 10 },

  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: alpha(palette.zinc[700], 0.55),
    overflow: 'hidden',
    justifyContent: 'center',
  },
  band: { position: 'absolute', top: 0, bottom: 0, backgroundColor: alpha(palette.success[500], 0.22) },
  fill: { height: 7, borderRadius: 4 },

  rowFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  range: { color: palette.zinc[600], fontSize: 10 },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, minWidth: 58, alignItems: 'center' },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  naText: { color: palette.zinc[700], fontSize: 10, minWidth: 58, textAlign: 'center' },

  toggle: { marginTop: 2, marginBottom: 10, alignSelf: 'flex-start' },
  toggleText: { color: palette.brand[400], fontSize: 13, fontWeight: '600' },
  unclassified: { color: palette.zinc[600], fontSize: 10, marginBottom: 10, fontStyle: 'italic' },
});
