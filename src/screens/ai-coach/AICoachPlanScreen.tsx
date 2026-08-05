import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { aiCoachService, RecoveryWeekStatus, FatigueStatus, FatigueLevel, CoachNote, PrForecast } from '../../services/ai-coach.service';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '@shared';
import { MagnifyingGlass, Trophy, ChartBar } from 'phosphor-react-native';
import { FitnessQuiz } from '../../components/ui/FitnessQuiz';
import { RecoveryModal, RecoveryBanner } from '../../components/ui/RecoveryWeekControl';
import { PRForecastCard } from '../../components/ui/PRForecastCard';

import { apiErrorMessage, apiErrorStatus } from '../../utils/apiError';
type NavProp = NativeStackNavigationProp<RootStackParamList, 'AICoachPlan'>;


type DebugLayer = { key: string; label: string; content: string | null };

const LAYER_LABELS: Record<string, string> = {
  athleteCtx:    'Athlete Profile',
  memoryCtx:     'Coaching Memory',
  behavioralCtx: 'Behavioral Analytics',
  phaseCtx:      'Programming Phase',
  fatigueCtx:    'Fatigue Signal',
  big3Ctx:       'Big 3 Distribution',
  calendarCtx:   'Training Calendar',
  progressCtx:   'Progression Analysis',
  volumeCtx:     'Weekly Volume',
  exIntelCtx:    'Exercise Intelligence',
};

const DebugModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [layers, setLayers] = useState<DebugLayer[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>('big3Ctx');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    aiCoachService.getDebugPrompt()
      .then(({ layers: l, systemPrompt: sp }) => {
        setSystemPrompt(sp);
        setLayers(
          Object.entries(l).map(([key, content]) => ({
            key,
            label: LAYER_LABELS[key] ?? key,
            content: content as string | null,
          }))
        );
      })
      .catch(() => Alert.alert('Error', 'Could not load debug prompt'))
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={dbg.container}>
        <View style={dbg.header}>
          <Text style={dbg.title}>Prompt Debug</Text>
          <TouchableOpacity onPress={onClose} style={dbg.closeBtn}>
            <Text style={dbg.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={dbg.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* System prompt */}
            <TouchableOpacity
              style={[dbg.layerHeader, openKey === '__system__' && dbg.layerHeaderOpen]}
              onPress={() => setOpenKey(openKey === '__system__' ? null : '__system__')}
            >
              <Text style={dbg.layerLabel}>System Prompt</Text>
              <Text style={dbg.layerChevron}>{openKey === '__system__' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {openKey === '__system__' && (
              <View style={dbg.layerBody}>
                <Text style={dbg.layerText}>{systemPrompt}</Text>
              </View>
            )}

            {/* Context layers */}
            {layers.map(({ key, label, content }) => (
              <View key={key}>
                <TouchableOpacity
                  style={[dbg.layerHeader, openKey === key && dbg.layerHeaderOpen]}
                  onPress={() => setOpenKey(openKey === key ? null : key)}
                >
                  <Text style={dbg.layerLabel}>{label}</Text>
                  <Text style={[dbg.layerChevron, !content && dbg.layerChevronEmpty]}>
                    {!content ? 'empty' : openKey === key ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {openKey === key && content && (
                  <View style={dbg.layerBody}>
                    <Text style={dbg.layerText}>{content}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ─── Injury Modal ─────────────────────────────────────────────────────────────

const InjuryModal: React.FC<{
  visible: boolean;
  injuries: { id: string; exerciseName: string | null; description: string }[];
  currentHandling: string | null;
  onSave: (handling: 'replace' | 'remove' | 'reduce') => void;
  onClose: () => void;
}> = ({ visible, injuries, currentHandling, onSave, onClose }) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<'replace' | 'remove' | 'reduce' | null>(
    (currentHandling as 'replace' | 'remove' | 'reduce') ?? null,
  );

  useEffect(() => {
    if (visible) setChoice((currentHandling as 'replace' | 'remove' | 'reduce') ?? null);
  }, [visible, currentHandling]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={inj.container}>
        <View style={inj.header}>
          <Text style={inj.title}>{t('aiCoach.injuryHandling')}</Text>
          <TouchableOpacity onPress={onClose} style={inj.closeBtn}>
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
            </View>
          ))}

          <Text style={[inj.sectionLabel, { marginTop: 24 }]}>How should M-7EO handle these?</Text>

          <TouchableOpacity
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

const InjuryBanner: React.FC<{
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
    <TouchableOpacity style={inj.banner} onPress={onPress}>
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

// ─── Competition Date Modal ───────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUICK_WEEKS = [4, 8, 12, 16, 20, 24];

function addWeeks(n: number): Date {
  return new Date(Date.now() + n * 7 * 86_400_000);
}

const CompDateModal: React.FC<{
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
          <TouchableOpacity onPress={onClose} style={comp.closeBtn}>
            <Text style={comp.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={comp.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Type toggle */}
          <Text style={comp.sectionLabel}>Event type</Text>
          <View style={comp.typeRow}>
            <TouchableOpacity
              style={[comp.typeBtn, type === 'meet' && comp.typeBtnActive]}
              onPress={() => setType('meet')}
            >
              <Text style={[comp.typeBtnText, type === 'meet' && comp.typeBtnTextActive]}>{t('aiCoach.competition.meet')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
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
            style={[comp.saveBtn, !selectedDate && comp.saveBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedDate}
          >
            <Text style={comp.saveBtnText}>{t('aiCoach.competition.saveUpdate')}</Text>
          </TouchableOpacity>

          {currentDate && (
            <TouchableOpacity style={comp.clearBtn} onPress={onClear}>
              <Text style={comp.clearBtnText}>{t('aiCoach.competition.removeDate')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Competition Banner ───────────────────────────────────────────────────────

const CompBanner: React.FC<{
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
    <TouchableOpacity style={[banner.wrap, { backgroundColor: bg, borderColor: border }]} onPress={onPress}>
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

// ─── Fatigue status (recovery) ────────────────────────────────────────────────

const FATIGUE_META: Record<FatigueLevel, { color: string; bg: string; border: string; emoji: string; label: string }> = {
  none:     { color: palette.success[400], bg: theme.surfaceTint.success, border: palette.success[800], emoji: '🟢', label: 'Recovered' },
  mild:     { color: palette.lime[400], bg: theme.surfaceTint.lime, border: palette.lime[800], emoji: '🟢', label: 'Mostly fresh' },
  elevated: { color: palette.warning[400], bg: theme.surfaceTint.warning, border: palette.warning[800], emoji: '🟡', label: 'Elevated fatigue' },
  high:     { color: palette.error[400], bg: theme.surfaceTint.error, border: palette.error[800], emoji: '🔴', label: 'High fatigue' },
};

const FatigueBanner: React.FC<{ status: FatigueStatus; onPress: () => void }> = ({ status, onPress }) => {
  const m = FATIGUE_META[status.level];
  const sub = status.scheduledDeload
    ? 'Scheduled deload — planned recovery'
    : status.dismissed
    ? "You cleared this — feeling fine"
    : status.canDismiss
    ? 'Tap to review or clear it'
    : 'Recovery looks good';
  return (
    <TouchableOpacity style={[fat.banner, { backgroundColor: m.bg, borderBottomColor: m.border }]} onPress={onPress}>
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

const FatigueModal: React.FC<{
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
            <TouchableOpacity style={fat.taperBtn} onPress={onTaper} disabled={busy}>
              {busy ? <ActivityIndicator color={palette.white} /> : <Text style={fat.taperBtnText}>Start the taper — keep the peak</Text>}
            </TouchableOpacity>
          )}
          {/* With a taper on offer the taper is the primary action, so "clear it" drops
              to the secondary style — one primary button per screen. */}
          {status.canDismiss && (
            <TouchableOpacity
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
            <TouchableOpacity style={fat.resumeBtn} onPress={onResume} disabled={busy}>
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

// ─── Coach notes ("remember this about me") ───────────────────────────────────

const NotesModal: React.FC<{
  visible: boolean;
  notes: CoachNote[];
  busy: boolean;
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ visible, notes, busy, onAdd, onDelete, onClose }) => {
  const [text, setText] = useState('');
  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    onAdd(trimmed);
    setText('');
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={fat.container} edges={['top']}>
        <View style={fat.header}>
          <Text style={fat.title}>Coach memory</Text>
          <TouchableOpacity style={fat.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={fat.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={fat.scroll} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={fat.intro}>Tell your coach anything worth remembering — how you like to train, what to avoid, a niggle. Write it however you want; I'll save it in my own words.</Text>

          <View style={fat.noteInputRow}>
            <TextInput
              style={fat.noteInput}
              placeholder='e.g. "big weights feel good for me"'
              placeholderTextColor={palette.gray[600]}
              value={text}
              onChangeText={setText}
              maxLength={500}
              multiline
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={submit}
            />
            <TouchableOpacity style={[fat.noteAddBtn, (busy || text.trim().length < 2) && fat.noteAddBtnDisabled]} onPress={submit} disabled={busy || text.trim().length < 2}>
              {busy ? <ActivityIndicator color={palette.white} /> : <Text style={fat.noteAddBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>

          {notes.length > 0 && <Text style={fat.sectionLabel}>What I'm remembering</Text>}
          {notes.map((n) => (
            <View key={n.id} style={fat.noteCard}>
              <View style={{ flex: 1 }}>
                <Text style={fat.noteCat}>{n.category.replace(/_/g, ' ')}{n.exerciseName ? ` · ${n.exerciseName}` : ''}{n.autoGenerated ? ' · observed' : ''}</Text>
                <Text style={fat.noteDesc}>{n.description}</Text>
              </View>
              <TouchableOpacity style={fat.noteDelBtn} onPress={() => onDelete(n.id)} accessibilityRole="button" accessibilityLabel={`Delete note: ${n.description}`}>
                <Text style={fat.noteDelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {notes.length === 0 && <Text style={fat.emptyNote}>Nothing saved yet.</Text>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const REGEN_DATE_KEY = '@ironlab_regen_date';

export const AICoachPlanScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ROLE_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;
  const [plan, setPlan] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // True once the new plan has come back but the quiz is still up — lets the
  // user finish the question they're on before the plan is revealed.
  const [planReady, setPlanReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenUsedToday, setRegenUsedToday] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [compDate, setCompDate] = useState<string | null>(null);
  const [compType, setCompType] = useState<string | null>(null);
  const [compModalVisible, setCompModalVisible] = useState(false);
  const [activeInjuries, setActiveInjuries] = useState<{ id: string; exerciseName: string | null; description: string }[]>([]);
  const [injuryHandling, setInjuryHandling] = useState<string | null>(null);
  const [injuryModalVisible, setInjuryModalVisible] = useState(false);
  const [recoveryWeek, setRecoveryWeek] = useState<RecoveryWeekStatus | null>(null);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenNote, setRegenNote] = useState('');
  const [fatigue, setFatigue] = useState<FatigueStatus | null>(null);
  const [prForecast, setPrForecast] = useState<PrForecast | null>(null);
  const [fatigueModalVisible, setFatigueModalVisible] = useState(false);
  const [fatigueBusy, setFatigueBusy] = useState(false);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Pulsing dots while generating
  useEffect(() => {
    if (generating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [generating]);

  useEffect(() => {
    if (!user?.isAICoachSetupComplete) {
      navigation.replace('AICoachWelcome');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if manual regen was already used today
    AsyncStorage.getItem(REGEN_DATE_KEY).then((d) => {
      if (d === today) setRegenUsedToday(true);
    }).catch(() => {});

    aiCoachService.getPlan()
      .then(({ plan: p, generatedAt: ga, competitionDate: cd, competitionType: ct, activeInjuries: ai, injuryHandling: ih, recoveryWeek: rw }) => {
        setCompDate(cd);
        setCompType(ct);
        setActiveInjuries(ai ?? []);
        setInjuryHandling(ih);
        setRecoveryWeek(rw ?? null);
        setPlan(p);
        setGeneratedAt(ga);
        if (!p) navigation.replace('StartSession', {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    aiCoachService.fatigueCheck().then(setFatigue).catch(() => {});
    aiCoachService.prForecast().then(setPrForecast).catch(() => {});
    aiCoachService.getNotes().then(setNotes).catch(() => {});
  }, []);

  // Refresh the session + recovery status whenever the screen regains focus — the
  // athlete may have adjusted a load or cleared fatigue over in the coach chat.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      aiCoachService.getPlan()
        .then(({ plan: p, generatedAt: ga }) => { if (!cancelled) { setPlan(p); setGeneratedAt(ga); } })
        .catch(() => {});
      aiCoachService.fatigueCheck().then((f) => { if (!cancelled) setFatigue(f); }).catch(() => {});
      // Refetched on focus alongside fatigue: a session logged elsewhere can settle an
      // open forecast, and a stale "PR ON" card is the one error worth never shipping.
      aiCoachService.prForecast().then((f) => { if (!cancelled) setPrForecast(f); }).catch(() => {});
      return () => { cancelled = true; };
    }, []),
  );

  const handleDismissFatigue = async () => {
    setFatigueBusy(true);
    try {
      setFatigue(await aiCoachService.dismissFatigue());
    } catch (e: unknown) {
      Alert.alert('Not available', apiErrorMessage(e, 'Could not clear your fatigue status.'));
    } finally {
      setFatigueBusy(false);
    }
  };

  const handleResumeFatigue = async () => {
    setFatigueBusy(true);
    try {
      setFatigue(await aiCoachService.resumeFatigue());
    } catch {
      Alert.alert('Error', 'Could not update your recovery status.');
    } finally {
      setFatigueBusy(false);
    }
  };

  const handleAddNote = async (text: string) => {
    setNotesBusy(true);
    try {
      await aiCoachService.addNote(text);
      setNotes(await aiCoachService.getNotes());
    } catch {
      Alert.alert('Error', 'Could not save your note. Try again.');
    } finally {
      setNotesBusy(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id)); // optimistic
    try {
      await aiCoachService.deleteNote(id);
    } catch {
      setNotes(prev);
      Alert.alert('Error', 'Could not delete that note.');
    }
  };

  const handleSaveCompDate = async (date: string, type: 'meet' | 'pr_test') => {
    try {
      await aiCoachService.setCompetitionDate(date, type);
      setCompDate(date);
      setCompType(type);
      setCompModalVisible(false);
      Alert.alert('Saved', 'Competition date set. Regenerate your plan to apply the new phase.');
    } catch {
      Alert.alert('Error', 'Could not save competition date.');
    }
  };

  const handleClearCompDate = async () => {
    try {
      await aiCoachService.clearCompetitionDate();
      setCompDate(null);
      setCompType(null);
      setCompModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not clear competition date.');
    }
  };

  const handleSaveInjuryPreference = async (handling: 'replace' | 'remove' | 'reduce') => {
    try {
      await aiCoachService.setInjuryPreference(handling);
      setInjuryHandling(handling);
      setInjuryModalVisible(false);
      setPlanReady(false);
      setGenerating(true);
      const newPlan = await aiCoachService.generatePlan();
      setPlan(newPlan);
      setGeneratedAt(new Date().toISOString());
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
      setRegenUsedToday(true);
      setPlanReady(true);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      if (status === 429) {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
        setRegenUsedToday(true);
      }
      Alert.alert('Error', 'Could not save injury preference.');
      setGenerating(false);
    }
  };

  const handleTriggerRecovery = async (mode: 'recovery' | 'vacation' | 'taper') => {
    setRecoveryBusy(true);
    try {
      const res = await aiCoachService.triggerRecoveryWeek(mode);
      setRecoveryWeek({ mode: res.mode, until: res.until, resumeWeek: res.resumeWeek });
      setRecoveryModalVisible(false);
      const dateStr = new Date(`${res.until}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (mode === 'vacation') {
        Alert.alert(t('aiCoach.recovery.vacationOnTitle'), t('aiCoach.recovery.vacationOnMsg', { date: dateStr }));
      } else {
        if (mode === 'taper') {
          // The server warns when the signal is too deep for a taper to fix — say so
          // before regenerating, since the peak session may still come back clamped.
          Alert.alert(
            res.fatigueWarning ? t('aiCoach.recovery.taperWarningTitle') : t('aiCoach.recovery.taperOnTitle'),
            res.fatigueWarning ?? t('aiCoach.recovery.taperOnMsg', { date: dateStr }),
          );
        }
        // The window suppresses the alarm's recommendation server-side — pull the fresh
        // status so the banner stops offering a taper that is now running.
        aiCoachService.fatigueCheck().then(setFatigue).catch(() => {});
        // Swap today's stale plan for one that matches the new window right away.
        setPlanReady(false);
        setGenerating(true);
        try {
          const newPlan = await aiCoachService.generatePlan();
          setPlan(newPlan);
          setGeneratedAt(new Date().toISOString());
          setPlanReady(true);
        } catch {
          // Throttled or offline — the recovery window is active server-side either
          // way; the next generated session will come out light.
          setGenerating(false);
        }
      }
    } catch (err: unknown) {
      Alert.alert('Error', apiErrorMessage(err, t('aiCoach.recovery.error')));
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleEndRecovery = () => {
    Alert.alert(t('aiCoach.recovery.endTitle'), t('aiCoach.recovery.endMsg'), [
      { text: t('aiCoach.recovery.keep'), style: 'cancel' },
      {
        text: t('aiCoach.recovery.endConfirm'),
        onPress: async () => {
          try {
            await aiCoachService.cancelRecoveryWeek();
            setRecoveryWeek(null);
          } catch {
            Alert.alert('Error', t('aiCoach.recovery.error'));
          }
        },
      },
    ]);
  };

  const handleGenerate = async (note?: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (regenUsedToday) {
      Alert.alert(t('aiCoach.regenLimitTitle'), t('aiCoach.regenLimitMsg'));
      return;
    }
    setShowRegenInput(false);
    setRegenNote('');
    setPlanReady(false);
    setGenerating(true);
    try {
      const newPlan = await aiCoachService.generatePlan(undefined, note?.trim() || undefined);
      setPlan(newPlan);
      setGeneratedAt(new Date().toISOString());
      await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
      setRegenUsedToday(true);
      setPlanReady(true);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      if (status === 429) {
        await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
        setRegenUsedToday(true);
      }
      Alert.alert('Could not generate plan', apiErrorMessage(err, 'Unknown error'));
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (generating) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FitnessQuiz
          loading={!planReady}
          title={t('aiCoach.generating')}
          subtitle={t('aiCoach.buildingWorkout')}
          onFinish={() => {
            setGenerating(false);
            setPlanReady(false);
          }}
        />
      </SafeAreaView>
    );
  }

  if (!plan) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DebugModal visible={debugVisible} onClose={() => setDebugVisible(false)} />
      <InjuryModal
        visible={injuryModalVisible}
        injuries={activeInjuries}
        currentHandling={injuryHandling}
        onSave={handleSaveInjuryPreference}
        onClose={() => setInjuryModalVisible(false)}
      />
      <CompDateModal
        visible={compModalVisible}
        currentDate={compDate}
        currentType={compType}
        onSave={handleSaveCompDate}
        onClear={handleClearCompDate}
        onClose={() => setCompModalVisible(false)}
      />
      <RecoveryModal
        visible={recoveryModalVisible}
        busy={recoveryBusy}
        onConfirm={handleTriggerRecovery}
        onClose={() => setRecoveryModalVisible(false)}
      />
      <FatigueModal
        visible={fatigueModalVisible}
        status={fatigue}
        busy={fatigueBusy}
        onDismiss={handleDismissFatigue}
        onResume={handleResumeFatigue}
        onTaper={() => { setFatigueModalVisible(false); handleTriggerRecovery('taper'); }}
        onClose={() => setFatigueModalVisible(false)}
      />
      <NotesModal
        visible={notesModalVisible}
        notes={notes}
        busy={notesBusy}
        onAdd={handleAddNote}
        onDelete={handleDeleteNote}
        onClose={() => setNotesModalVisible(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('aiCoach.todaysSession')}</Text>
          {generatedAt && (
            <Text style={styles.headerSub}>
              Ready since {new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.debugBtn} onPress={() => setDebugVisible(true)}>
            <MagnifyingGlass size={18} weight="bold" color={palette.gray[400]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.regenBtn, regenUsedToday && styles.regenBtnDisabled]}
          onPress={() => {
            if (regenUsedToday) {
              Alert.alert(t('aiCoach.regenLimitTitle'), t('aiCoach.regenLimitMsg'));
              return;
            }
            setShowRegenInput(s => !s);
            if (showRegenInput) setRegenNote('');
          }}
          disabled={generating || regenUsedToday}
        >
          <Text style={[styles.regenBtnText, regenUsedToday && styles.regenBtnTextDisabled]}>
            {regenUsedToday ? t('aiCoach.regenUsed') : showRegenInput ? t('aiCoach.regenCancel') : t('aiCoach.newPlan')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Regen note input — shown when user taps New Plan */}
      {showRegenInput && !regenUsedToday && (
        <View style={styles.noteRow}>
          <TextInput
            style={styles.noteInput}
            placeholder={t('aiCoach.regenNotePlaceholder')}
            placeholderTextColor={palette.gray[600]}
            value={regenNote}
            onChangeText={setRegenNote}
            maxLength={200}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => handleGenerate(regenNote)}
          />
          <TouchableOpacity
            style={styles.noteGenerateBtn}
            onPress={() => handleGenerate(regenNote)}
            disabled={generating}
          >
            <Text style={styles.noteGenerateBtnText}>{t('aiCoach.regenConfirm')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recovery / fatigue status — always visible so the athlete can manage it */}
      {fatigue && (
        <FatigueBanner status={fatigue} onPress={() => setFatigueModalVisible(true)} />
      )}

      {/* PR forecast. Sits directly under the fatigue banner because the two answer
          the same question from opposite ends — "should I back off?" and "is it on?" —
          and reading them apart is how an athlete talks themselves into a tired max. */}
      <PRForecastCard forecast={prForecast} />


      {/* Injury banner — shown whenever there are active injuries */}
      {activeInjuries.length > 0 && (
        <InjuryBanner
          injuries={activeInjuries}
          handling={injuryHandling}
          onPress={() => setInjuryModalVisible(true)}
        />
      )}

      {/* Coach memory — free-form notes the athlete wants the coach to remember */}
      <TouchableOpacity style={styles.setCompRow} onPress={() => setNotesModalVisible(true)}>
        <Text style={styles.setCompText}>
          🧠 Coach memory{notes.length > 0 ? ` (${notes.length})` : ' — tell me what to remember'}
        </Text>
        <Text style={styles.setCompArrow}>›</Text>
      </TouchableOpacity>

      {/* Competition countdown banner or "set date" nudge */}
      {compDate ? (
        <CompBanner compDate={compDate} compType={compType} onPress={() => setCompModalVisible(true)} />
      ) : (
        <TouchableOpacity style={styles.setCompRow} onPress={() => setCompModalVisible(true)}>
          <Text style={styles.setCompText}>{t('aiCoach.setCompDate')}</Text>
          <Text style={styles.setCompArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Recovery week / vacation — active banner or entry row */}
      {recoveryWeek ? (
        <RecoveryBanner status={recoveryWeek} onEnd={handleEndRecovery} />
      ) : (
        <TouchableOpacity style={styles.setCompRow} onPress={() => setRecoveryModalVisible(true)}>
          <Text style={styles.setCompText}>{t('aiCoach.recovery.entry')}</Text>
          <Text style={styles.setCompArrow}>›</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.navigate('StartSession', { plan: plan ?? undefined })}
        >
          <Text style={styles.startBtnText}>{t('aiCoach.startWorkout')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => navigation.navigate('AICoachChat', {})}
        >
          <Text style={styles.chatBtnText}>{t('aiCoach.askMrEO')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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

const dbg = StyleSheet.create({
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
  layerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  layerHeaderOpen: { backgroundColor: palette.gray[900] },
  layerLabel: { fontSize: 13, fontWeight: '700', color: palette.white },
  layerChevron: { fontSize: 11, color: palette.gray[400], fontWeight: '600' },
  layerChevronEmpty: { color: palette.gray[700] },
  layerBody: {
    backgroundColor: palette.gray[950] ?? palette.gray[900],
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  layerText: { fontSize: 11, color: palette.gray[300], fontFamily: 'Courier', lineHeight: 17 },
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

const fat = StyleSheet.create({
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
