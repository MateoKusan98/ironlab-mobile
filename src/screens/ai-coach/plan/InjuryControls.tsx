import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../../theme';

/**
 * Active injuries: the banner on the plan screen and the sheet that sets how the coach handles them.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */

// ─── Injury Modal ─────────────────────────────────────────────────────────────

export const InjuryModal: React.FC<{
  visible: boolean;
  injuries: { id: string; exerciseName: string | null; description: string }[];
  currentHandling: string | null;
  onSave: (handling: 'replace' | 'remove' | 'reduce') => void;
  onClearInjury: (id: string) => Promise<void>;
  onClose: () => void;
}> = ({ visible, injuries, currentHandling, onSave, onClearInjury, onClose }) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<'replace' | 'remove' | 'reduce' | null>(
    (currentHandling as 'replace' | 'remove' | 'reduce') ?? null,
  );
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setChoice((currentHandling as 'replace' | 'remove' | 'reduce') ?? null);
  }, [visible, currentHandling]);

  // The three options below all decide how to program AROUND an injury. None of them
  // can say "this flag is wrong" — injuries are DETECTED from session notes and RPE
  // patterns, so a false positive was permanent and silently shrank every future
  // session. Clearing deactivates the underlying coach note (same endpoint the notes
  // screen uses), so the athlete can retract a detection the coach got wrong.
  const confirmClear = (injury: { id: string; exerciseName: string | null; description: string }) => {
    const label = injury.exerciseName ? `${injury.exerciseName} — ${injury.description}` : injury.description;
    Alert.alert(
      'Remove this injury?',
      `"${label}"\n\nM-7EO will stop programming around it and your next session will be built as normal. You can always tell it about a real injury again in chat.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setClearingId(injury.id);
            try {
              await onClearInjury(injury.id);
            } finally {
              setClearingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={inj.container}>
        <View style={inj.header}>
          <Text style={inj.title}>{t('aiCoach.injuryHandling')}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={inj.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.close', { defaultValue: 'Close' })}
          >
            <Text style={inj.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={inj.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={inj.intro}>
            M-7EO detected active injuries. Tell it how to build your session around them.
          </Text>

          <Text style={inj.sectionLabel}>Active injuries</Text>
          {injuries.map((inj_) => (
            <View key={inj_.id} style={inj.injuryRow}>
              <Text style={inj.injuryDot}>⚠</Text>
              <View style={{ flex: 1 }}>
                {inj_.exerciseName && (
                  <Text style={inj.injuryExercise}>{inj_.exerciseName}</Text>
                )}
                <Text style={inj.injuryDesc}>{inj_.description}</Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmClear(inj_)}
                disabled={clearingId === inj_.id}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={inj.injuryClearBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove injury: ${inj_.exerciseName ? `${inj_.exerciseName}, ` : ''}${inj_.description}`}
                accessibilityHint="Clears this injury flag so sessions are no longer built around it"
                accessibilityState={{ disabled: clearingId === inj_.id }}
              >
                {clearingId === inj_.id
                  ? <ActivityIndicator size="small" color={palette.gray[500]} />
                  : <Text style={inj.injuryClearText}>✕</Text>}
              </TouchableOpacity>
            </View>
          ))}
          <Text style={inj.injuryHint}>
            Wrong flag? Tap ✕ to remove it — M-7EO detects injuries from your notes and can get one wrong.
          </Text>

          <Text style={[inj.sectionLabel, { marginTop: 24 }]}>How should M-7EO handle these?</Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={[inj.optionCard, choice === 'replace' && inj.optionCardActive]}
            onPress={() => setChoice('replace')}
          >
            <View style={inj.optionTop}>
              <Text style={inj.optionEmoji}>🔄</Text>
              <Text style={[inj.optionTitle, choice === 'replace' && inj.optionTitleActive]}>
                {t('aiCoach.findAlternatives')}
              </Text>
              {choice === 'replace' && <Text style={inj.optionCheck}>✓</Text>}
            </View>
            <Text style={inj.optionDesc}>
              Replace affected exercises with structurally different movements that avoid the injured area. Keep training hard, just differently.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={[inj.optionCard, choice === 'reduce' && inj.optionCardActive]}
            onPress={() => setChoice('reduce')}
          >
            <View style={inj.optionTop}>
              <Text style={inj.optionEmoji}>📉</Text>
              <Text style={[inj.optionTitle, choice === 'reduce' && inj.optionTitleActive]}>
                {t('aiCoach.reduceVolume')}
              </Text>
              {choice === 'reduce' && <Text style={inj.optionCheck}>✓</Text>}
            </View>
            <Text style={inj.optionDesc}>
              Keep the movements but drop weight and volume significantly. Train through the injury at a level that doesn't aggravate it.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={[inj.optionCard, choice === 'remove' && inj.optionCardActive]}
            onPress={() => setChoice('remove')}
          >
            <View style={inj.optionTop}>
              <Text style={inj.optionEmoji}>🚫</Text>
              <Text style={[inj.optionTitle, choice === 'remove' && inj.optionTitleActive]}>
                {t('aiCoach.skipCompletely')}
              </Text>
              {choice === 'remove' && <Text style={inj.optionCheck}>✓</Text>}
            </View>
            <Text style={inj.optionDesc}>
              Remove all exercises that touch the injured area. Train only what is completely safe. Volume may be lower.
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={inj.footer}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[inj.saveBtn, !choice && inj.saveBtnDisabled]}
            onPress={() => choice && onSave(choice)}
            disabled={!choice}
          >
            <Text style={inj.saveBtnText}>{t('aiCoach.applyRegenerate')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Injury Banner ────────────────────────────────────────────────────────────

export const InjuryBanner: React.FC<{
  injuries: { id: string; exerciseName: string | null; description: string }[];
  handling: string | null;
  onPress: () => void;
}> = ({ injuries, handling, onPress }) => {
  const label = handling === 'replace'
    ? 'Finding alternatives'
    : handling === 'reduce'
    ? 'Reduced volume & intensity'
    : handling === 'remove'
    ? 'Skipping affected exercises'
    : 'Tap to set injury protocol';

  return (
    <TouchableOpacity accessibilityRole="button" style={inj.banner} onPress={onPress}>
      <View style={inj.bannerLeft}>
        <Text style={inj.bannerEmoji}>🩹</Text>
        <View>
          <Text style={inj.bannerTitle}>
            {injuries.length} active {injuries.length === 1 ? 'injury' : 'injuries'}
          </Text>
          <Text style={inj.bannerSub}>{label}</Text>
        </View>
      </View>
      <Text style={inj.bannerEdit}>{handling ? 'Change ›' : 'Set up ›'}</Text>
    </TouchableOpacity>
  );
};

const inj = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.surfaceTint.warning,
    borderBottomWidth: 1, borderBottomColor: palette.warning[800],
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerEmoji: { fontSize: 18 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: palette.warning[400] },
  bannerSub: { fontSize: 11, color: palette.gray[500], marginTop: 1 },
  bannerEdit: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },

  // Modal
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

  intro: { fontSize: 14, color: palette.gray[400], lineHeight: 21, marginBottom: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: palette.gray[500],
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },

  injuryRow: {
    flexDirection: 'row', gap: 10, marginBottom: 10,
    backgroundColor: palette.gray[900], borderRadius: 10, padding: 12,
  },
  injuryDot: { fontSize: 14, color: palette.warning[400], marginTop: 1 },
  injuryExercise: { fontSize: 13, fontWeight: '700', color: palette.warning[400], marginBottom: 2 },
  injuryDesc: { fontSize: 13, color: palette.gray[300], lineHeight: 18 },
  injuryClearBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  injuryClearText: { fontSize: 15, color: palette.gray[500], fontWeight: '600' },
  injuryHint: { fontSize: 12, color: palette.gray[600], lineHeight: 17, marginTop: 2 },

  optionCard: {
    borderRadius: 12, borderWidth: 1, borderColor: palette.gray[700],
    padding: 16, marginBottom: 12,
  },
  optionCardActive: { borderColor: palette.brand[500], backgroundColor: theme.surfaceTint.brand },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  optionEmoji: { fontSize: 20 },
  optionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: palette.gray[300] },
  optionTitleActive: { color: palette.white },
  optionCheck: { fontSize: 16, color: palette.brand[500] },
  optionDesc: { fontSize: 13, color: palette.gray[500], lineHeight: 19 },

  footer: {
    padding: 16, borderTopWidth: 1, borderTopColor: palette.gray[800],
  },
  saveBtn: {
    backgroundColor: palette.brand[600], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
});
