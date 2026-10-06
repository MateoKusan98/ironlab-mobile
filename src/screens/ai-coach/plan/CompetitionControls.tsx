import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../../theme';
import { Trophy, ChartBar, Barbell } from 'phosphor-react-native';

/**
 * The competition date: the sheet that sets it, the countdown banner, and the offseason banner shown instead.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */

// ─── Competition Date Modal ───────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUICK_WEEKS = [4, 8, 12, 16, 20, 24];

function addWeeks(n: number): Date {
  return new Date(Date.now() + n * 7 * 86_400_000);
}

export const CompDateModal: React.FC<{
  visible: boolean;
  currentDate: string | null;
  currentType: string | null;
  onSave: (date: string, type: 'meet' | 'pr_test') => void;
  onClear: () => void;
  onClose: () => void;
}> = ({ visible, currentDate, currentType, onSave, onClear, onClose }) => {
  const { t } = useTranslation();
  const [type, setType] = useState<'meet' | 'pr_test'>('meet');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build next 14 months starting from current month
  const monthOptions: { label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthOptions.push({
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      date: d,
    });
  }

  useEffect(() => {
    if (visible) {
      setType((currentType as 'meet' | 'pr_test') ?? 'meet');
      setSelectedDate(currentDate ? new Date(currentDate) : null);
    }
  }, [visible, currentDate, currentType]);

  const handleQuickPick = (weeks: number) => setSelectedDate(addWeeks(weeks));

  const handleConfirm = () => {
    if (!selectedDate) return;
    onSave(selectedDate.toISOString().split('T')[0], type);
  };

  const weeksLeft = selectedDate
    ? Math.ceil((selectedDate.getTime() - Date.now()) / (7 * 86_400_000))
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={comp.container}>
        <View style={comp.header}>
          <Text style={comp.title}>{t('aiCoach.competition.title')}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={comp.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.close', { defaultValue: 'Close' })}
          >
            <Text style={comp.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={comp.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Type toggle */}
          <Text style={comp.sectionLabel}>Event type</Text>
          <View style={comp.typeRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[comp.typeBtn, type === 'meet' && comp.typeBtnActive]}
              onPress={() => setType('meet')}
            >
              <Text style={[comp.typeBtnText, type === 'meet' && comp.typeBtnTextActive]}>{t('aiCoach.competition.meet')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[comp.typeBtn, type === 'pr_test' && comp.typeBtnActive]}
              onPress={() => setType('pr_test')}
            >
              <Text style={[comp.typeBtnText, type === 'pr_test' && comp.typeBtnTextActive]}>{t('aiCoach.competition.prTest')}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick picks */}
          <Text style={comp.sectionLabel}>{t('aiCoach.competition.quickPick')}</Text>
          <View style={comp.quickRow}>
            {QUICK_WEEKS.map((w) => {
              const d = addWeeks(w);
              const active = selectedDate && Math.abs(selectedDate.getTime() - d.getTime()) < 3 * 86_400_000;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={w}
                  style={[comp.quickBtn, active && comp.quickBtnActive]}
                  onPress={() => handleQuickPick(w)}
                >
                  <Text style={[comp.quickBtnWks, active && comp.quickBtnTextActive]}>{w}wk</Text>
                  <Text style={[comp.quickBtnMonth, active && comp.quickBtnTextActive]}>
                    {MONTHS[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month picker */}
          <Text style={comp.sectionLabel}>{t('aiCoach.competition.pickMonth')}</Text>
          {monthOptions.map(({ label, date }) => {
            const active = selectedDate &&
              selectedDate.getMonth() === date.getMonth() &&
              selectedDate.getFullYear() === date.getFullYear();
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={label}
                style={[comp.monthRow, active && comp.monthRowActive]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[comp.monthLabel, active && comp.monthLabelActive]}>{label}</Text>
                {active && <Text style={comp.monthCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Preview + actions */}
        <View style={comp.footer}>
          {selectedDate ? (
            <Text style={comp.preview}>
              {weeksLeft != null && weeksLeft > 0
                ? `${weeksLeft} weeks to your ${type === 'pr_test' ? 'PR test' : 'meet'} · ${selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                : 'Date is in the past — pick a future month'}
            </Text>
          ) : (
            <Text style={comp.preview}>No date selected</Text>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            style={[comp.saveBtn, !selectedDate && comp.saveBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedDate}
          >
            <Text style={comp.saveBtnText}>{t('aiCoach.competition.saveUpdate')}</Text>
          </TouchableOpacity>

          {currentDate && (
            <TouchableOpacity accessibilityRole="button" style={comp.clearBtn} onPress={onClear}>
              <Text style={comp.clearBtnText}>{t('aiCoach.competition.removeDate')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Competition Banner ───────────────────────────────────────────────────────

export const CompBanner: React.FC<{
  compDate: string;
  compType: string | null;
  onPress: () => void;
}> = ({ compDate, compType, onPress }) => {
  const weeksToComp = Math.ceil((new Date(compDate).getTime() - Date.now()) / (7 * 86_400_000));
  const label = compType === 'pr_test' ? 'PR Test' : 'Meet';
  const dateStr = new Date(compDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const urgency = weeksToComp <= 2 ? 'critical' : weeksToComp <= 6 ? 'high' : 'normal';
  const bg = urgency === 'critical' ? palette.error[900] : urgency === 'high' ? palette.brand[950] : palette.stone[900];
  const border = urgency === 'critical' ? palette.error[500] : urgency === 'high' ? palette.brand[600] : palette.stone[600];

  return (
    <TouchableOpacity accessibilityRole="button" style={[banner.wrap, { backgroundColor: bg, borderColor: border }]} onPress={onPress}>
      <View style={banner.left}>
        {compType === 'pr_test' ? <ChartBar size={22} weight="fill" color={palette.brand[400]} /> : <Trophy size={22} weight="fill" color={palette.brand[400]} />}
        <View>
          <Text style={banner.label}>{label} — {dateStr}</Text>
          <Text style={banner.sub}>
            {weeksToComp <= 0 ? 'This is competition week!' : `${weeksToComp} week${weeksToComp === 1 ? '' : 's'} away`}
          </Text>
        </View>
      </View>
      <Text style={banner.edit}>Edit ›</Text>
    </TouchableOpacity>
  );
};

// ─── Offseason banner ─────────────────────────────────────────────────────────

/**
 * Shown instead of the "set a comp date" nudge while the athlete is building
 * open-endedly. The point of an offseason is that nothing is counting down, so this
 * deliberately shows no date and no progress bar — just the one action that ends it.
 */
export const OffseasonBanner: React.FC<{
  busy: boolean;
  onTest: () => void;
  onEdit: () => void;
}> = ({ busy, onTest, onEdit }) => (
  <View style={[banner.wrap, { backgroundColor: palette.stone[900], borderColor: palette.stone[600], flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
    <TouchableOpacity accessibilityRole="button" style={banner.left} onPress={onEdit}>
      <Barbell size={22} weight="fill" color={palette.brand[400]} />
      <View style={{ flex: 1 }}>
        <Text style={banner.label}>Offseason — building</Text>
        <Text style={banner.sub}>No test scheduled. You call it when you're ready.</Text>
      </View>
      <Text style={banner.edit}>Edit ›</Text>
    </TouchableOpacity>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Test my maxes"
      style={comp.saveBtn}
      disabled={busy}
      onPress={onTest}
    >
      {busy ? <ActivityIndicator color={palette.white} /> : <Text style={comp.saveBtnText}>I'm ready — test my maxes</Text>}
    </TouchableOpacity>
  </View>
);


const comp = StyleSheet.create({
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

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: palette.gray[500],
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },

  typeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: palette.gray[700],
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: palette.brand[600], borderColor: palette.brand[600] },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: palette.gray[400] },
  typeBtnTextActive: { color: palette.white },

  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8,
  },
  quickBtn: {
    width: '14%', minWidth: 52, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: palette.gray[700],
    alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: palette.brand[600], borderColor: palette.brand[600] },
  quickBtnWks: { fontSize: 13, fontWeight: '700', color: palette.gray[300] },
  quickBtnMonth: { fontSize: 10, color: palette.gray[500], marginTop: 2 },
  quickBtnTextActive: { color: palette.white },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  monthRowActive: { backgroundColor: palette.gray[800] },
  monthLabel: { fontSize: 14, color: palette.gray[300] },
  monthLabelActive: { color: palette.white, fontWeight: '700' },
  monthCheck: { fontSize: 16, color: palette.brand[500] },

  footer: {
    padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: palette.gray[800],
  },
  preview: { fontSize: 13, color: palette.gray[400], textAlign: 'center', marginBottom: 4 },
  saveBtn: {
    backgroundColor: palette.brand[600], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
  clearBtn: { alignItems: 'center', paddingVertical: 10 },
  clearBtnText: { fontSize: 13, color: palette.gray[500] },
});

const banner = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: palette.white },
  sub: { fontSize: 11, color: palette.gray[400], marginTop: 1 },
  edit: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },
});
