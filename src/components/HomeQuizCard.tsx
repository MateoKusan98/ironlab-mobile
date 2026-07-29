import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Brain, CheckCircle, XCircle, CaretRight } from 'phosphor-react-native';
import { theme, palette } from '../theme';
import { ratingTitle, DIFFICULTY_LABELS } from '../data/fitnessQuiz';
import { useRatedQuiz } from '../hooks/useRatedQuiz';

import { Card } from '../components/ui';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
/**
 * Compact rated-quiz card for the Home screen: one question at a time,
 * answered inline. Shares the persistent Elo rating with the full quiz
 * (same hook), so answers here move the same rating and can unlock the
 * knowledge badges.
 */
export const HomeQuizCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rating, question, scoreAnswer, nextQuestion } = useRatedQuiz();

  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState<{ delta: number; text: string } | null>(null);

  const answered = selected !== null;

  const handleSelect = (i: number) => {
    if (answered) return;
    setSelected(i);
    const result = scoreAnswer(i === question.correct);
    setNote({
      delta: result.delta,
      text: `${result.delta >= 0 ? '+' : ''}${result.delta} → ${result.rating}`,
    });
  };

  const advance = () => {
    nextQuestion();
    setSelected(null);
    setNote(null);
  };

  return (
    <Card radius={theme.borderRadius.xl} padding={theme.spacing.lg} style={style}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Brain size={18} weight="fill" color={palette.brand[400]} />
        <Text style={styles.headerTitle}>Quick Quiz</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.ratingChip} onPress={() => navigation.navigate('Quiz')} hitSlop={8}>
          <Text style={styles.ratingChipText}>⚡ {rating} · {ratingTitle(rating)}</Text>
          <CaretRight size={12} weight="bold" color={palette.brand[400]} />
        </TouchableOpacity>
      </View>

      {/* Question */}
      <Text style={styles.meta}>{question.category} · {DIFFICULTY_LABELS[question.difficulty]}</Text>
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
            optStyle = [styles.option, styles.optionCorrect];
            textColor = theme.colors.success;
            icon = <CheckCircle size={16} weight="fill" color={theme.colors.success} />;
          } else if (isChosen) {
            optStyle = [styles.option, styles.optionWrong];
            textColor = theme.colors.error;
            icon = <XCircle size={16} weight="fill" color={theme.colors.error} />;
          } else {
            optStyle = [styles.option, styles.optionDim];
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

      {/* Post-answer: explanation + rating delta + next */}
      {answered && (
        <>
          <Text style={styles.explain} numberOfLines={3}>{question.explanation}</Text>
          <View style={styles.footerRow}>
            {!!note && (
              <Text style={[styles.delta, { color: note.delta >= 0 ? theme.colors.success : theme.colors.error }]}>
                {note.text}
              </Text>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.nextBtn} onPress={advance} hitSlop={8}>
              <Text style={styles.nextBtnText}>Next question</Text>
              <CaretRight size={14} weight="bold" color={palette.brand[400]} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.headingSm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.bold,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: palette.brand[500] + '1A',
    borderColor: palette.brand[500] + '44',
    borderWidth: 1,
    borderRadius: theme.borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.sm,
  },
  ratingChipText: {
    ...theme.typography.textXs,
    color: palette.brand[400],
    fontWeight: theme.fontWeight.bold,
  },
  meta: {
    ...theme.typography.textXs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  question: {
    ...theme.typography.textMd,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 21,
    marginBottom: theme.spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  optionCorrect: { borderColor: theme.colors.success, backgroundColor: palette.success[500] + '1A' },
  optionWrong: { borderColor: theme.colors.error, backgroundColor: palette.error[500] + '1A' },
  optionDim: { opacity: 0.55 },
  optionText: { ...theme.typography.textSm, flex: 1 },
  explain: {
    ...theme.typography.textXs,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: theme.spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  delta: {
    ...theme.typography.textSm,
    fontWeight: theme.fontWeight.bold,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  nextBtnText: {
    ...theme.typography.textSm,
    color: palette.brand[400],
    fontWeight: theme.fontWeight.bold,
  },
});
