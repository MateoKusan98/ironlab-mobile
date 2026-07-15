import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { theme, palette } from '../../theme';

export type ButtonVariant = 'solid' | 'outline' | 'tinted' | 'ghost';
export type ButtonColor = 'brand' | 'success' | 'warning' | 'error' | 'gray';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode; // Centered override icon from specs
  textStyle?: TextStyle;
  isFullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'solid',
  color = 'brand',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  icon,
  isFullWidth = false,
  textStyle: customTextStyle,
  style,
  ...rest
}) => {
  const isDisabled = disabled || isLoading;

  // Resolve base styles based on color & variant
  const getVariantStyle = (): { bg: string; border: string; text: string } => {
    const isDarkBackground = theme.colors.background === '#09090B'; // Context awareness
    const c = palette[color === 'gray' ? (isDarkBackground ? 'gray' : 'brand') : color]; // Gray defaults differently in dark mode for contrast if needed
    
    // Default fallback to gray if mapping is weird
    const p = palette[color] || palette.brand;

    switch (variant) {
      case 'solid':
        return {
          bg: color === 'gray' ? palette.gray[800] : p[600],
          border: 'transparent',
          text: color === 'gray' ? palette.gray[50] : '#ffffff',
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: color === 'gray' ? palette.gray[700] : p[600],
          text: color === 'gray' ? palette.gray[200] : p[400], // Lighter text on dark mode outline
        };
      case 'tinted':
        return {
          // Tinted looks like a very subtle background. Because we are in dark mode (bg: 09090B), 
          // we use the 900 or 950 shade to create a subtle glow/tint, and lighter text
          bg: color === 'gray' ? palette.gray[800] : p[950],
          border: 'transparent',
          text: color === 'gray' ? palette.gray[200] : p[300],
        };
      case 'ghost':
        return {
          bg: 'transparent',
          border: 'transparent',
          text: color === 'gray' ? palette.gray[300] : p[400],
        };
      default:
        return { bg: p[600], border: 'transparent', text: '#fff' };
    }
  };

  const vStyle = getVariantStyle();

  // Resolve size
  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          py: theme.spacing.xs,
          px: theme.spacing.md,
          textStyle: theme.typography.textSm,
          radius: theme.borderRadius.md,
        };
      case 'lg':
        return {
          py: theme.spacing.md,
          px: theme.spacing['2xl'],
          textStyle: theme.typography.textLg,
          radius: theme.borderRadius.xl,
        };
      case 'md':
      default:
        return {
          py: theme.spacing.sm,
          px: theme.spacing.lg,
          textStyle: theme.typography.textMd,
          radius: theme.borderRadius.lg,
        };
    }
  };

  const sStyle = getSizeStyle();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={[
        styles.base,
        {
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border,
          borderWidth: variant === 'outline' ? 1 : 0,
          height: 48,
          paddingHorizontal: sStyle.px,
          borderRadius: sStyle.radius,
          width: isFullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={vStyle.text} style={styles.loader} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon || leftIcon}
          <Text
            style={[
              styles.text,
              sStyle.textStyle,
              { color: vStyle.text },
              !!leftIcon || !!icon ? { marginLeft: theme.spacing.xs } : undefined,
              !!rightIcon ? { marginRight: theme.spacing.xs } : undefined,
              customTextStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  loader: {
    paddingVertical: 2, // Keeps height consistent when loading
  },
});
