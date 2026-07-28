import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { X, Brain, Barbell, ForkKnife } from 'phosphor-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { FitnessQuiz } from '../../components/ui/FitnessQuiz';
import { Button } from '../../components/ui/Button';
import { theme, palette } from '../../theme';
import {
  QuizDifficulty,
  ratingTitle,
  clampRating,
  DEFAULT_QUIZ_RATING,
  QUIZ_RATING_STORAGE_KEY,
} from '../../data/fitnessQuiz';

const LENGTHS = [
  { label: 'Quick · 5', value: 5 },
  { label: 'Standard · 10', value: 10 },
  { label: 'Marathon · 20', value: 20 },
];

const LEVELS: { label: string; value: QuizDifficulty | undefined }[] = [
  { label: 'Rated ⚡', value: undefined },
  { label: 'Beginner', value: 1 },
  { label: 'Intermediate', value: 2 },
  { label: 'Advanced', value: 3 },
];

export const QuizScreen: React.FC = () => {
  const navigation = useNavigation();
  const [limit, setLimit] = useState<number | null>(null);
  const [levelIdx, setLevelIdx] = useState(0);
  const [rating, setRating] = useState<number | null>(null);

  // Refresh the displayed rating whenever we return to the intro screen.
  useEffect(() => {
    if (limit !== null) return;
    AsyncStorage.getItem(QUIZ_RATING_STORAGE_KEY)
      .then((v) => {
        const saved = Number(v);
        setRating(Number.isFinite(saved) && saved > 0 ? clampRating(saved) : DEFAULT_QUIZ_RATING);
      })
      .catch(() => setRating(DEFAULT_QUIZ_RATING));
  }, [limit]);

  const close = (
    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
      <X size={24} weight="bold" color={theme.colors.text} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader left={<View />} title="Fitness Quiz" right={close} />

      {limit === null ? (
        <ScrollView contentContainerStyle={styles.intro} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Brain size={44} weight="fill" color={palette.brand[400]} />
          </View>
          <Text style={styles.heroTitle}>Test your fitness IQ</Text>
          <Text style={styles.heroSub}>
            From the basics to periodization and biomechanics — 240 questions across training,
            nutrition, anatomy, recovery and the myths everyone gets wrong. Answer and learn — we
            show you why.
          </Text>

          {rating !== null && (
            <View style={styles.ratingCard}>
              <Text style={styles.ratingValue}>⚡ {rating}</Text>
              <Text style={styles.ratingLabel}>{ratingTitle(rating)} · your quiz rating</Text>
            </View>
          )}

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Barbell size={16} weight="fill" color={palette.brand[400]} />
              <Text style={styles.tagText}>Training</Text>
            </View>
            <View style={styles.tag}>
              <ForkKnife size={16} weight="fill" color={palette.emerald[400]} />
              <Text style={styles.tagText}>Nutrition</Text>
            </View>
          </View>

          <Text style={styles.pick}>Difficulty</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l, i) => {
              const active = i === levelIdx;
              return (
                <TouchableOpacity
                  key={l.label}
                  style={[styles.levelChip, active && styles.levelChipActive]}
                  onPress={() => setLevelIdx(i)}
                >
                  <Text style={[styles.levelChipText, active && styles.levelChipTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.levelHint}>
            {levelIdx === 0
              ? 'Chess-style rating: questions match your level, and every answer moves your rating — hard wins pay big, easy misses cost more the higher you climb.'
              : 'Unrated practice — questions stay at this level and your rating is untouched.'}
          </Text>

          <Text style={styles.pick}>How many questions?</Text>
          {LENGTHS.map((l) => (
            <Button
              key={l.value}
              label={l.label}
              variant="outline"
              color="brand"
              onPress={() => setLimit(l.value)}
              isFullWidth
              style={{ marginBottom: theme.spacing.sm }}
            />
          ))}
        </ScrollView>
      ) : (
        <FitnessQuiz
          questionLimit={limit}
          difficulty={LEVELS[levelIdx].value}
          title="Fitness Quiz"
          subtitle="Pick the right answer"
          onFinish={() => setLimit(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  intro: { padding: theme.spacing.xl, alignItems: 'center' },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    backgroundColor: palette.brand[500] + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  heroTitle: {
    ...theme.typography.displaySm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.extrabold,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  heroSub: {
    ...theme.typography.textMd,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: theme.spacing.md,
  },
  tags: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing['3xl'] },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: { ...theme.typography.textSm, color: theme.colors.text, fontWeight: theme.fontWeight.medium },
  ratingCard: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: palette.brand[500] + '1A',
    borderColor: palette.brand[500] + '44',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  ratingValue: { ...theme.typography.headingLg, color: palette.brand[400], fontWeight: theme.fontWeight.extrabold },
  ratingLabel: { ...theme.typography.textSm, color: theme.colors.textSecondary, marginTop: 2 },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignSelf: 'stretch' },
  levelChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  levelChipActive: {
    borderColor: palette.brand[400],
    backgroundColor: palette.brand[500] + '1A',
  },
  levelChipText: { ...theme.typography.textSm, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.medium },
  levelChipTextActive: { color: palette.brand[400], fontWeight: theme.fontWeight.bold },
  levelHint: {
    ...theme.typography.textXs,
    color: theme.colors.textTertiary,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  pick: {
    ...theme.typography.headingSm,
    color: theme.colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
    fontWeight: theme.fontWeight.semibold,
  },
});
