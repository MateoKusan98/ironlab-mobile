import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { aiCoachService } from '../../services/ai-coach.service';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '@shared';
import { MagnifyingGlass, Gear, Robot, Trophy, ChartBar } from 'phosphor-react-native';

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
  injuries: Array<{ id: string; exerciseName: string | null; description: string }>;
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
  injuries: Array<{ id: string; exerciseName: string | null; description: string }>;
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
  const monthOptions: Array<{ label: string; date: Date }> = [];
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
  const bg = urgency === 'critical' ? '#7f1d1d' : urgency === 'high' ? '#431407' : '#1c1917';
  const border = urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#ea580c' : '#57534e';

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
  const [loading, setLoading] = useState(true);
  const [regenUsedToday, setRegenUsedToday] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [compDate, setCompDate] = useState<string | null>(null);
  const [compType, setCompType] = useState<string | null>(null);
  const [compModalVisible, setCompModalVisible] = useState(false);
  const [activeInjuries, setActiveInjuries] = useState<Array<{ id: string; exerciseName: string | null; description: string }>>([]);
  const [injuryHandling, setInjuryHandling] = useState<string | null>(null);
  const [injuryModalVisible, setInjuryModalVisible] = useState(false);
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

    // Load existing plan — no auto-generation here
    aiCoachService.getPlan()
      .then(({ plan: p, generatedAt: ga, competitionDate: cd, competitionType: ct, activeInjuries: ai, injuryHandling: ih }) => {
        setCompDate(cd);
        setCompType(ct);
        setActiveInjuries(ai ?? []);
        setInjuryHandling(ih);
        setPlan(p);
        setGeneratedAt(ga);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      // Auto-regenerate so the new protocol is applied immediately
      setGenerating(true);
      const newPlan = await aiCoachService.generatePlan();
      setPlan(newPlan);
      setGeneratedAt(new Date().toISOString());
    } catch {
      Alert.alert('Error', 'Could not save injury preference.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (regenUsedToday) {
      Alert.alert(t('aiCoach.regenLimitTitle'), t('aiCoach.regenLimitMsg'));
      return;
    }
    setGenerating(true);
    try {
      const newPlan = await aiCoachService.generatePlan();
      setPlan(newPlan);
      setGeneratedAt(new Date().toISOString());
      await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
      setRegenUsedToday(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
      Alert.alert('Could not generate plan', String(Array.isArray(msg) ? msg.join('\n') : msg));
    } finally {
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

  if (generating || !plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.generatingContainer}>
          <Robot size={56} weight="fill" color={palette.brand[400]} style={{ marginBottom: 16 }} />
          {generating ? (
            <>
              <Text style={styles.generatingTitle}>{t('aiCoach.generating')}</Text>
              <Text style={styles.generatingSubtitle}>{t('aiCoach.buildingWorkout')}</Text>
              <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 24 }} size="large" />
            </>
          ) : (
            <>
              <Text style={styles.generatingTitle}>{t('aiCoach.noSession')}</Text>
              <Text style={styles.generatingSubtitle}>{t('aiCoach.startSessionFirst')}</Text>
              <TouchableOpacity style={styles.generateBtn} onPress={() => navigation.navigate('StartSession', {})}>
                <Text style={styles.generateBtnText}>{t('aiCoach.startWorkoutBtn')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

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
          onPress={handleGenerate}
          disabled={generating || regenUsedToday}
        >
          <Text style={[styles.regenBtnText, regenUsedToday && styles.regenBtnTextDisabled]}>
            {regenUsedToday ? t('aiCoach.regenUsed') : t('aiCoach.newPlan')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Injury banner — shown whenever there are active injuries */}
      {activeInjuries.length > 0 && (
        <InjuryBanner
          injuries={activeInjuries}
          handling={injuryHandling}
          onPress={() => setInjuryModalVisible(true)}
        />
      )}

      {/* Competition countdown banner or "set date" nudge */}
      {compDate ? (
        <CompBanner compDate={compDate} compType={compType} onPress={() => setCompModalVisible(true)} />
      ) : (
        <TouchableOpacity style={styles.setCompRow} onPress={() => setCompModalVisible(true)}>
          <Text style={styles.setCompText}>{t('aiCoach.setCompDate')}</Text>
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

  generatingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  generatingIcon: { fontSize: 56, marginBottom: 20 },
  generatingTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 10, lineHeight: 32 },
  generatingSubtitle: { fontSize: 14, color: palette.gray[400], textAlign: 'center', lineHeight: 20 },
  generateBtn: {
    marginTop: 32, backgroundColor: palette.brand[600],
    borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16,
  },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: theme.colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  headerSub: { fontSize: 11, color: palette.gray[500], marginTop: 1 },
  debugBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: palette.gray[800], alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  debugBtnText: { fontSize: 16 },
  regenBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: palette.gray[700],
  },
  regenBtnDisabled: { borderColor: palette.gray[800], opacity: 0.45 },
  regenBtnText: { fontSize: 12, color: palette.gray[400], fontWeight: '600' },
  regenBtnTextDisabled: { color: palette.gray[600] },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },


  footer: {
    padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: palette.gray[800],
  },
  startBtn: {
    backgroundColor: palette.brand[600], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
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
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: palette.gray[400] },
  scroll: { flex: 1 },
  layerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  layerHeaderOpen: { backgroundColor: palette.gray[900] },
  layerLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  layerChevron: { fontSize: 11, color: palette.gray[400], fontWeight: '600' },
  layerChevronEmpty: { color: palette.gray[700] },
  layerBody: {
    backgroundColor: palette.gray[950] ?? '#0a0a0a',
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
  emoji: { fontSize: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 11, color: palette.gray[400], marginTop: 1 },
  edit: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },
});

const comp = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
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
  typeBtnTextActive: { color: '#fff' },

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
  quickBtnTextActive: { color: '#fff' },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  monthRowActive: { backgroundColor: palette.gray[800] },
  monthLabel: { fontSize: 14, color: palette.gray[300] },
  monthLabelActive: { color: '#fff', fontWeight: '700' },
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
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  clearBtn: { alignItems: 'center', paddingVertical: 10 },
  clearBtnText: { fontSize: 13, color: palette.gray[500] },
});

const inj = StyleSheet.create({
  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1c1009',
    borderBottomWidth: 1, borderBottomColor: '#92400e',
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerEmoji: { fontSize: 18 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#fbbf24' },
  bannerSub: { fontSize: 11, color: palette.gray[500], marginTop: 1 },
  bannerEdit: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },

  // Modal
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
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
  injuryDot: { fontSize: 14, color: '#fbbf24', marginTop: 1 },
  injuryExercise: { fontSize: 13, fontWeight: '700', color: '#fbbf24', marginBottom: 2 },
  injuryDesc: { fontSize: 13, color: palette.gray[300], lineHeight: 18 },

  optionCard: {
    borderRadius: 12, borderWidth: 1, borderColor: palette.gray[700],
    padding: 16, marginBottom: 12,
  },
  optionCardActive: { borderColor: palette.brand[500], backgroundColor: '#1a0e05' },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  optionEmoji: { fontSize: 20 },
  optionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: palette.gray[300] },
  optionTitleActive: { color: '#fff' },
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
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
