import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Lifebuoy, ArrowRight } from 'phosphor-react-native';
import { theme, palette, alpha } from '../../theme';
import { aiCoachService, RecoveryWeekStatus } from '../../services/ai-coach.service';

import { Card } from '../../components/ui';
// ─── Recovery / Vacation Modal ────────────────────────────────────────────────

export const RecoveryModal: React.FC<{
  visible: boolean;
  busy: boolean;
  onConfirm: (mode: 'recovery' | 'vacation') => void;
  onClose: () => void;
}> = ({ visible, busy, onConfirm, onClose }) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<'recovery' | 'vacation' | null>(null);

  useEffect(() => {
    if (visible) setChoice(null);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={m.container}>
        <View style={m.header}>
          <Text style={m.title}>🛟 {t('aiCoach.recovery.title')}</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <Text style={m.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={m.intro}>{t('aiCoach.recovery.intro')}</Text>

          <TouchableOpacity
            style={[m.optionCard, choice === 'recovery' && m.optionCardActive]}
            onPress={() => setChoice('recovery')}
          >
            <View style={m.optionTop}>
              <Text style={m.optionEmoji}>🛟</Text>
              <Text style={[m.optionTitle, choice === 'recovery' && m.optionTitleActive]}>
                {t('aiCoach.recovery.recoveryTitle')}
              </Text>
              {choice === 'recovery' && <Text style={m.optionCheck}>✓</Text>}
            </View>
            <Text style={m.optionDesc}>{t('aiCoach.recovery.recoveryDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[m.optionCard, choice === 'vacation' && m.optionCardActive]}
            onPress={() => setChoice('vacation')}
          >
            <View style={m.optionTop}>
              <Text style={m.optionEmoji}>🏖️</Text>
              <Text style={[m.optionTitle, choice === 'vacation' && m.optionTitleActive]}>
                {t('aiCoach.recovery.vacationTitle')}
              </Text>
              {choice === 'vacation' && <Text style={m.optionCheck}>✓</Text>}
            </View>
            <Text style={m.optionDesc}>{t('aiCoach.recovery.vacationDesc')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={m.footer}>
          <TouchableOpacity
            style={[m.saveBtn, (!choice || busy) && m.saveBtnDisabled]}
            onPress={() => choice && onConfirm(choice)}
            disabled={!choice || busy}
          >
            {busy
              ? <ActivityIndicator color={palette.white} />
              : <Text style={m.saveBtnText}>{t('aiCoach.recovery.confirm')}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Active-window banner ─────────────────────────────────────────────────────

export const RecoveryBanner: React.FC<{
  status: RecoveryWeekStatus;
  onEnd: () => void;
  rounded?: boolean;
}> = ({ status, onEnd, rounded }) => {
  const { t } = useTranslation();
  const dateStr = new Date(`${status.until}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const isVacation = status.mode === 'vacation';
  const weekSuffix = status.resumeWeek != null && !isVacation
    ? t('aiCoach.recovery.resumeWeekSuffix', { week: status.resumeWeek })
    : '';

  return (
    <TouchableOpacity style={[b.banner, rounded && b.bannerRounded]} onPress={onEnd}>
      <View style={b.left}>
        <Text style={b.emoji}>{isVacation ? '🏖️' : '🛟'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={b.title}>
            {isVacation ? t('aiCoach.recovery.bannerVacation') : t('aiCoach.recovery.bannerRecovery')}
          </Text>
          <Text style={b.sub}>
            {isVacation
              ? t('aiCoach.recovery.bannerVacationSub', { date: dateStr })
              : t('aiCoach.recovery.bannerRecoverySub', { date: dateStr, week: weekSuffix })}
          </Text>
        </View>
      </View>
      <Text style={b.end}>{t('aiCoach.recovery.end')}</Text>
    </TouchableOpacity>
  );
};

// ─── Self-contained card (Workouts tab) ───────────────────────────────────────
//
// Fetches its own status on focus, renders either the active-window banner or an
// action card that opens the modal. After a recovery trigger it regenerates the
// plan fire-and-forget so a stale heavy session can't be served; the window is
// active server-side either way.

export const RecoveryWeekCard: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RecoveryWeekStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      aiCoachService.getPlan()
        .then((p) => { if (alive) { setStatus(p.recoveryWeek ?? null); setLoaded(true); } })
        .catch(() => { if (alive) setLoaded(true); });
      return () => { alive = false; };
    }, []),
  );

  const handleTrigger = async (mode: 'recovery' | 'vacation') => {
    setBusy(true);
    try {
      const res = await aiCoachService.triggerRecoveryWeek(mode);
      setStatus({ mode: res.mode, until: res.until, resumeWeek: res.resumeWeek });
      setModalVisible(false);
      const dateStr = new Date(`${res.until}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (mode === 'vacation') {
        Alert.alert(t('aiCoach.recovery.vacationOnTitle'), t('aiCoach.recovery.vacationOnMsg', { date: dateStr }));
      } else {
        Alert.alert(t('aiCoach.recovery.recoveryOnTitle'), t('aiCoach.recovery.recoveryOnMsg', { date: dateStr }));
        aiCoachService.generatePlan().catch(() => {});
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      Alert.alert('Error', String(Array.isArray(msg) ? msg.join('\n') : msg ?? t('aiCoach.recovery.error')));
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = () => {
    Alert.alert(t('aiCoach.recovery.endTitle'), t('aiCoach.recovery.endMsg'), [
      { text: t('aiCoach.recovery.keep'), style: 'cancel' },
      {
        text: t('aiCoach.recovery.endConfirm'),
        onPress: async () => {
          try {
            await aiCoachService.cancelRecoveryWeek();
            setStatus(null);
          } catch {
            Alert.alert('Error', t('aiCoach.recovery.error'));
          }
        },
      },
    ]);
  };

  if (!loaded) return null;

  return (
    <>
      <RecoveryModal
        visible={modalVisible}
        busy={busy}
        onConfirm={handleTrigger}
        onClose={() => setModalVisible(false)}
      />
      {status ? (
        <RecoveryBanner status={status} onEnd={handleEnd} rounded />
      ) : (
        <Card variant="row" gap={14} borderColor={theme.colors.cardElevated} style={c.cardSpacing} onPress={() => setModalVisible(true)}>
          <View style={c.iconWrap}>
            <Lifebuoy size={22} weight="fill" color={palette.teal[300]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={c.title}>{t('aiCoach.recovery.cardTitle')}</Text>
            <Text style={c.sub}>{t('aiCoach.recovery.cardSub')}</Text>
          </View>
          <ArrowRight size={18} weight="bold" color={palette.gray[500]} />
        </Card>
      )}
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 16, fontWeight: '700', color: palette.white },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: palette.gray[400] },
  intro: { fontSize: 14, color: palette.gray[400], lineHeight: 21, marginBottom: 20 },
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
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: palette.gray[800] },
  saveBtn: {
    backgroundColor: palette.brand[600], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
});

const b = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: palette.teal[950],
    borderBottomWidth: 1, borderBottomColor: palette.teal[700],
  },
  bannerRounded: {
    borderRadius: 16, borderWidth: 1, borderColor: palette.teal[700],
    paddingVertical: 14, marginBottom: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  emoji: { fontSize: 18 },
  title: { fontSize: 13, fontWeight: '700', color: palette.teal[300] },
  sub: { fontSize: 11, color: palette.gray[400], marginTop: 1 },
  end: { fontSize: 13, color: palette.gray[500], fontWeight: '600', marginLeft: 8 },
});

const c = StyleSheet.create({
  cardSpacing: { marginBottom: 10 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: alpha(palette.teal[700], 0.2),
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: palette.white, marginBottom: 2 },
  sub: { fontSize: 12, color: palette.gray[400] },
});
