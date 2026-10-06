import { StyleSheet } from 'react-native';
import { theme, palette } from '../../theme';

/** Styles shared by AICoachPlanScreen and its PlanHeader. */
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  headerSub: { fontSize: 11, color: palette.gray[500], marginTop: 1 },
  debugBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: palette.gray[800], alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  regenBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: palette.gray[700],
  },
  regenBtnDisabled: { borderColor: palette.gray[800], opacity: 0.45 },
  regenBtnText: { fontSize: 12, color: palette.gray[400], fontWeight: '600' },
  regenBtnTextDisabled: { color: palette.gray[600] },

  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: palette.gray[900],
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  noteInput: {
    flex: 1, fontSize: 13, color: theme.colors.text,
    backgroundColor: palette.gray[800], borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: palette.gray[700],
  },
  noteGenerateBtn: {
    backgroundColor: palette.brand[600], borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  noteGenerateBtnText: { fontSize: 13, fontWeight: '700', color: palette.white },

  footer: {
    padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: palette.gray[800],
  },
  startBtn: {
    backgroundColor: palette.brand[600], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
  chatBtn: {
    borderRadius: 14, borderWidth: 1, borderColor: palette.gray[700],
    paddingVertical: 14, alignItems: 'center',
  },
  chatBtnText: { fontSize: 14, fontWeight: '600', color: palette.gray[300] },

  setCompRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: palette.gray[900],
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  setCompText: { fontSize: 13, color: palette.gray[400], fontWeight: '500' },
  setCompArrow: { fontSize: 16, color: palette.gray[600] },
});
