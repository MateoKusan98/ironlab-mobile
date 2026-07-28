import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { useTranslation } from 'react-i18next';
import { useExerciseName } from '../../hooks/useExerciseName';
import { sessionService, WorkoutSession } from '../../services/session.service';
import { projectSessionPoints } from '../../services/badges.service';
import { aiCoachService } from '../../services/ai-coach.service';
import { useBadgeCelebration } from '../../contexts/BadgeCelebrationContext';
import { Moon, Minus, ThumbsUp, Fire, Lightning, Trophy, Check, Sparkle, Copy, ShareNetwork } from 'phosphor-react-native';
import { LANGUAGES } from '../../i18n';

import { Card } from '../../components/ui';
type SummaryRouteProp = RouteProp<RootStackParamList, 'SessionSummary'>;

const MOOD_VALUES = ['tired', 'neutral', 'good', 'great', 'elite'] as const;
const MOOD_ICONS: Record<string, React.ReactElement> = {
  tired:   <Moon size={24} weight="fill" color={palette.coolGray[500]} />,
  neutral: <Minus size={24} weight="bold" color={palette.coolGray[400]} />,
  good:    <ThumbsUp size={24} weight="fill" color={palette.brand[500]} />,
  great:   <Fire size={24} weight="fill" color={palette.error[500]} />,
  elite:   <Lightning size={24} weight="fill" color={palette.yellow[500]} />,
};

