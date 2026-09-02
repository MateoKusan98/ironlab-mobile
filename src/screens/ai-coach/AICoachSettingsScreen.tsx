import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { KeyboardAwareScreen } from '../../components/ui';
import { aiCoachService, AICoachProfileData } from '../../services/ai-coach.service';
import { apiErrorMessage } from '../../utils/apiError';
import { FormValues, asNumber, asOptionalText } from '@shared';
import {
  DONT_KNOW, NUMERIC_PROFILE_FIELDS, Question, Section,
  QUESTION_KEYS, buildProfilePatch, changedKeys, getSections, hydrateAnswers,
  isAnswered, summarizeAnswer, visibleQuestions,
} from './questionnaire/questions';
import { QuestionField } from './questionnaire/QuestionField';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachSettings'>;
  route: RouteProp<RootStackParamList, 'AICoachSettings'>;
};

/**
 * Direct-access editor for the AI coach questionnaire.
 *
 * The onboarding wizard is a one-way walk: changing a single answer afterwards meant
 * paging through every section to reach it. This screen renders the SAME question
 * config (see questionnaire/questions.ts — one definition, two surfaces) as
 * searchable, independently expandable sections, and saves only what changed.
 *
 * Partial saves are safe because POST /ai-coach/profile Object.assign's the DTO onto
 * the existing row — fields it doesn't mention keep their values.
 */

const SUMMARY_PREVIEW_ROWS = 3;

/** Case- and accent-insensitive: typing "prijedi" still finds "Prijeđi". */
const norm = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * A question matches a query against anything the athlete could plausibly type: its
 * label, its hint, its option labels, and its field id — the id matters because it is
 * the one part that is NOT translated, so an English word like "frequency" still finds
 * squatFrequencyPerWeek while the app is running in Croatian.
 */
const questionHaystack = (question: Question): string =>
  norm([
    question.label,
    question.subtitle ?? '',
    String(question.id),
    question.unit ?? '',
    ...(question.options ?? []).map((o) => o.label),
  ].join(' '));

const sectionHaystack = (section: Section): string => norm(`${section.title} ${section.subtitle}`);

