import { StyleSheet } from 'react-native';
import { theme, palette } from '../../../theme';

/** Shared by the fatigue and coach-memory sheets on the plan screen. */
export const fat = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bannerEmoji: { fontSize: 16 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerSub: { fontSize: 11, color: palette.gray[500], marginTop: 1 },
  bannerEdit: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },

  // Modal shell
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 16, fontWeight: '700', color: palette.white },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: palette.gray[400] },
  scroll: { flex: 1 },
  intro: { fontSize: 14, color: palette.gray[400], lineHeight: 21, marginBottom: 18 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: palette.gray[500],
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 6,
  },

  // Fatigue level card
  levelCard: {
    alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingVertical: 20, paddingHorizontal: 16, marginBottom: 20,
  },
  levelEmoji: { fontSize: 34, marginBottom: 8 },
  levelLabel: { fontSize: 18, fontWeight: '800' },
  clearedTag: { fontSize: 12, color: palette.gray[400], textAlign: 'center', marginTop: 8, lineHeight: 17 },

  reasonRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  reasonDot: { fontSize: 14, color: palette.gray[500] },
  reasonText: { flex: 1, fontSize: 13, color: palette.gray[300], lineHeight: 19 },
  deloadNote: { fontSize: 13, color: palette.gray[500], lineHeight: 19, marginTop: 16, fontStyle: 'italic' },

  // Recommended remedy (trim / deload / taper). The taper variant is accented — it is
  // time-sensitive in a way the others are not.
  recCard: {
    marginTop: 20, borderRadius: 14, borderWidth: 1, borderColor: palette.gray[800],
    backgroundColor: palette.stone[900], padding: 14,
  },
  recCardPeak: { borderColor: palette.brand[700], backgroundColor: palette.brand[950] },
  recLabel: {
    fontSize: 11, fontWeight: '700', color: palette.gray[500],
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  recHeadline: { fontSize: 15, fontWeight: '700', color: palette.white, lineHeight: 21, marginBottom: 6 },
  recDetail: { fontSize: 13, color: palette.gray[300], lineHeight: 20 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: palette.gray[800] },
  taperBtn: { backgroundColor: palette.brand[600], borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  taperBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
  clearBtn: { backgroundColor: palette.brand[600], borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  clearBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
  resumeBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10,
    borderWidth: 1, borderColor: palette.gray[700],
  },
  resumeBtnText: { fontSize: 14, fontWeight: '600', color: palette.gray[300] },
  footerHint: { fontSize: 11, color: palette.gray[600], lineHeight: 16, marginTop: 12, textAlign: 'center' },

  // Notes
  noteInputRow: { flexDirection: 'row', gap: 10, marginBottom: 22, alignItems: 'flex-end' },
  noteInput: {
    flex: 1, minHeight: 48, maxHeight: 120, backgroundColor: palette.gray[900],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: palette.white, fontSize: 14, borderWidth: 1, borderColor: palette.gray[800],
  },
  noteAddBtn: {
    backgroundColor: palette.brand[600], borderRadius: 12,
    paddingHorizontal: 18, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  noteAddBtnDisabled: { opacity: 0.4 },
  noteAddBtnText: { fontSize: 14, fontWeight: '700', color: palette.white },
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: palette.gray[900], borderRadius: 10, padding: 12, marginBottom: 10,
  },
  noteCat: {
    fontSize: 10, fontWeight: '700', color: palette.brand[400],
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3,
  },
  noteDesc: { fontSize: 13, color: palette.gray[200], lineHeight: 19 },
  noteDelBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  noteDelText: { fontSize: 15, color: palette.gray[600] },
  emptyNote: { fontSize: 13, color: palette.gray[600], fontStyle: 'italic' },
});