export const SessionSummaryScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { exName } = useExerciseName();
  const MOODS = MOOD_VALUES.map((v) => ({ icon: MOOD_ICONS[v], value: v, name: t(`session.moods.${v}`) }));
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SummaryRouteProp>();
  const { sessionId, durationMinutes, prs } = route.params;
  const { refresh: refreshBadges } = useBadgeCelebration();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('good');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Final duration sent to the backend — editable in case the clock ran long
  // (e.g. the workout was left open). Seeded from the active screen's value.
  const [duration, setDuration] = useState(durationMinutes);
  const [editingDuration, setEditingDuration] = useState(false);
  const [editH, setEditH] = useState('');
  const [editM, setEditM] = useState('');

  // ── Social-media share captions ──────────────────────────────────────────
  type CaptionStyle = 'hype' | 'clean' | 'funny';
  const CAPTION_STYLES: { key: CaptionStyle; label: string }[] = [
    { key: 'hype', label: 'Hype' },
    { key: 'clean', label: 'Clean' },
    { key: 'funny', label: 'Funny' },
  ];
  // The app's current language and its English name (for the AI prompt). The
  // EN ⇄ local toggle only makes sense when the app isn't already in English.
  const localLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];
  const showLangToggle = localLang.code !== 'en';
  const aiNameFor = (code: string) => LANGUAGES.find((l) => l.code === code)?.aiName ?? 'English';

  const [captions, setCaptions] = useState<Record<CaptionStyle, string> | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('hype');
  const [captionLang, setCaptionLang] = useState(i18n.language);
  const [copied, setCopied] = useState(false);

  const generateCaptions = async (langCode: string) => {
    setCaptionLang(langCode);
    setCaptionLoading(true);
    try {
      const result = await aiCoachService.generateShareCaption(sessionId, aiNameFor(langCode), {
        notes: notes.trim() || undefined,
        mood,
      });
      setCaptions(result);
      // Land on the first style that actually came back with text.
      const first = CAPTION_STYLES.map((s) => s.key).find((k) => result[k]?.trim());
      if (first) setCaptionStyle(first);
    } catch {
      Alert.alert(t('common.error'), t('errors.serverError'));
    } finally {
      setCaptionLoading(false);
    }
  };

  const currentCaption = captions ? captions[captionStyle] ?? '' : '';

  const handleCopyCaption = async () => {
    if (!currentCaption) return;
    await Clipboard.setStringAsync(currentCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShareCaption = async () => {
    if (!currentCaption) return;
    try {
      await Share.share({ message: currentCaption });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const openDurationEdit = () => {
    setEditH(String(Math.floor(duration / 60)));
    setEditM(String(duration % 60));
    setEditingDuration(true);
  };

  const saveDurationEdit = () => {
    const h = parseInt(editH, 10) || 0;
    const m = parseInt(editM, 10) || 0;
    const total = h * 60 + m;
    if (total <= 0) {
      Alert.alert('Invalid duration', 'Enter a duration greater than zero.');
      return;
    }
    setDuration(total);
    setEditingDuration(false);
  };

  useEffect(() => {
    sessionService.getSession(sessionId).then((s) => {
      setSession(s);
      setMood(s.mood ?? 'good');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sessionId]);

  const getSummaryStats = () => {
    if (!session) return { exercises: 0, totalSets: 0, totalVolume: 0 };
    const exerciseNames = [...new Set(session.sets.map((s) => s.exerciseName))];
    const completedSets = session.sets.filter((s) => s.isCompleted);
    const totalVolume = completedSets.reduce((acc, s) => {
      return acc + ((s.weightUsed ?? 0) * (s.repsCompleted ?? 0));
    }, 0);
    return { exercises: exerciseNames.length, totalSets: completedSets.length, totalVolume };
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      await sessionService.completeSession(sessionId, {
        notes: notes.trim() || undefined,
        mood,
        durationMinutes: duration,
      });
    } catch {
      Alert.alert(t('common.error'), t('errors.serverError'));
      setSaving(false);
      return;
    }
    setSaving(false);
    setGenerating(true);
    // Run badge refresh and AI call in parallel so the popup is queued and
    // rendered before navigation starts (avoids iOS dropping modals that appear
    // mid-transition).
    await Promise.allSettled([
      refreshBadges(),
      aiCoachService.postSession(sessionId),
    ]);
    navigation.reset({ index: 0, routes: [{ name: 'ClientApp' }] });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const stats = getSummaryStats();
  const exerciseNames = session ? [...new Set(session.sets.map((s) => s.exerciseName))] : [];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <View style={styles.trophyBlock}>
          <Trophy size={56} weight="fill" color={palette.brand[400]} style={{ marginBottom: 8 }} />
          <Text style={styles.doneTitle}>{t('sessionSummary.sessionComplete')}</Text>
          <Text style={styles.doneSubtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={openDurationEdit} activeOpacity={0.7}>
            <Text style={styles.statValue}>
              {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
            </Text>
            <Text style={styles.statLabel}>{t('sessionSummary.duration').toUpperCase()} ✎</Text>
          </TouchableOpacity>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>{t('sessionSummary.totalSets').toUpperCase()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.exercises}</Text>
            <Text style={styles.statLabel}>{t('sessionSummary.exercises').toUpperCase()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalVolume > 0 ? `${Math.round(stats.totalVolume / 1000)}k` : '—'}</Text>
            <Text style={styles.statLabel}>VOL (kg)</Text>
          </View>
        </View>

        {/* Achievement points earned this session */}
        {session && (() => {
          const breakdown = projectSessionPoints(session);
          return (
            <View style={styles.pointsCard}>
              <View style={styles.pointsHeader}>
                <View>
                  <Text style={styles.pointsLabel}>ACHIEVEMENT POINTS</Text>
                  <Text style={styles.pointsSub}>Earned from this workout</Text>
                </View>
                <Text style={styles.pointsValue}>+{breakdown.total}</Text>
              </View>
              <View style={styles.pointsLines}>
                {breakdown.lines.map((line) => (
                  <View key={line.label} style={styles.pointsLineRow}>
                    <View style={styles.pointsLineLeft}>
                      {line.earned ? (
                        <Check size={14} weight="bold" color={palette.brand[400]} />
                      ) : (
                        <View style={styles.pointsDot} />
                      )}
                      <Text style={[styles.pointsLineLabel, !line.earned && styles.pointsLineMuted]}>
                        {line.label}
                      </Text>
                    </View>
                    <Text style={[styles.pointsLinePts, !line.earned && styles.pointsLineMuted]}>
                      +{line.points}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* PR Recap — true PRs (crossed 1RM) get the gold card; mini PRs
            (rep-count records) get a quieter one below. */}
        {prs && prs.some((pr) => pr.tier === 'pr') && (
          <View style={styles.prCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Trophy size={18} weight="fill" color={palette.brand[400]} /><Text style={styles.prCardTitle}>Personal Records Broken!</Text></View>
            {prs.filter((pr) => pr.tier === 'pr').map((pr, i) => {
              const newE1rm = pr.e1rm ?? pr.value;
              return (
                <View key={i} style={styles.prRow}>
                  <View style={styles.prRowLeft}>
                    <Text style={styles.prExercise}>{exName(pr.exerciseName)}</Text>
                    <Text style={styles.prLabel}>{pr.label}</Text>
                  </View>
                  <View style={styles.prRowRight}>
                    <Text style={styles.prValue}>{newE1rm}kg</Text>
                    <Text style={styles.prDelta}>
                      {pr.prevE1rm ? `+${(newE1rm - pr.prevE1rm).toFixed(1)} from ${pr.prevE1rm}kg` : 'First ever! 🎉'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {prs && prs.some((pr) => pr.tier === 'mini') && (
          <View style={styles.miniPrCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Trophy size={16} weight="regular" color={palette.gray[300]} /><Text style={styles.miniPrCardTitle}>Mini PRs</Text></View>
            {prs.filter((pr) => pr.tier === 'mini').map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <View style={styles.prRowLeft}>
                  <Text style={styles.miniPrExercise}>{exName(pr.exerciseName)}</Text>
                  <Text style={styles.miniPrLabel}>{pr.label}</Text>
                </View>
                <View style={styles.prRowRight}>
                  <Text style={styles.miniPrValue}>{pr.value}kg</Text>
                  <Text style={styles.miniPrDelta}>
                    {pr.previous ? `+${(pr.value - pr.previous).toFixed(1)} from ${pr.previous}kg` : 'First ever! 🎉'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Exercise breakdown */}
        {exerciseNames.length > 0 && (
          <Card background={palette.gray[800]} bordered={false} style={styles.cardSpacing}>
            <Text style={styles.cardLabel}>{t('sessionSummary.exercises').toUpperCase()}</Text>
            {exerciseNames.map((name) => {
              const exSets = session!.sets.filter((s) => s.exerciseName === name && s.isCompleted);
              const topSet = exSets.reduce((best, s) => {
                const vol = (s.weightUsed ?? 0) * (s.repsCompleted ?? 0);
                const bestVol = (best?.weightUsed ?? 0) * (best?.repsCompleted ?? 0);
                return vol > bestVol ? s : best;
              }, exSets[0]);
              return (
                <View key={name} style={styles.exRow}>
                  <Text style={styles.exName}>{exName(name)}</Text>
                  <Text style={styles.exDetail}>
                    {exSets.length} sets
                    {topSet?.weightUsed ? ` · Top: ${topSet.weightUsed}kg × ${topSet.repsCompleted}` : ''}
                    {topSet?.rpe ? ` @ RPE ${topSet.rpe}` : ''}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Post-session mood */}
        <Card background={palette.gray[800]} bordered={false} style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>HOW WAS THE WORKOUT?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                onPress={() => setMood(m.value)}
              >
                <View style={styles.moodEmoji}>{m.icon}</View>
                <Text style={[styles.moodName, mood === m.value && styles.moodNameActive]}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Notes */}
        <Card background={palette.gray[800]} bordered={false} style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('sessionSummary.sessionNotes').toUpperCase()}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('sessionSummary.addNotes')}
            placeholderTextColor={palette.gray[500]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        {/* Share to socials */}
        <Card background={palette.gray[800]} bordered={false} style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>SHARE TO SOCIALS</Text>

          {!captions && !captionLoading && (
            <>
              <Text style={styles.shareHint}>
                Turn this workout into a ready-to-post caption for TikTok, Instagram & more.
              </Text>
              <TouchableOpacity style={styles.shareGenBtn} onPress={() => generateCaptions(captionLang)}>
                <Sparkle size={18} weight="fill" color={palette.white} />
                <Text style={styles.shareGenText}>Generate caption</Text>
              </TouchableOpacity>
            </>
          )}

          {captionLoading && (
            <View style={styles.shareLoading}>
              <ActivityIndicator color={palette.brand[400]} />
              <Text style={styles.shareHint}>Writing your caption…</Text>
            </View>
          )}

          {captions && !captionLoading && (
            <>
              {/* Style tabs */}
              <View style={styles.styleTabs}>
                {CAPTION_STYLES.map((s) => {
                  const empty = !captions[s.key]?.trim();
                  return (
                    <TouchableOpacity
                      key={s.key}
                      disabled={empty}
                      style={[
                        styles.styleTab,
                        captionStyle === s.key && styles.styleTabActive,
                        empty && styles.styleTabDisabled,
                      ]}
                      onPress={() => setCaptionStyle(s.key)}
                    >
                      <Text style={[styles.styleTabText, captionStyle === s.key && styles.styleTabTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.captionBox}>
                <Text style={styles.captionText}>{currentCaption}</Text>
              </View>

              {/* Language toggle (only when app isn't already English) */}
              {showLangToggle && (
                <View style={styles.langToggle}>
                  {[{ code: 'en', label: 'EN' }, { code: localLang.code, label: localLang.label }].map((l) => (
                    <TouchableOpacity
                      key={l.code}
                      style={[styles.langBtn, captionLang === l.code && styles.langBtnActive]}
                      onPress={() => captionLang !== l.code && generateCaptions(l.code)}
                    >
                      <Text style={[styles.langBtnText, captionLang === l.code && styles.langBtnTextActive]}>
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Copy / Share */}
              <View style={styles.shareActions}>
                <TouchableOpacity style={[styles.shareActionBtn, styles.copyBtn]} onPress={handleCopyCaption}>
                  {copied ? <Check size={16} weight="bold" color={palette.brand[400]} /> : <Copy size={16} weight="bold" color={palette.gray[200]} />}
                  <Text style={[styles.shareActionText, copied && { color: palette.brand[400] }]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareActionBtn, styles.shareSheetBtn]} onPress={handleShareCaption}>
                  <ShareNetwork size={16} weight="bold" color={palette.white} />
                  <Text style={[styles.shareActionText, { color: palette.white }]}>Share</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => generateCaptions(captionLang)}>
                <Text style={styles.regenLink}>↻ Regenerate</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || generating) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || generating}
        >
          {saving || generating ? (
            <View style={styles.saveBtnInner}>
              <ActivityIndicator color={palette.white} size="small" style={{ marginRight: 10 }} />
              <Text style={styles.saveBtnText}>
                {generating ? t('sessionSummary.analyzingSession') : t('common.saving')}
              </Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>{t('sessionSummary.done')}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit duration */}
      <Modal
        visible={editingDuration}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingDuration(false)}
      >
        <TouchableOpacity
          style={durStyles.overlay}
          activeOpacity={1}
          onPress={() => setEditingDuration(false)}
        >
          <Card background={palette.gray[900]} borderColor={palette.gray[700]} padding={20} style={durStyles.cardBox}>
            <Text style={durStyles.title}>Edit duration</Text>
            <Text style={durStyles.subtitle}>
              Set how long the workout actually took.
            </Text>
            <View style={durStyles.inputsRow}>
              <View style={durStyles.inputGroup}>
                <TextInput
                  style={durStyles.input}
                  value={editH}
                  onChangeText={setEditH}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={palette.gray[600]}
                  maxLength={2}
                />
                <Text style={durStyles.unit}>hours</Text>
              </View>
              <View style={durStyles.inputGroup}>
                <TextInput
                  style={durStyles.input}
                  value={editM}
                  onChangeText={setEditM}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={palette.gray[600]}
                  maxLength={2}
                />
                <Text style={durStyles.unit}>min</Text>
              </View>
            </View>
            <View style={durStyles.actions}>
              <TouchableOpacity
                style={[durStyles.actionBtn, durStyles.cancelBtn]}
                onPress={() => setEditingDuration(false)}
              >
                <Text style={durStyles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[durStyles.actionBtn, durStyles.confirmBtn]}
                onPress={saveDurationEdit}
              >
                <Text style={durStyles.confirmText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  trophyBlock: { alignItems: 'center', paddingVertical: 28 },
  trophyIcon: { fontSize: 56, marginBottom: 12 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  doneSubtitle: { fontSize: 14, color: palette.gray[400] },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: palette.gray[800],
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: palette.brand[400], marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: palette.gray[500], letterSpacing: 0.8 },

  pointsCard: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.brand[600] + '55',
  },
  pointsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pointsLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1 },
  pointsSub: { fontSize: 12, color: palette.gray[500], marginTop: 3 },
  pointsValue: { fontSize: 30, fontWeight: '900', color: palette.brand[400] },
  pointsLines: { gap: 8, borderTopWidth: 1, borderTopColor: palette.gray[700], paddingTop: 12 },
  pointsLineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsLineLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointsDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: palette.gray[600] },
  pointsLineLabel: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  pointsLinePts: { fontSize: 13, color: palette.brand[400], fontWeight: '700' },
  pointsLineMuted: { color: palette.gray[600] },

  cardSpacing: { marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1, marginBottom: 14 },

  exRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.gray[700] },
  exName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  exDetail: { fontSize: 12, color: palette.gray[400], marginTop: 2 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { alignItems: 'center', flex: 1, paddingVertical: 10, borderRadius: 12, marginHorizontal: 2 },
  moodBtnActive: { backgroundColor: palette.brand[600] + '33' },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodName: { fontSize: 10, color: palette.gray[400], fontWeight: '600' },
  moodNameActive: { color: palette.brand[400] },

  notesInput: {
    backgroundColor: palette.gray[700],
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 90,
  },

  // Share to socials
  shareHint: { fontSize: 13, color: palette.gray[400], lineHeight: 18, marginBottom: 14 },
  shareGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.brand[600],
    borderRadius: 12,
    paddingVertical: 13,
  },
  shareGenText: { fontSize: 15, fontWeight: '700', color: palette.white },
  shareLoading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  styleTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  styleTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: palette.gray[700],
  },
  styleTabActive: { backgroundColor: palette.brand[600] + '33', borderWidth: 1, borderColor: palette.brand[500] },
  styleTabDisabled: { opacity: 0.35 },
  styleTabText: { fontSize: 13, fontWeight: '700', color: palette.gray[300] },
  styleTabTextActive: { color: palette.brand[400] },
  captionBox: {
    backgroundColor: palette.gray[700],
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  captionText: { fontSize: 14, lineHeight: 21, color: theme.colors.text },
  langToggle: { flexDirection: 'row', gap: 8, marginBottom: 12, alignSelf: 'flex-start' },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: palette.gray[700],
  },
  langBtnActive: { backgroundColor: palette.brand[600] },
  langBtnText: { fontSize: 12, fontWeight: '700', color: palette.gray[300] },
  langBtnTextActive: { color: palette.white },
  shareActions: { flexDirection: 'row', gap: 10 },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  copyBtn: { backgroundColor: palette.gray[700] },
  shareSheetBtn: { backgroundColor: palette.brand[600] },
  shareActionText: { fontSize: 14, fontWeight: '700', color: palette.gray[200] },
  regenLink: { fontSize: 13, fontWeight: '600', color: palette.gray[400], textAlign: 'center', marginTop: 14 },

  prCard: {
    backgroundColor: palette.warning[900] + '50',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.warning[800],
  },
  prCardTitle: { fontSize: 15, fontWeight: '800', color: palette.warning[300], marginBottom: 14 },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.warning[800] + '60',
  },
  prRowLeft: { flex: 1 },
  prExercise: { fontSize: 14, fontWeight: '700', color: palette.warning[100] },
  prLabel: { fontSize: 11, color: palette.warning[300], marginTop: 2 },
  prRowRight: { alignItems: 'flex-end' },
  prValue: { fontSize: 18, fontWeight: '800', color: palette.warning[300] },
  prDelta: { fontSize: 10, color: palette.warning[400], marginTop: 2 },

  miniPrCard: {
    backgroundColor: palette.gray[800],
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.gray[700],
  },
  miniPrCardTitle: { fontSize: 14, fontWeight: '700', color: palette.gray[200], marginBottom: 14 },
  miniPrExercise: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  miniPrLabel: { fontSize: 11, color: palette.gray[400], marginTop: 2 },
  miniPrValue: { fontSize: 18, fontWeight: '800', color: palette.gray[200] },
  miniPrDelta: { fontSize: 10, color: palette.gray[400], marginTop: 2 },

  saveBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: palette.white },
});

const durStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardBox: { width: '100%', maxWidth: 360 },
  title: { fontSize: 18, fontWeight: '800', color: palette.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: palette.gray[400], marginBottom: 18 },
  inputsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  inputGroup: { flex: 1, alignItems: 'center' },
  input: {
    backgroundColor: palette.gray[800],
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    width: '100%',
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 12, color: palette.gray[500], fontWeight: '600', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: palette.gray[800] },
  cancelText: { fontSize: 15, fontWeight: '700', color: palette.gray[300] },
  confirmBtn: { backgroundColor: palette.brand[600] },
  confirmText: { fontSize: 15, fontWeight: '700', color: palette.white },
});
