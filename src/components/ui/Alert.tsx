import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';
import i18n from '../../i18n';
import { Button } from './Button';

export type AlertVariant = 'solid' | 'outline' | 'tinted';
export type AlertColor = 'brand' | 'success' | 'warning' | 'error' | 'gray';

export interface AlertProps {
  title?: string;
  description?: string;
  variant?: AlertVariant;
  color?: AlertColor;
  leftIcon?: React.ReactNode;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  title,
  description,
  variant = 'tinted',
  color = 'gray',
  leftIcon,
  onClose,
  actionLabel,
  onAction,
}) => {
  const getVariantStyle = () => {
    const p = palette[color];

    switch (variant) {
      case 'solid':
        return {
          bg: color === 'gray' ? palette.gray[800] : p[600],
          border: 'transparent',
          textTitle: color === 'gray' ? palette.gray[50] : palette.white,
          textDesc: color === 'gray' ? palette.gray[300] : p[100],
          iconColor: color === 'gray' ? palette.gray[300] : p[100],
        };
      case 'outline':
        return {
          bg: palette.gray[950],
          border: color === 'gray' ? palette.gray[700] : p[600],
          textTitle: color === 'gray' ? palette.gray[200] : p[300],
          textDesc: color === 'gray' ? palette.gray[400] : p[200],
          iconColor: color === 'gray' ? palette.gray[400] : p[400],
        };
      case 'tinted':
      default:
        return {
          bg: color === 'gray' ? palette.gray[900] : p[950],
          border: color === 'gray' ? palette.gray[800] : p[900],
          textTitle: color === 'gray' ? palette.gray[100] : p[200],
          textDesc: color === 'gray' ? palette.gray[400] : p[300],
          iconColor: color === 'gray' ? palette.gray[400] : p[400],
        };
    }
  };

  const vStyle = getVariantStyle();

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border,
          borderWidth: variant === 'outline' ? 1 : variant === 'tinted' ? 1 : 0,
        },
      ]}
    >
      <View style={styles.topRow}>
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <View style={styles.textContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                theme.typography.headingSm,
                { color: vStyle.textTitle },
              ]}
            >
              {title}
            </Text>
          )}
          {description && (
            <Text
              style={[
                styles.description,
                theme.typography.textSm,
                { color: vStyle.textDesc },
              ]}
            >
              {description}
            </Text>
          )}
        </View>

        {(actionLabel || onClose) && (
          <View style={styles.actionsContainer}>
            {actionLabel && (
              <Button
                label={actionLabel}
                size="sm"
                variant={variant === 'solid' ? 'outline' : 'solid'}
                color={color === 'gray' ? 'gray' : color}
                onPress={onAction}
                style={styles.actionButton}
              />
            )}
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={i18n.t('common.close', { defaultValue: 'Close' })}
              >
                {/* Fallback X if no icon passed, usually handled by caller or generic Text */}
                <Text style={{ color: vStyle.iconColor, fontSize: 18, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftIconContainer: {
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
  },
  description: {
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  actionButton: {
    marginRight: theme.spacing.sm,
  },
});
