import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../theme';
import { aiCoachService, AICoachProfileData, CoachPreferences } from '../../services/ai-coach.service';
import { useAuthStore } from '../../stores/auth.store';

import { apiErrorMessage } from '../../utils/apiError';
import { FormValues, asNumber, asStringList } from '@shared';
import {
  COMPETITION_KEYS, DONT_KNOW, EXPRESS_LAYOUT, NUMERIC_PROFILE_FIELDS, QUESTION_KEYS,
  getSections, hydrateAnswers, isAnswered, visibleQuestions,
} from './questionnaire/questions';
import { QuestionField } from './questionnaire/QuestionField';
const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachExtendedSetup'>;
  route: RouteProp<RootStackParamList, 'AICoachExtendedSetup'>;
};

// ─── Main Screen ─────────────────────────────────────────────────────────────


export const AICoachExtendedSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const express = route.params?.express ?? false;
  const forkedExperience = route.params?.experienceLevel;
  const ALL_SECTIONS = getSections(t);
  const SECTIONS = express
    ? EXPRESS_LAYOUT.map(({ sectionId, questionIds }) => {
        const sec = ALL_SECTIONS.find((s) => s.id === sectionId)!;
        return { ...sec, questions: sec.questions.filter((qq) => questionIds.includes(String(qq.id))) };
      })
    : ALL_SECTIONS;
  const preferences = route.params?.preferences as CoachPreferences | undefined;
  const editMode = route.params?.editMode ?? false;
  const { user, setUser } = useAuthStore();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<FormValues>({});
  const [isSaving, setIsSaving] = useState(false);

  // Keys the form actually edits — used to filter the prefill so we never load
  // (and later echo back) internal entity columns the save DTO rejects.
  const EDITABLE_KEYS = useRef(
    new Set<string>([
      ...QUESTION_KEYS,
      // Answered on the basic setup screen before this one, and merged in on finish.
      'sessionDurationMinutes',
      'preferredIntensity',
    ]),
  ).current;

  // Pre-populate answers from saved profile when opened in edit mode
  useEffect(() => {
    if (!editMode) return;
    Promise.all([
      aiCoachService.getProfile().catch(() => null),
      aiCoachService.getPlan().catch(() => null),
    ]).then(([profile, plan]) => {
      const loaded = hydrateAnswers(profile as FormValues | null, plan ?? null, EDITABLE_KEYS);
      setAnswers((prev) => ({ ...prev, ...loaded }));
    });
  }, [editMode]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const CONSTRAINTS_IDX = SECTIONS.findIndex((s) => s.id === 'constraints');
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof aiCoachService.getSuggestedConstraints>>>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const section = SECTIONS[sectionIndex];
  const totalSections = SECTIONS.length;
  const progress = (sectionIndex + 1) / totalSections;

  const patch = (changes: FormValues) => setAnswers((prev) => ({ ...prev, ...changes }));

  const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
    const startX = direction === 'forward' ? width : -width;
    slideAnim.setValue(startX);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    callback();
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  };

  // Fetch session-derived suggestions when user reaches the constraints section
  React.useEffect(() => {
    if (sectionIndex !== CONSTRAINTS_IDX || suggestionsDismissed || suggestions !== null) return;
    aiCoachService.getSuggestedConstraints().then((s) => {
      if (s && s.sessionCount >= 3) setSuggestions(s);
    });
  }, [sectionIndex]);

  const applyConstraintSuggestions = () => {
    if (!suggestions) return;
    setAnswers((prev) => {
      const next = { ...prev };
      if (suggestions.trainingDays && asStringList(prev.trainingDays).length === 0) next.trainingDays = suggestions.trainingDays;
      if (suggestions.avgSessionMinutes && !prev.sessionDurationMinutes) next.sessionDurationMinutes = suggestions.avgSessionMinutes;
      if (suggestions.squatFrequencyPerWeek && !prev.squatFrequencyPerWeek) next.squatFrequencyPerWeek = Math.round(suggestions.squatFrequencyPerWeek);
      if (suggestions.benchFrequencyPerWeek && !prev.benchFrequencyPerWeek) next.benchFrequencyPerWeek = Math.round(suggestions.benchFrequencyPerWeek);
      if (suggestions.deadliftFrequencyPerWeek && !prev.deadliftFrequencyPerWeek) next.deadliftFrequencyPerWeek = Math.round(suggestions.deadliftFrequencyPerWeek);
      return next;
    });
    setSuggestionsDismissed(true);
  };

  const getSectionErrors = (): string[] => {
    return visibleQuestions(section.questions, answers)
      .filter((q) => !q.optional)
      .filter((q) => !isAnswered(answers[q.id]))
      .map((q) => q.label);
  };

  const goNext = () => {
    const errors = getSectionErrors();
    if (errors.length > 0) {
      Alert.alert(
        t('aiCoachExtendedSetup.completeSection'),
        `${t('aiCoachExtendedSetup.stillNeeded', { fields: errors.join('\n• ') })}`,
        [{ text: t('common.ok') }],
      );
      return;
    }
    if (sectionIndex < totalSections - 1) {
      animateTransition('forward', () => setSectionIndex((i) => i + 1));
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (sectionIndex > 0) {
      animateTransition('back', () => setSectionIndex((i) => i - 1));
    } else {
      navigation.goBack();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const profileData: AICoachProfileData = {};

      // Merge basic setup preferences (duration, intensity) into profile
      if (preferences?.duration) profileData.sessionDurationMinutes = preferences.duration;
      if (preferences?.intensity) profileData.preferredIntensity = preferences.intensity;

      // The questionnaire is rendered from a config array, so its answers are
      // keyed by string — which no static type can line up with the DTO's fixed
      // shape. EDITABLE_KEYS is the real gate (it drops every internal column),
      // so narrow once here rather than casting at each write.
      const dynamic = profileData as unknown as FormValues;
      Object.entries(answers).forEach(([key, val]) => {
        if (!EDITABLE_KEYS.has(key)) return; // never send internal/non-DTO columns
        if (val !== '' && val !== null && val !== undefined && val !== DONT_KNOW) {
          dynamic[key] = NUMERIC_PROFILE_FIELDS.includes(key)
            ? (typeof val === 'number' ? val : asNumber(val))
            : val;
        }
      });

      // The competition/PR date lives behind its own endpoint, and the profile DTO
      // would reject it. Strip it out here and reconcile it separately below.
      COMPETITION_KEYS.forEach((key) => { delete dynamic[key]; });

      // Express (beginner) onboarding fills in sensible defaults for everything we
      // deliberately didn't ask, so the coach can build a safe general program on
      // day one and refine the rest from logged sessions.
      if (express) {
        const setDefault = <K extends keyof AICoachProfileData>(key: K, value: AICoachProfileData[K]) => {
          if (profileData[key] === undefined) profileData[key] = value;
        };
        setDefault('experienceLevel', forkedExperience ?? 'novice');
        // General "get in shape" block: moderate reps, volume, never tests a 1RM.
        // The athlete picks a real path (hypertrophy/powerbuilding/strength) later.
        setDefault('trainingFocus', 'hypertrophy');
        setDefault('prefersStructure', true);
        setDefault('nutritionTrackingEnabled', true);
        setDefault('currentPhase', 'maintain');
      }

      await aiCoachService.saveProfile(profileData);

      const compDate = answers.competitionDate as string | undefined;
      const compType = (answers.competitionType as 'meet' | 'pr_test' | undefined) ?? 'meet';
      if (compDate) {
        await aiCoachService.setCompetitionDate(compDate, compType);
      } else if (editMode) {
        // Edit mode prefills any existing date, so an empty value here means the
        // athlete cleared it. (In onboarding there's nothing to clear.)
        await aiCoachService.clearCompetitionDate();
      }
      if (editMode) {
        Alert.alert(t('aiCoachExtendedSetup.savedTitle'), t('aiCoachExtendedSetup.savedMsg'));
        navigation.goBack();
      } else {
        if (user) setUser({ ...user, isAICoachSetupComplete: true });
        navigation.replace('StartSession', {});
      }
    } catch (err: unknown) {
      Alert.alert(t('aiCoachExtendedSetup.saveFailedTitle'), apiErrorMessage(err, 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <TouchableOpacity onPress={handleFinish} style={s.skipBtn}>
          <Text style={s.skipText}>{t('aiCoachExtendedSetup.skipAll')}</Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.tabs}>
        {SECTIONS.map((sec, i) => (
          <View key={sec.id} style={[s.tab, i === sectionIndex && s.tabActive]}>
            <Text style={s.tabIcon}>{sec.icon}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Section header — fixed, outside scroll */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionIcon}>{express && sectionIndex === 0 ? '👋' : section.icon}</Text>
        <Text style={s.sectionTitle}>
          {express && sectionIndex === 0 ? t('aiCoachExtendedSetup.expressStartTitle') : section.title}
        </Text>
        <Text style={s.sectionSubtitle}>
          {express && sectionIndex === 0 ? t('aiCoachExtendedSetup.expressStartSub') : section.subtitle}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView key={sectionIndex} ref={scrollRef} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Constraint suggestions banner */}
            {sectionIndex === CONSTRAINTS_IDX && suggestions && !suggestionsDismissed && (
              <View style={s.suggestionCard}>
                <View style={s.suggestionHeader}>
                  <Text style={s.suggestionTitle}>
                    {t('aiCoachExtendedSetup.detectedFrom', { count: suggestions.sessionCount })}
                  </Text>
                  <TouchableOpacity onPress={() => setSuggestionsDismissed(true)}>
                    <Text style={s.suggestionDismiss}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.suggestionRows}>
                  {suggestions.trainingDays && (
                    <Text style={s.suggestionItem}>
                      📅  Days: {suggestions.trainingDays.map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                    </Text>
                  )}
                  {!!suggestions.sessionsPerWeek && (
                    <Text style={s.suggestionItem}>
                      🔁  Frequency: ~{suggestions.sessionsPerWeek}x / week
                    </Text>
                  )}
                  {!!suggestions.avgSessionMinutes && (
                    <Text style={s.suggestionItem}>
                      ⏱  Avg session: {suggestions.avgSessionMinutes} min
                    </Text>
                  )}
                  {!!suggestions.squatFrequencyPerWeek && (
                    <Text style={s.suggestionItem}>
                      🦵  Squat: ~{suggestions.squatFrequencyPerWeek}x / week
                    </Text>
                  )}
                  {!!suggestions.benchFrequencyPerWeek && (
                    <Text style={s.suggestionItem}>
                      💪  Bench: ~{suggestions.benchFrequencyPerWeek}x / week
                    </Text>
                  )}
                  {!!suggestions.deadliftFrequencyPerWeek && (
                    <Text style={s.suggestionItem}>
                      🏋️  Deadlift: ~{suggestions.deadliftFrequencyPerWeek}x / week
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={s.suggestionApplyBtn} onPress={applyConstraintSuggestions}>
                  <Text style={s.suggestionApplyText}>{t('aiCoachExtendedSetup.applyFields')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Questions */}
            {visibleQuestions(section.questions, answers).map((question) => (
              <View key={question.id} style={s.questionBlock}>
                <View style={s.questionLabelRow}>
                  <Text style={s.questionLabel}>{question.label}</Text>
                  {question.optional
                    ? <Text style={s.optional}>{t('aiCoachExtendedSetup.optional')}</Text>
                    : isAnswered(answers[question.id])
                      ? <Text style={s.answeredCheck}>✓</Text>
                      : <View style={s.requiredDot} />
                  }
                </View>
                {question.subtitle && <Text style={s.questionSubtitle}>{question.subtitle}</Text>}
                <QuestionField question={question} answers={answers} onChange={patch} t={t} />
              </View>
            ))}

            <View style={{ height: 120 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.footerMeta}>
          <Text style={s.footerStep}>{sectionIndex + 1} / {totalSections}</Text>
          <Text style={s.footerSectionName}>{section.title}</Text>
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={goNext} disabled={isSaving}>
          <Text style={s.nextBtnText}>
            {sectionIndex < totalSections - 1 ? t('aiCoachExtendedSetup.nextBtn') : isSaving ? t('aiCoachExtendedSetup.savingBtn') : editMode ? t('aiCoachExtendedSetup.saveChangesBtn') : t('aiCoachExtendedSetup.meetBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 32 },
  backIcon: { color: palette.white, fontSize: 28 },
  progressTrack: { flex: 1, height: 3, backgroundColor: palette.gray[800], borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.brand[500], borderRadius: 2 },
  skipBtn: {},
  skipText: { color: palette.gray[500], fontSize: 13 },

  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  tab: { width: 36, height: 36, borderRadius: 10, backgroundColor: palette.gray[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.gray[800] },
  tabActive: { borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.1)' },
  tabIcon: { fontSize: 16 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  sectionIcon: { fontSize: 32, marginBottom: 6 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: palette.white, letterSpacing: -0.5, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: palette.gray[500], lineHeight: 18, fontStyle: 'italic' },

  questionBlock: { marginBottom: 28 },
  questionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  questionLabel: { fontSize: 15, fontWeight: '700', color: palette.white, flex: 1 },
  questionSubtitle: { fontSize: 12, color: palette.gray[600], marginBottom: 10, fontStyle: 'italic' },
  optional: { color: palette.gray[600], fontSize: 11, fontStyle: 'italic' },
  requiredDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.brand[500] },
  answeredCheck: { color: palette.brand[400], fontSize: 13, fontWeight: '700' },

  footer: { padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: palette.gray[800], gap: 10 },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerStep: { color: palette.brand[500], fontSize: 13, fontWeight: '800' },
  footerSectionName: { color: palette.gray[500], fontSize: 13 },
  nextBtn: { backgroundColor: palette.brand[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  nextBtnText: { color: palette.black, fontSize: 15, fontWeight: '800' },

  suggestionCard: {
    backgroundColor: theme.surfaceTint.successDeep, borderWidth: 1, borderColor: palette.success[800],
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  suggestionTitle: { fontSize: 13, fontWeight: '700', color: palette.success[400] },
  suggestionDismiss: { fontSize: 16, color: palette.gray[600] },
  suggestionRows: { gap: 6, marginBottom: 14 },
  suggestionItem: { fontSize: 13, color: palette.gray[300] },
  suggestionApplyBtn: {
    backgroundColor: palette.success[800], borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  suggestionApplyText: { fontSize: 13, fontWeight: '700', color: palette.success[400] },
});
