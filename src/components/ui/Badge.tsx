import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme, palette } from '../../theme';

export type BadgeVariant = 'solid' | 'tinted' | 'outline';
export type BadgeColor = 'brand' | 'success' | 'warning' | 'error' | 'gray';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label?: string;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'tinted',
  color = 'gray',
  size = 'md',
  leftIcon,
  rightIcon,
  style,
}) => {
  // Determine styles based on color/variant for dark mode
  const getVariantStyle = () => {
    const p = palette[color];

    switch (variant) {
      case 'solid':
        return {
          bg: color === 'gray' ? palette.gray[700] : p[600],
          border: 'transparent',
          text: color === 'gray' ? palette.gray[50] : '#FFF',
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: color === 'gray' ? palette.gray[700] : p[600],
          text: color === 'gray' ? palette.gray[300] : p[400],
        };
      case 'tinted':
      default:
        // Soft tint background in dark mode
        return {
          bg: color === 'gray' ? palette.gray[800] : p[950],
          border: color === 'gray' ? palette.gray[800] : p[950],
          text: color === 'gray' ? palette.gray[300] : p[300],
        };
    }
  };

  const vStyle = getVariantStyle();

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          py: 2,
          px: theme.spacing.xs,
          textStyle: { fontSize: 10, lineHeight: 14 },
          radius: theme.borderRadius.sm,
        };
      case 'lg':
        return {
          py: 6,
          px: theme.spacing.md,
          textStyle: theme.typography.textSm,
          radius: theme.borderRadius.lg,
        };
      case 'md':
      default:
        return {
          py: 4,
          px: theme.spacing.sm,
          textStyle: theme.typography.textXs,
          radius: theme.borderRadius.md,
        };
    }
  };

  const sStyle = getSizeStyle();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border,
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical: sStyle.py,
          paddingHorizontal: sStyle.px,
          borderRadius: sStyle.radius,
        },
        style,
      ]}
    >
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      {label && (
        <Text
          style={[
             sStyle.textStyle,
            { color: vStyle.text, fontWeight: theme.fontWeight.medium },
          ]}
        >
          {label}
        </Text>
      )}
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  leftIcon: {
    marginRight: 4,
  },
  rightIcon: {
    marginLeft: 4,
  },
});
