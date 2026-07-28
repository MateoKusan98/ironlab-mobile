import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { CheckCircle, XCircle, Brain, Sparkle } from 'phosphor-react-native';
import { theme, palette } from '../../theme';
import { Button } from './Button';
import {
  buildDeck,
  ratingTitle,
  QuizQuestion,
  QuizDifficulty,
  DIFFICULTY_LABELS,
} from '../../data/fitnessQuiz';
import { badgesService } from '../../services/badges.service';
import { useRatedQuiz } from '../../hooks/useRatedQuiz';
import { useQueryClient } from '@tanstack/react-query';

export interface FitnessQuizProps {
  /**
   * Finite practice mode: stop after this many questions and show a results
   * screen. Leave undefined for an endless run (e.g. while an API call loads).
   */
  questionLimit?: number;
  /**
   * Endless mode only: when the parent's background task is still running pass
   * `true`; when it finishes pass `false` to reveal the "Continue" CTA.
   */
  loading?: boolean;
  /** Fired when the user taps Continue (endless) or Done (practice). */
  onFinish?: () => void;
  /** Headline shown above the quiz card. */
  title?: string;
  /** Sub-headline shown under the title. */
  subtitle?: string;
  /**
   * Lock the quiz to one difficulty level (unrated practice). When omitted
   * the quiz runs RATED: an Elo rating (persisted on device, chess-style)
   * picks questions near your level and moves with every answer — missing an
   * easy question at a high rating costs a lot, beating a hard one pays well.
   */
  difficulty?: QuizDifficulty;
}

const LEVEL_COLORS: Record<QuizDifficulty, string> = {
  1: palette.emerald[400],
  2: palette.brand[400],
  3: palette.rose[400],
};

const CATEGORY_COLORS: Record<string, string> = {
  Training: palette.brand[400],
  Nutrition: palette.emerald[400],
  Anatomy: palette.info[400],
  Recovery: palette.violet[400],
  Cardio: palette.pink[400],
  Supplements: palette.warning[400],
  Powerlifting: palette.rose[400],
  Myths: palette.cyan[400],
};

