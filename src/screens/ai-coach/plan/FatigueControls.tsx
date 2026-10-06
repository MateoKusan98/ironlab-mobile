import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../../theme';
import { FatigueStatus, FatigueLevel } from '../../../services/ai-coach.service';
import { fat } from './planSheet.styles';

/**
 * The recovery status: the fatigue banner and the sheet behind it.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */

// ─── Fatigue status (recovery) ────────────────────────────────────────────────

const FATIGUE_META: Record<FatigueLevel, { color: string; bg: string; border: string; emoji: string; label: string }> = {
  none:     { color: palette.success[400], bg: theme.surfaceTint.success, border: palette.success[800], emoji: '🟢', label: 'Recovered' },
  mild:     { color: palette.lime[400], bg: theme.surfaceTint.lime, border: palette.lime[800], emoji: '🟢', label: 'Mostly fresh' },
  elevated: { color: palette.warning[400], bg: theme.surfaceTint.warning, border: palette.warning[800], emoji: '🟡', label: 'Elevated fatigue' },
  high:     { color: palette.error[400], bg: theme.surfaceTint.error, border: palette.error[800], emoji: '🔴', label: 'High fatigue' },
};

export const FatigueBanner: React.FC<{ status: FatigueStatus; onPress: () => void }> = ({ status, onPress }) => {
  const m = FATIGUE_META[status.level];
  const sub = status.scheduledDeload
    ? 'Scheduled deload — planned recovery'
    : status.dismissed
    ? "You cleared this — feeling fine"
    : status.canDismiss
    ? 'Tap to review or clear it'
    : 'Recovery looks good';
  return (
    <TouchableOpacity accessibilityRole="button" style={[fat.banner, { backgroundColor: m.bg, borderBottomColor: m.border }]} onPress={onPress}>
      <View style={fat.bannerLeft}>
        <Text style={fat.bannerEmoji}>{m.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[fat.bannerTitle, { color: m.color }]}>Recovery: {m.label}{status.dismissed ? ' (cleared)' : ''}</Text>
          <Text style={fat.bannerSub}>{sub}</Text>
        </View>
      </View>
      <Text style={fat.bannerEdit}>Details ›</Text>
    </TouchableOpacity>
  );
};

export const FatigueModal: React.FC<{
  visible: boolean;
  status: FatigueStatus | null;
  busy: boolean;
  onDismiss: () => void;
  onResume: () => void;
  onTaper: () => void;
  onClose: () => void;
}> = ({ visible, status, busy, onDismiss, onResume, onTaper, onClose }) => {
  if (!status) return null;
  const m = FATIGUE_META[status.level];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={fat.container} edges={['top']}>
        <View style={fat.header}>
          <Text style={fat.title}>Recovery status</Text>
          <TouchableOpacity style={fat.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={fat.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={fat.scroll} contentContainerStyle={{ padding: 16 }}>
          <View style={[fat.levelCard, { borderColor: m.border, backgroundColor: m.bg }]}>
            <Text style={fat.levelEmoji}>{m.emoji}</Text>
            <Text style={[fat.levelLabel, { color: m.color }]}>{m.label}</Text>
            {status.dismissed && <Text style={fat.clearedTag}>You cleared this alarm — it'll recheck after your next workout.</Text>}
          </View>

          {status.reasons.length > 0 ? (
            <>
              <Text style={fat.sectionLabel}>What the coach is seeing</Text>
              {status.reasons.map((r, i) => (
                <View key={i} style={fat.reasonRow}>
                  <Text style={fat.reasonDot}>•</Text>
                  <Text style={fat.reasonText}>{r}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={fat.intro}>No fatigue warnings right now — your recent RPE, energy, and strength trends look healthy. Keep logging honestly and I'll flag it the moment that changes.</Text>
          )}

          {/* What to DO about it. The taper case is the one worth surfacing early: by
              the time a tired max is under way the only outcomes left are a miss or a
              tweak, and a deload at that point protects recovery by spending the peak. */}
          {status.recommendation && (
            <View style={[fat.recCard, status.recommendation.action === 'taper' && fat.recCardPeak]}>
              <Text style={fat.recLabel}>
                {status.recommendation.action === 'taper' ? '🎯 Coach\'s recommendation' : 'Coach\'s recommendation'}
              </Text>
              <Text style={fat.recHeadline}>{status.recommendation.headline}</Text>
              <Text style={fat.recDetail}>{status.recommendation.detail}</Text>
            </View>
          )}

          {status.scheduledDeload && (
            <Text style={fat.deloadNote}>This is a scheduled deload week — planned recovery baked into your program, not a reactive alarm. Loads are light on purpose and can't be cleared.</Text>
          )}
        </ScrollView>

        <View style={fat.footer}>
          {status.recommendation?.action === 'taper' && (
            <TouchableOpacity accessibilityRole="button" style={fat.taperBtn} onPress={onTaper} disabled={busy}>
              {busy ? <ActivityIndicator color={palette.white} /> : <Text style={fat.taperBtnText}>Start the taper — keep the peak</Text>}
            </TouchableOpacity>
          )}
          {/* With a taper on offer the taper is the primary action, so "clear it" drops
              to the secondary style — one primary button per screen. */}
          {status.canDismiss && (
            <TouchableOpacity
              accessibilityRole="button"
              style={status.recommendation?.action === 'taper' ? fat.resumeBtn : fat.clearBtn}
              onPress={onDismiss}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color={status.recommendation?.action === 'taper' ? palette.gray[300] : palette.white} />
                : <Text style={status.recommendation?.action === 'taper' ? fat.resumeBtnText : fat.clearBtnText}>I feel fine — clear it</Text>}
            </TouchableOpacity>
          )}
          {status.dismissed && (
            <TouchableOpacity accessibilityRole="button" style={fat.resumeBtn} onPress={onResume} disabled={busy}>
              {busy ? <ActivityIndicator color={palette.gray[300]} /> : <Text style={fat.resumeBtnText}>Actually, I need to recover</Text>}
            </TouchableOpacity>
          )}
          {status.canDismiss && (
            <Text style={fat.footerHint}>Clearing tells the coach you feel good — it stays cleared until your next logged workout, then rechecks against fresh data.</Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
