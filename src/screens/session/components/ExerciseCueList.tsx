import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import { ExerciseCue } from '../../../services/exerciseCue.service';
import { styles } from '../ActiveWorkoutScreen.styles';

export interface ExerciseCueListProps {
  cues: ExerciseCue[];
  formOpen: boolean;
  newCueText: string;
  savingCue: boolean;
  onChangeCueText: (text: string) => void;
  onOpenForm: () => void;
  onCloseForm: () => void;
  onSave: () => void;
  onDelete: (cue: ExerciseCue) => void;
}

/**
 * Cues for this exercise — the athlete's own notes plus the corrections their last
 * form check on this movement raised — and the inline form to add another for next time.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export const ExerciseCueList: React.FC<ExerciseCueListProps> = ({
  cues, formOpen, newCueText, savingCue, onChangeCueText, onOpenForm, onCloseForm, onSave, onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.personalCuesBlock}>
      {cues.map((c) => {
        const fromFormCheck = c.source === 'form-check';
        return (
          <View key={c.id} style={styles.personalCueRow}>
            <View style={styles.personalCueBody}>
              <Text style={styles.personalCueText}>
                {fromFormCheck ? '🎥' : '💡'} {c.text}
              </Text>
              {fromFormCheck ? (
                <Text style={styles.personalCueOrigin}>
                  {t('activeWorkout.cueFromFormCheck', { defaultValue: 'From your form check' })}
                </Text>
              ) : null}
            </View>
            {/* No delete on a form-check cue: it is derived from the
                verdict record, so there is no row to remove. It goes
                when the verdict ages out or the lift is re-filmed. */}
            {fromFormCheck ? null : (
              <TouchableOpacity
                onPress={() => onDelete(c)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('activeWorkout.deleteCue', { defaultValue: 'Delete cue' })}
              >
                <Text style={styles.personalCueDelete}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      {formOpen ? (
        <View style={styles.addCueForm}>
          <TextInput
            style={styles.addCueInput}
            value={newCueText}
            onChangeText={onChangeCueText}
            placeholder={t('activeWorkout.cuePlaceholder', { defaultValue: 'e.g. Pull the elbows down' })}
            placeholderTextColor={palette.gray[600]}
            autoFocus
            multiline
            maxLength={500}
          />
          <View style={styles.addCueActions}>
            <TouchableOpacity
              onPress={onCloseForm}
              accessibilityRole="button"
            >
              <Text style={styles.addCueCancel}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addCueSave, (!newCueText.trim() || savingCue) && styles.addCueSaveDisabled]}
              onPress={onSave}
              disabled={savingCue || !newCueText.trim()}
              accessibilityRole="button"
            >
              {savingCue
                ? <ActivityIndicator color={palette.white} size="small" />
                : <Text style={styles.addCueSaveText}>{t('common.save', { defaultValue: 'Save' })}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addCueBtn}
          onPress={onOpenForm}
          accessibilityRole="button"
        >
          <Text style={styles.addCueBtnText}>
            + {t('activeWorkout.addCue', { defaultValue: 'Add a cue for next time' })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
