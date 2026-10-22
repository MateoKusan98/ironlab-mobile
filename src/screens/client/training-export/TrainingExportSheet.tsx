import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoSheet } from '../../../components/ui/InfoSheet';
import { theme, palette } from '../../../theme';
import { TrainingExportKind } from '../../../services/session.service';
import { TRAINING_EXPORT_OPTIONS, shareTrainingExport } from './trainingExport';

/**
 * Pick what to export — the whole log as JSON, or one CSV table — and share it. One
 * download at a time: each one reads the athlete's entire history.
 */
export const TrainingExportSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<TrainingExportKind | null>(null);

  const exportKind = async (kind: TrainingExportKind) => {
    setBusy(kind);
    try {
      await shareTrainingExport(kind, t('trainingExport.title'));
    } catch {
      Alert.alert(t('common.error'), t('trainingExport.failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <InfoSheet
      visible={visible}
      onClose={onClose}
      title={t('trainingExport.title')}
      subtitle={t('trainingExport.subtitle')}
      confirmLabel={t('common.close')}
    >
      <View style={styles.options}>
        {TRAINING_EXPORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.kind}
            style={styles.option}
            onPress={() => exportKind(option.kind)}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy !== null, busy: busy === option.kind }}
          >
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t(option.titleKey)}</Text>
              <Text style={styles.optionSub}>{t(option.subKey)}</Text>
            </View>
            {busy === option.kind && <ActivityIndicator size="small" color={palette.brand[400]} />}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footnote}>{t('trainingExport.footnote')}</Text>
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  options: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.gray[700],
    backgroundColor: palette.gray[800],
  },
  optionText: { flex: 1 },
  optionTitle: { color: theme.colors.text, fontSize: theme.typography.textMd.fontSize, fontWeight: '700' },
  optionSub: { color: theme.colors.textSecondary, fontSize: theme.typography.textSm.fontSize, marginTop: 2 },
  footnote: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.textXs.fontSize,
    lineHeight: 16,
    marginTop: theme.spacing.md,
  },
});
