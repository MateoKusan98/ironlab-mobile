import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../../theme';
import { InfoSheet } from '../../../components/ui/InfoSheet';
import { CueReminder } from '../../../hooks/useExerciseCues';

export interface CueReminderModalProps {
  /** The pending reminder, or null when nothing is showing. */
  reminder: CueReminder | null;
  onDismiss: () => void;
  /** Localised exercise-name resolver (`useExerciseName`). */
  exName: (name: string) => string;
}

/**
 * Surfaces the technique cues the athlete saved for an exercise, at the moment
 * that exercise becomes the one they're about to do — a cue written three weeks
 * ago is worthless if it only appears in a settings screen.
 */
export const CueReminderModal: React.FC<CueReminderModalProps> = ({
  reminder,
  onDismiss,
  exName,
}) => {
  const { t } = useTranslation();

  return (
    <InfoSheet
      visible={reminder !== null}
      onClose={onDismiss}
      title={`💡 ${t('activeWorkout.cueReminderTitle', { defaultValue: 'Remember for' })} ${reminder ? exName(reminder.name) : ''}`}
      subtitle={t('activeWorkout.cueReminderSubtitle', { defaultValue: 'Cues you saved last time:' })}
      confirmLabel={t('activeWorkout.cueReminderGotIt', { defaultValue: "Got it — let's go" })}
    >
      {(reminder?.cues ?? []).map((c) => (
        <View key={c.id} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{c.text}</Text>
        </View>
      ))}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  bullet: { fontSize: 15, color: palette.brand[400], lineHeight: 22 },
  text: { flex: 1, fontSize: 15, color: theme.colors.text, lineHeight: 22 },
});
