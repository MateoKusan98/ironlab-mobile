import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import { Exercise } from '../workoutState';
import { styles } from '../ActiveWorkoutScreen.styles';

export interface ExerciseReviewProps {
  exercise: Exercise;
  onRate: (rating: number) => void;
  onChangeNotes: (notes: string) => void;
}

/**
 * The "HOW DID IT GO?" self-report — shown once at least one set is completed.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export const ExerciseReview: React.FC<ExerciseReviewProps> = ({ exercise: ex, onRate, onChangeNotes }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.exerciseReview}>
      <Text style={styles.reviewLabel}>HOW DID IT GO?</Text>

      {/* Remind the user what the plan asked them to focus on, so
          their Technique rating/notes are informed, not a guess. */}
      {ex.cue ? (
        <View style={styles.reviewCueRow}>
          <Text style={styles.reviewCueLabel}>{t('activeWorkout.coachFocus')}</Text>
          <Text style={styles.reviewCueText}>"{ex.cue}"</Text>
        </View>
      ) : null}

      {/* Technique rating 1–5 */}
      <View style={styles.techRow}>
        <Text style={styles.techCaption}>Technique</Text>
        <View style={styles.techDots}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={n}
              onPress={() => onRate(n)}
              style={[styles.techDot, (ex.techniqueRating ?? 0) >= n && styles.techDotActive]}
            >
              <Text style={[styles.techDotText, (ex.techniqueRating ?? 0) >= n && styles.techDotTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <TextInput
        style={styles.reviewNotes}
        value={ex.exerciseNotes ?? ''}
        onChangeText={onChangeNotes}
        placeholder={t('activeWorkout.techniqueNotes')}
        placeholderTextColor={palette.gray[600]}
        multiline
      />
    </View>
  );
};