export const FitnessQuiz: React.FC<FitnessQuizProps> = ({
  questionLimit,
  loading = false,
  onFinish,
  title,
  subtitle,
  difficulty,
}) => {
  const isPractice = typeof questionLimit === 'number';
  const rated = difficulty === undefined;
  const queryClient = useQueryClient();

  // Fixed-difficulty mode walks a shuffled deck; rated mode draws one
  // question at a time near the player's rating (owned by the shared hook,
  // which also persists the rating and reports badge milestones).
  const { rating, question: ratedQuestion, scoreAnswer, nextQuestion } = useRatedQuiz();
  const [deck, setDeck] = useState<QuizQuestion[]>(() => (rated ? [] : buildDeck(difficulty)));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [ratingNote, setRatingNote] = useState<{ delta: number; text: string } | null>(null);

  const fade = useRef(new Animated.Value(1)).current;
  const reported = useRef(false);
  // Net rating change across this run (shown on the practice results screen).
  const runDelta = useRef(0);

  // Report a finished practice quiz once so the backend can award knowledge
  // badges. Endless (loading) runs never reach a results screen, so they don't
  // count — and the guard stops a re-render from posting twice.
  useEffect(() => {
    if (showResults && isPractice && !reported.current) {
      reported.current = true;
      badgesService
        .recordQuizComplete(score, questionLimit as number, rated ? rating : undefined)
        .then(() => queryClient.invalidateQueries({ queryKey: ['badges'] }))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, isPractice, score, questionLimit]);

  const question = rated ? ratedQuestion : deck[index % deck.length];
  const answered = selected !== null;

  const handleSelect = (optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    const correct = optionIndex === question.correct;
    if (correct) setScore((s) => s + 1);
    setAnsweredCount(answeredCount + 1);

    if (rated) {
      // Elo update: the question is the "opponent".
      const result = scoreAnswer(correct);
      runDelta.current += result.delta;
      setRatingNote({
        delta: result.delta,
        text: `Rating ${result.delta >= 0 ? '+' : ''}${result.delta} → ${result.rating} · ${ratingTitle(result.rating)}`,
      });
    }
  };

  const advance = () => {
    // Finished a finite practice run?
    if (isPractice && answeredCount >= (questionLimit as number)) {
      setShowResults(true);
      return;
    }

    const nextIndex = index + 1;
    const exhausted = !rated && nextIndex >= deck.length;

    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      if (rated) {
        nextQuestion();
      } else if (exhausted) {
        setDeck(buildDeck(difficulty));
        setIndex(0);
      } else {
        setIndex(nextIndex);
      }
      setSelected(null);
      setRatingNote(null);
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  };

  const restart = () => {
    runDelta.current = 0;
    if (rated) {
      nextQuestion();
    } else {
      setDeck(buildDeck(difficulty));
      setIndex(0);
    }
    setSelected(null);
    setAnsweredCount(0);
    setScore(0);
    setShowResults(false);
    setRatingNote(null);
  };

  // ── Results screen (practice mode) ───────────────────────────
  if (showResults) {
    const total = questionLimit as number;
    const pct = Math.round((score / total) * 100);
    const { headline, color } =
      pct >= 80
        ? { headline: 'Strong work! 💪', color: theme.colors.success }
        : pct >= 50
          ? { headline: 'Solid effort 👍', color: palette.brand[400] }
          : { headline: 'Keep learning 📚', color: palette.brand[400] };

    return (
      <View style={styles.resultsWrap}>
        <Sparkle size={56} weight="fill" color={palette.brand[400]} />
        <Text style={styles.resultsHeadline}>{headline}</Text>
        <Text style={[styles.resultsScore, { color }]}>
          {score}/{total}
        </Text>
        <Text style={styles.resultsPct}>{pct}% correct</Text>
        {rated && (
          <Text style={styles.resultsRating}>
            ⚡ {rating} · {ratingTitle(rating)}
            {runDelta.current !== 0 && (
              <Text style={{ color: runDelta.current > 0 ? theme.colors.success : theme.colors.error }}>
                {'  '}({runDelta.current > 0 ? '+' : ''}{runDelta.current} this run)
              </Text>
            )}
          </Text>
        )}
        <View style={styles.resultsButtons}>
          <Button label="Try again" variant="outline" color="brand" onPress={restart} isFullWidth />
          {onFinish && (
            <Button label="Done" variant="solid" color="brand" onPress={onFinish} isFullWidth style={{ marginTop: theme.spacing.sm }} />
          )}
        </View>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[question.category] ?? palette.brand[400];
  const progressLabel = isPractice
    ? `Question ${Math.min(answeredCount + (answered ? 0 : 1), questionLimit as number)} of ${questionLimit}`
    : `Score ${score} · ${answeredCount} answered`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Brain size={22} weight="fill" color={palette.brand[400]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title ?? 'Fitness Quiz'}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rated && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingValue}>⚡ {rating}</Text>
            <Text style={styles.ratingTitleText}>{ratingTitle(rating)}</Text>
          </View>
        )}
      </View>

      {/* Endless-mode status pill */}
      {!isPractice && (
        <View style={[styles.pill, loading ? styles.pillLoading : styles.pillReady]}>
          {loading ? (
            <>
              <ActivityIndicator size="small" color={palette.brand[400]} />
              <Text style={styles.pillText}>Working in the background…</Text>
            </>
          ) : (
            <>
              <CheckCircle size={16} weight="fill" color={theme.colors.success} />
              <Text style={[styles.pillText, { color: theme.colors.success }]}>Ready when you are!</Text>
            </>
          )}
        </View>
      )}

      <Animated.View style={{ opacity: fade, flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category + difficulty + progress */}
          <View style={styles.metaRow}>
            <View style={styles.chipRow}>
              <View style={[styles.catChip, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
                <Text style={[styles.catChipText, { color: catColor }]}>{question.category}</Text>
              </View>
              <View
                style={[
                  styles.catChip,
                  {
                    backgroundColor: LEVEL_COLORS[question.difficulty] + '22',
                    borderColor: LEVEL_COLORS[question.difficulty] + '55',
                  },
                ]}
              >
                <Text style={[styles.catChipText, { color: LEVEL_COLORS[question.difficulty] }]}>
                  {DIFFICULTY_LABELS[question.difficulty]}
                </Text>
              </View>
            </View>
            <Text style={styles.progress}>{progressLabel}</Text>
          </View>

          {/* Question */}
          <Text style={styles.question}>{question.question}</Text>

          {/* Options */}
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correct;
            const isChosen = i === selected;

            let optStyle: StyleProp<ViewStyle> = styles.option;
            let textColor = theme.colors.text;
            let icon: React.ReactNode = null;

            if (answered) {
              if (isCorrect) {
                optStyle = { ...styles.option, ...styles.optionCorrect };
                textColor = theme.colors.success;
                icon = <CheckCircle size={20} weight="fill" color={theme.colors.success} />;
              } else if (isChosen) {
                optStyle = { ...styles.option, ...styles.optionWrong };
                textColor = theme.colors.error;
                icon = <XCircle size={20} weight="fill" color={theme.colors.error} />;
              } else {
                optStyle = { ...styles.option, ...styles.optionDim };
                textColor = theme.colors.textSecondary;
              }
            }

            return (
              <TouchableOpacity
                key={i}
                style={optStyle}
                activeOpacity={answered ? 1 : 0.7}
                onPress={() => handleSelect(i)}
                disabled={answered}
              >
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {icon}
              </TouchableOpacity>
            );
          })}

          {/* Explanation */}
          {answered && (
            <View style={styles.explainBox}>
              <Text style={styles.explainLabel}>
                {selected === question.correct ? 'Correct ✓' : 'Not quite'}
              </Text>
              <Text style={styles.explainText}>{question.explanation}</Text>
              {!!ratingNote && (
                <Text
                  style={[
                    styles.ratingNote,
                    { color: ratingNote.delta >= 0 ? theme.colors.success : theme.colors.error },
                  ]}
                >
                  {ratingNote.text}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Footer actions */}
      <View style={styles.footer}>
        {answered ? (
          <Button
            label={isPractice && answeredCount >= (questionLimit as number) ? 'See results' : 'Next question'}
            variant="solid"
            color="brand"
            onPress={advance}
            isFullWidth
          />
        ) : (
          <Text style={styles.hint}>Tap an answer above</Text>
        )}

        {/* Endless mode: let the user leave once the task is done */}
        {!isPractice && !loading && onFinish && (
          <Button
            label="Continue →"
            variant="outline"
            color="success"
            onPress={onFinish}
            isFullWidth
            style={{ marginTop: theme.spacing.sm }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  title: { ...theme.typography.headingLg, color: theme.colors.text, fontWeight: theme.fontWeight.bold },
  subtitle: { ...theme.typography.textSm, color: theme.colors.textSecondary, marginTop: 2 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  pillLoading: { backgroundColor: palette.brand[500] + '1A', borderColor: palette.brand[500] + '44' },
  pillReady: { backgroundColor: palette.success[500] + '1A', borderColor: palette.success[500] + '55' },
  pillText: { ...theme.typography.textSm, color: palette.brand[400], fontWeight: theme.fontWeight.semibold },

  scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  catChip: { paddingVertical: 4, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.full, borderWidth: 1 },
  catChipText: { ...theme.typography.textXs, fontWeight: theme.fontWeight.bold },
  progress: { ...theme.typography.textXs, color: theme.colors.textSecondary },

  question: {
    ...theme.typography.headingMd,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 26,
    marginBottom: theme.spacing.lg,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  optionCorrect: { borderColor: theme.colors.success, backgroundColor: palette.success[500] + '1A' },
  optionWrong: { borderColor: theme.colors.error, backgroundColor: palette.error[500] + '1A' },
  optionDim: { opacity: 0.55 },
  optionText: { ...theme.typography.textMd, flex: 1, color: theme.colors.text },

  explainBox: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: palette.brand[500],
    padding: theme.spacing.lg,
  },
  explainLabel: {
    ...theme.typography.textSm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  explainText: { ...theme.typography.textSm, color: theme.colors.textSecondary, lineHeight: 20 },
  ratingNote: {
    ...theme.typography.textSm,
    fontWeight: theme.fontWeight.bold,
    marginTop: theme.spacing.sm,
  },
  ratingBadge: {
    alignItems: 'flex-end',
    backgroundColor: palette.brand[500] + '1A',
    borderColor: palette.brand[500] + '44',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  ratingValue: {
    ...theme.typography.textMd,
    color: palette.brand[400],
    fontWeight: theme.fontWeight.extrabold,
  },
  ratingTitleText: { ...theme.typography.textXs, color: theme.colors.textSecondary },

  footer: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md },
  hint: { ...theme.typography.textSm, color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: theme.spacing.md },

  resultsWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  resultsHeadline: { ...theme.typography.heading2xl, color: theme.colors.text, fontWeight: theme.fontWeight.extrabold, marginTop: theme.spacing.lg },
  resultsScore: { fontSize: 56, fontWeight: '800', marginTop: theme.spacing.md },
  resultsPct: { ...theme.typography.textLg, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  resultsRating: {
    ...theme.typography.textMd,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.md,
  },
  resultsButtons: { width: '100%', marginTop: theme.spacing['3xl'] },
});
