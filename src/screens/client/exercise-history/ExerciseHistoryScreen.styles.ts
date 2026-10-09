import { StyleSheet } from 'react-native';
import { theme, palette } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 12, color: palette.gray[500], marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  empty: { color: palette.gray[400], textAlign: 'center', marginTop: 60, paddingHorizontal: 24 },

  card: { backgroundColor: palette.gray[800], borderRadius: 14, padding: 16, marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: palette.gray[500], letterSpacing: 1, marginBottom: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: palette.gray[900], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  chipReps: { fontSize: 11, fontWeight: '700', color: palette.gray[500] },
  chipWeight: { fontSize: 15, fontWeight: '800', color: theme.colors.text, fontVariant: ['tabular-nums'] },

  trendLine: { fontSize: 15, fontWeight: '700', color: theme.colors.text, fontVariant: ['tabular-nums'] },

  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: palette.gray[800], borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  sessionDate: { fontSize: 12, fontWeight: '700', color: palette.gray[400], marginBottom: 3 },
  sessionSets: { fontSize: 14, color: theme.colors.text },
  sessionNote: { fontSize: 13, fontStyle: 'italic', color: palette.gray[400], marginTop: 3 },
  topSet: { fontSize: 14, fontWeight: '800', color: palette.brand[400], fontVariant: ['tabular-nums'] },
});
