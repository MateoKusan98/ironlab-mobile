import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette } from '../../theme';
import { Card } from './Card';

export interface InfoSheetProps {
  visible: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Label for the dismiss button at the bottom. */
  confirmLabel?: string;
}

/**
 * A centred, tap-outside-to-dismiss explanatory sheet: title, close ✕, body and
 * a single dismiss button.
 *
 * Both in-workout modals (the RPE guide and the saved-cue reminder) were the
 * same shell rendered twice with the body swapped, so the shell lives here and
 * they pass only what differs.
 */
export const InfoSheet: React.FC<InfoSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  confirmLabel,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Card
          background={palette.gray[900]}
          borderColor={palette.gray[700]}
          padding={20}
          style={styles.cardBox}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
            >
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {children}

          <TouchableOpacity style={styles.confirm} onPress={onClose} accessibilityRole="button">
            <Text style={styles.confirmText}>
              {confirmLabel ?? t('common.gotIt', { defaultValue: 'Got it' })}
            </Text>
          </TouchableOpacity>
        </Card>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardBox: { width: '100%', maxWidth: 380 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '800', color: palette.white },
  close: { fontSize: 18, color: palette.gray[400], paddingLeft: 12 },
  subtitle: { fontSize: 13, color: palette.gray[400], marginBottom: 16 },
  confirm: {
    backgroundColor: palette.brand[600],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: palette.white },
});
