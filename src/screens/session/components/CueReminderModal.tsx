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
 * Surfaces the technique cues for an exercise at the moment that exercise becomes
 * the one they're about to do — a cue written three weeks ago is worthless if it
 * only appears in a settings screen, and so is a form-check verdict the athlete
 * read once on the results screen.
 *
 * Form-check cues are labelled, because "the coach said this about your bar path"
 * carries different weight than a note the athlete jotted to themselves.
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
      subtitle={t('activeWorkout.cueReminderSubtitle', { defaultValue: 'What to remember this time:' })}
      confirmLabel={t('activeWorkout.cueReminderGotIt', { defaultValue: "Got it — let's go" })}
    >
      {(reminder?.cues ?? []).map((c) => (
        <View key={c.id} style={styles.row}>
          <Text style={styles.bullet}>{c.source === 'form-check' ? '🎥' : '•'}</Text>
          <View style={styles.body}>
            <Text style={styles.text}>{c.text}</Text>
            {c.source === 'form-check' ? (
              <Text style={styles.origin}>
                {t('activeWorkout.cueFromFormCheck', { defaultValue: 'From your form check' })}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  bullet: { fontSize: 15, color: palette.brand[400], lineHeight: 22 },
  body: { flex: 1 },
  text: { fontSize: 15, color: theme.colors.text, lineHeight: 22 },
  origin: { fontSize: 12, color: palette.gray[500], marginTop: 2 },
});
