import React from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from 'phosphor-react-native';
import { palette } from '../../../theme';
import { styles } from '../AICoachPlanScreen.styles';

export interface PlanHeaderProps {
  generatedAt: string | null;
  isAdmin: boolean;
  generating: boolean;
  regenUsedToday: boolean;
  showRegenInput: boolean;
  regenNote: string;
  setShowRegenInput: React.Dispatch<React.SetStateAction<boolean>>;
  setRegenNote: (note: string) => void;
  setDebugVisible: (visible: boolean) => void;
  handleGenerate: (note?: string) => void;
}

/**
 * The plan screen header — title, when the session was built, the admin prompt-debug
 * button, and the once-a-day "New plan" with its optional note.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export const PlanHeader: React.FC<PlanHeaderProps> = ({
  generatedAt, isAdmin, generating, regenUsedToday, showRegenInput, regenNote,
  setShowRegenInput, setRegenNote, setDebugVisible, handleGenerate,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('aiCoach.todaysSession')}</Text>
          {generatedAt && (
            <Text style={styles.headerSub}>
              Ready since {new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.debugBtn}
            onPress={() => setDebugVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Prompt debug"
          >
            <MagnifyingGlass size={18} weight="bold" color={palette.gray[400]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.regenBtn, regenUsedToday && styles.regenBtnDisabled]}
          onPress={() => {
            if (regenUsedToday) {
              Alert.alert(t('aiCoach.regenLimitTitle'), t('aiCoach.regenLimitMsg'));
              return;
            }
            setShowRegenInput(s => !s);
            if (showRegenInput) setRegenNote('');
          }}
          disabled={generating || regenUsedToday}
        >
          <Text style={[styles.regenBtnText, regenUsedToday && styles.regenBtnTextDisabled]}>
            {regenUsedToday ? t('aiCoach.regenUsed') : showRegenInput ? t('aiCoach.regenCancel') : t('aiCoach.newPlan')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Regen note input — shown when user taps New Plan */}
      {showRegenInput && !regenUsedToday && (
        <View style={styles.noteRow}>
          <TextInput
            style={styles.noteInput}
            placeholder={t('aiCoach.regenNotePlaceholder')}
            placeholderTextColor={palette.gray[600]}
            value={regenNote}
            onChangeText={setRegenNote}
            maxLength={200}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => handleGenerate(regenNote)}
          />
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.noteGenerateBtn}
            onPress={() => handleGenerate(regenNote)}
            disabled={generating}
          >
            <Text style={styles.noteGenerateBtnText}>{t('aiCoach.regenConfirm')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};
