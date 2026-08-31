import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../../theme';
import { InfoSheet } from '../../../components/ui/InfoSheet';
import { TechniqueNudge } from '../../../hooks/useTechniqueNudge';

export interface TechniqueNudgeModalProps {
  nudge: TechniqueNudge | null;
  onDismiss: () => void;
  /** Take the athlete to the form-check screen. */
  onFilm: () => void;
  /** Localised exercise-name resolver (`useExerciseName`). */
  exName: (name: string) => string;
}

/**
 * Asks for a form check on a movement the coach has never seen, at the moment it is
 * in front of the athlete.
 *
 * The dismiss button is the primary one and reads "Not now" — a real answer, given
 * equal weight, because the session is never blocked on this. The ask returns next
 * session because the movement is still unfilmed, not because the app kept score.
 */
export const TechniqueNudgeModal: React.FC<TechniqueNudgeModalProps> = ({
  nudge,
  onDismiss,
  onFilm,
  exName,
}) => {
  const { t } = useTranslation();
  const movement = nudge ? exName(nudge.lift.label) : '';

  return (
    <InfoSheet
      visible={nudge !== null}
      onClose={onDismiss}
      title={`🎥 ${t('activeWorkout.techniqueNudgeTitle', { defaultValue: 'Film a set of' })} ${movement}`}
      subtitle={t('activeWorkout.techniqueNudgeSubtitle', {
        defaultValue: 'One of the lifts you train most — and the coach has never seen it.',
      })}
      confirmLabel={t('activeWorkout.techniqueNudgeLater', { defaultValue: 'Not now' })}
    >
      <Text style={styles.body}>
        {t('activeWorkout.techniqueNudgeBody', {
          defaultValue:
            'One working set from the side is enough. You get a scored breakdown, and the corrections come back as cues on this exercise next time.',
        })}
      </Text>
      <TouchableOpacity onPress={onFilm} accessibilityRole="button" style={styles.filmBtn}>
        <Text style={styles.filmText}>
          {t('activeWorkout.techniqueNudgeFilm', { defaultValue: 'Film a set now →' })}
        </Text>
      </TouchableOpacity>
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: 15, color: theme.colors.text, lineHeight: 22, paddingVertical: 4 },
  filmBtn: { paddingTop: 10, paddingBottom: 4, alignSelf: 'flex-start' },
  filmText: { fontSize: 15, color: palette.brand[400], fontWeight: '700' },
});
