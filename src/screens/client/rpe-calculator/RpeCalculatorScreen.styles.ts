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

  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  weightInput: {
    flex: 1, backgroundColor: palette.gray[900], borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 22, fontWeight: '800', color: theme.colors.text, fontVariant: ['tabular-nums'],
  },
  weightUnit: { fontSize: 16, fontWeight: '700', color: palette.gray[400] },

  pickerBlock: { marginBottom: 12 },
  pickerLabel: { fontSize: 12, fontWeight: '700', color: palette.gray[400], marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minWidth: 40, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, backgroundColor: palette.gray[700], borderWidth: 1, borderColor: palette.gray[700],
  },
  chipSelected: { backgroundColor: palette.brand[600], borderColor: palette.brand[500] },
  chipText: { fontSize: 14, fontWeight: '700', color: palette.gray[200], fontVariant: ['tabular-nums'] },
  chipTextSelected: { color: theme.colors.text },

  resultCard: { backgroundColor: palette.gray[800], borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.brand[700] },
  resultLoad: { fontSize: 34, fontWeight: '900', color: palette.brand[300], fontVariant: ['tabular-nums'] },
  resultFor: { fontSize: 14, color: palette.gray[300], marginTop: 2 },
  resultMax: { fontSize: 13, color: palette.gray[400], marginTop: 10 },
  resultHint: { fontSize: 14, color: palette.gray[400] },
  caveat: { fontSize: 12, color: palette.warning[400], marginTop: 10, lineHeight: 17 },
  footnote: { fontSize: 11, color: palette.gray[500], textAlign: 'center', marginTop: 6, lineHeight: 16 },
});