export const AICoachSettingsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const SECTIONS = useMemo(() => getSections(t), [t]);

  const [savedAnswers, setSavedAnswers] = useState<FormValues>({});
  const [answers, setAnswers] = useState<FormValues>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  // Arriving from a "your stored max looks stale" prompt: open the section holding the
  // field to fix, so the correction is the tap the athlete came here to make rather than
  // a search through every section.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(route.params?.focusSection ? [route.params.focusSection] : []),
  );

  const load = useCallback(async () => {
    try {
      const [profile, plan] = await Promise.all([
        aiCoachService.getProfile(),
        // The competition/PR date is owned by its own endpoint; the plan payload already
        // carries it, so one call covers the prefill. A failure there must not stop the
        // rest of the settings from loading.
        aiCoachService.getPlan().catch(() => null),
      ]);
      const loaded = hydrateAnswers(profile as FormValues | null, plan ?? null, QUESTION_KEYS);
      setSavedAnswers(loaded);
      setAnswers(loaded);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retry = () => {
    setLoading(true);
    setLoadFailed(false);
    void load();
  };

  const dirtyKeys = useMemo(() => changedKeys(savedAnswers, answers), [savedAnswers, answers]);

  // Leaving with unsaved edits would silently drop them — the answers only exist in
  // this screen's state until Save. Native back is the way out of this screen (the app
  // has no in-header back arrow), so the guard has to hang off the navigation event.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (dirtyKeys.length === 0 || saving) return;
        e.preventDefault();
        Alert.alert(
          t('aiCoachSettings.unsavedTitle'),
          t('aiCoachSettings.unsavedMsg'),
          [
            { text: t('aiCoachSettings.keepEditing'), style: 'cancel' },
            { text: t('aiCoachSettings.discard'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          ],
        );
      }),
    [navigation, dirtyKeys.length, saving, t],
  );

  const patch = (changes: FormValues) => setAnswers((prev) => ({ ...prev, ...changes }));

  const toggleSection = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length > 0;

  /** Sections paired with the questions to show — everything, or only what matches. */
  const results = useMemo(() => {
    const needle = norm(trimmedQuery);
    return SECTIONS.map((section) => {
      const questions = visibleQuestions(section.questions, answers);
      if (!searching) return { section, questions };
      const wholeSection = sectionHaystack(section).includes(needle);
      return {
        section,
        questions: wholeSection ? questions : questions.filter((q) => questionHaystack(q).includes(needle)),
      };
    }).filter(({ questions }) => questions.length > 0);
  }, [SECTIONS, answers, searching, trimmedQuery]);

  const handleSave = async () => {
    // A required answer can be edited, but not emptied — the coach programs off these,
    // and a blank one would silently fall back to a default the athlete never chose.
    const emptied = SECTIONS.flatMap((sec) => sec.questions)
      .filter((q) => !q.optional && dirtyKeys.includes(String(q.id)) && !isAnswered(answers[q.id]))
      .map((q) => q.label);
    if (emptied.length > 0) {
      Alert.alert(
        t('aiCoachSettings.requiredTitle'),
        t('aiCoachSettings.requiredMsg', { fields: emptied.join('\n• ') }),
        [{ text: t('common.ok') }],
      );
      return;
    }

    // A number field that can't be read as a number would otherwise be sent as null
    // (below) and silently wipe the stored value — say so instead of guessing.
    const badNumbers = SECTIONS.flatMap((sec) => sec.questions)
      .filter((q) => NUMERIC_PROFILE_FIELDS.includes(String(q.id)) && dirtyKeys.includes(String(q.id)))
      .filter((q) => {
        const value = answers[q.id];
        if (!isAnswered(value) || value === DONT_KNOW) return false; // handled as a clear
        const parsed = asNumber(value);
        if (parsed === undefined) return true;
        return (q.min !== undefined && parsed < q.min) || (q.max !== undefined && parsed > q.max);
      })
      .map((q) => (q.min !== undefined && q.max !== undefined ? `${q.label} (${q.min}–${q.max})` : q.label));
    if (badNumbers.length > 0) {
      Alert.alert(
        t('aiCoachSettings.badNumberTitle'),
        t('aiCoachSettings.badNumberMsg', { fields: badNumbers.join('\n• ') }),
        [{ text: t('common.ok') }],
      );
      return;
    }

    setSaving(true);
    try {
      const payload = buildProfilePatch(dirtyKeys, answers, QUESTION_KEYS);

      // The questionnaire is config-driven, so its answers are keyed by string and no
      // static type can line them up with the DTO's fixed shape. QUESTION_KEYS is the
      // real gate inside buildProfilePatch (it drops every non-DTO key), so narrow once here.
      if (Object.keys(payload).length > 0) {
        await aiCoachService.saveProfile(payload as unknown as AICoachProfileData);
      }

      // Only reconcile the competition date if it was actually touched — an untouched
      // screen must never clear a date the athlete set elsewhere.
      if (dirtyKeys.includes('competitionDate') || dirtyKeys.includes('competitionType')) {
        const date = asOptionalText(answers.competitionDate);
        if (date) {
          await aiCoachService.setCompetitionDate(date, answers.competitionType === 'pr_test' ? 'pr_test' : 'meet');
        } else {
          await aiCoachService.clearCompetitionDate();
        }
      }

      // Same rule as the comp date: only touched. Toggling this re-anchors the block
      // clock server-side, so a stray write would silently restart the athlete's block.
      if (dirtyKeys.includes('blockIntent')) {
        await aiCoachService.setBlockIntent(answers.blockIntent === true ? 'offseason' : 'default');
      }

      setSavedAnswers(answers);
      Alert.alert(t('aiCoachExtendedSetup.savedTitle'), t('aiCoachExtendedSetup.savedMsg'));
    } catch (err: unknown) {
      Alert.alert(t('aiCoachExtendedSetup.saveFailedTitle'), apiErrorMessage(err, 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const renderSection = ({ section, questions }: { section: Section; questions: Question[] }) => {
    const isOpen = searching || expanded.has(section.id);
    const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
    const sectionDirty = questions.some((q) => dirtyKeys.includes(String(q.id)));
    const previews = questions
      .map((q) => ({ label: q.label, value: summarizeAnswer(q, answers, t) }))
      .filter((row): row is { label: string; value: string } => row.value !== null);

    return (
      <View key={section.id} style={[s.card, sectionDirty && s.cardDirty]}>
        <TouchableOpacity
          style={s.cardHead}
          onPress={() => toggleSection(section.id)}
          disabled={searching}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={`${section.title}, ${t('aiCoachSettings.answeredOf', { answered: answeredCount, total: questions.length })}`}
        >
          <Text style={s.cardIcon}>{section.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{section.title}</Text>
            <Text style={s.cardMeta}>
              {t('aiCoachSettings.answeredOf', { answered: answeredCount, total: questions.length })}
            </Text>
          </View>
          {sectionDirty && <View style={s.dirtyDot} />}
          {!searching && <Text style={s.chevron}>{isOpen ? '⌃' : '⌄'}</Text>}
        </TouchableOpacity>

        {!isOpen && previews.length > 0 && (
          <View style={s.previewWrap}>
            {previews.slice(0, SUMMARY_PREVIEW_ROWS).map((row) => (
              <Text key={row.label} style={s.previewRow} numberOfLines={1}>
                <Text style={s.previewLabel}>{row.label}: </Text>{row.value}
              </Text>
            ))}
            {previews.length > SUMMARY_PREVIEW_ROWS && (
              <Text style={s.previewMore}>
                {t('aiCoachSettings.moreCount', { count: previews.length - SUMMARY_PREVIEW_ROWS })}
              </Text>
            )}
          </View>
        )}

        {isOpen && (
          <View style={s.questionWrap}>
            {questions.map((question) => (
              <View key={question.id} style={s.questionBlock}>
                <View style={s.questionLabelRow}>
                  <Text style={s.questionLabel}>{question.label}</Text>
                  {dirtyKeys.includes(String(question.id))
                    ? <Text style={s.editedTag}>{t('aiCoachSettings.edited')}</Text>
                    : question.optional
                      ? <Text style={s.optional}>{t('aiCoachExtendedSetup.optional')}</Text>
                      : isAnswered(answers[question.id])
                        ? <Text style={s.answeredCheck}>✓</Text>
                        : <View style={s.requiredDot} />}
                </View>
                {question.subtitle && <Text style={s.questionSubtitle}>{question.subtitle}</Text>}
                <QuestionField question={question} answers={answers} onChange={patch} t={t} />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('aiCoachSettings.title')}</Text>
          <Text style={s.titleSub}>{t('aiCoachSettings.appliesNext')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Text style={s.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('aiCoachSettings.searchPlaceholder')}
          placeholderTextColor={palette.gray[600]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t('aiCoachSettings.searchPlaceholder')}
        />
        {searching && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={palette.brand[500]} /></View>
      ) : loadFailed ? (
        <View style={s.center}>
          <Text style={s.errText}>{t('aiCoachSettings.loadFailed')}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={retry} accessibilityRole="button">
            <Text style={s.retryText}>{t('aiCoachSettings.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAwareScreen contentContainerStyle={s.scroll}>
          {results.length === 0 ? (
            <Text style={s.noResults}>{t('aiCoachSettings.noResults', { query: trimmedQuery })}</Text>
          ) : (
            results.map(renderSection)
          )}

          {!searching && (
            <TouchableOpacity
              style={s.fullSetupRow}
              onPress={() => navigation.navigate('AICoachExtendedSetup', { editMode: true })}
              accessibilityRole="button"
            >
              <Text style={s.fullSetupIcon}>🧭</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.fullSetupTitle}>{t('aiCoachSettings.fullSetupTitle')}</Text>
                <Text style={s.fullSetupSub}>{t('aiCoachSettings.fullSetupSub')}</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: dirtyKeys.length > 0 ? 120 : 40 }} />
        </KeyboardAwareScreen>
      )}

      {dirtyKeys.length > 0 && !loading && (
        <View style={s.saveBar}>
          <TouchableOpacity
            style={s.discardBtn}
            onPress={() => setAnswers(savedAnswers)}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={s.discardText}>{t('aiCoachSettings.discard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.saveBtn}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={s.saveText}>
              {saving ? t('common.saving') : t('aiCoachSettings.saveChanges', { count: dirtyKeys.length })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: palette.white },
  titleSub: { fontSize: 12, color: palette.gray[500], marginTop: 2 },
  close: { fontSize: 22, color: palette.gray[400] },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: palette.gray[900], borderRadius: 12,
    borderWidth: 1, borderColor: palette.gray[800],
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: palette.white, fontSize: 14, padding: 0 },
  searchClear: { fontSize: 15, color: palette.gray[500] },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errText: { color: palette.gray[400], fontSize: 14 },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: palette.gray[700] },
  retryText: { color: palette.brand[400], fontSize: 13, fontWeight: '700' },

  scroll: { paddingHorizontal: 20, paddingBottom: 20 },
  noResults: { color: palette.gray[500], fontSize: 14, textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: theme.colors.card, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: palette.gray[800], overflow: 'hidden',
  },
  cardDirty: { borderColor: palette.brand[700] },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: palette.white },
  cardMeta: { fontSize: 11, color: palette.gray[500], marginTop: 2 },
  dirtyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.brand[500] },
  chevron: { fontSize: 16, color: palette.gray[500], width: 18, textAlign: 'center' },

  previewWrap: { paddingHorizontal: 16, paddingBottom: 14, gap: 4 },
  previewRow: { fontSize: 12, color: palette.gray[300] },
  previewLabel: { color: palette.gray[500] },
  previewMore: { fontSize: 11, color: palette.gray[600], fontStyle: 'italic' },

  questionWrap: { paddingHorizontal: 16, paddingBottom: 8, borderTopWidth: 1, borderTopColor: palette.gray[800], paddingTop: 16 },
  questionBlock: { marginBottom: 24 },
  questionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  questionLabel: { fontSize: 14, fontWeight: '700', color: palette.white, flex: 1 },
  questionSubtitle: { fontSize: 12, color: palette.gray[600], marginBottom: 10, fontStyle: 'italic' },
  optional: { color: palette.gray[600], fontSize: 11, fontStyle: 'italic' },
  requiredDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.brand[500] },
  answeredCheck: { color: palette.brand[400], fontSize: 13, fontWeight: '700' },
  editedTag: { color: palette.brand[400], fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  fullSetupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed',
    borderColor: palette.gray[700], marginTop: 4,
  },
  fullSetupIcon: { fontSize: 18 },
  fullSetupTitle: { fontSize: 14, fontWeight: '700', color: palette.gray[200] },
  fullSetupSub: { fontSize: 11, color: palette.gray[500], marginTop: 2 },

  saveBar: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: palette.gray[800], backgroundColor: theme.colors.background,
  },
  discardBtn: { paddingHorizontal: 18, justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.gray[700] },
  discardText: { color: palette.gray[400], fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: palette.brand[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: palette.black, fontSize: 15, fontWeight: '800' },
});
