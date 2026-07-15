import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { theme, palette } from '../../theme';
import i18n from '../../i18n';
import { Button } from './Button';

export interface DialogProps {
  visible: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onAccept?: () => void;
  acceptLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode; // For custom content like inputs, lists, or images
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  description,
  onClose,
  onAccept,
  acceptLabel = 'Accept',
  cancelLabel = 'Cancel',
  icon,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.dialogContainer}
              accessibilityViewIsModal
              accessibilityLabel={title}
            >
              <View style={styles.header}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t('common.close', { defaultValue: 'Close' })}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {title && (
                  <Text style={[theme.typography.headingLg, styles.title]}>
                    {title}
                  </Text>
                )}
                {description && (
                  <Text style={[theme.typography.textSm, styles.description]}>
                    {description}
                  </Text>
                )}
                
                {/* Custom Content Area (Inputs, Lists, Images) */}
                {children && <View style={styles.customContent}>{children}</View>}
              </View>

              <View style={styles.footer}>
                <Button
                  label={cancelLabel}
                  variant="outline"
                  color="gray"
                  onPress={onClose}
                  style={styles.actionButton}
                />
                <Button
                  label={acceptLabel}
                  variant="solid"
                  color="brand"
                  onPress={onAccept}
                  style={styles.actionButton}
                />
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  dialogContainer: {
    backgroundColor: palette.gray[950],
    borderRadius: theme.borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: palette.gray[800],
    ...theme.shadow.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: palette.brand[950],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.brand[800],
  },
  closeButton: {
    marginLeft: 'auto',
  },
  closeIcon: {
    color: palette.gray[400],
    fontSize: 20,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    color: palette.gray[50],
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  description: {
    color: palette.gray[400],
    lineHeight: 20,
  },
  customContent: {
    marginTop: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.gray[900],
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
