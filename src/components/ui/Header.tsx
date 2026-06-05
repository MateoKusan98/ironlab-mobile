import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';
import { ProgressBar } from './ProgressBar';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  progress?: number; // If provided, shows a progress bar under the title
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  progress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Left Side (Back Button or Placeholder) */}
        <View style={styles.sideSlot}>
          {showBack && (
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.icon}>‹</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center Title / Subtitle */}
        <View style={styles.centerSlot}>
          <Text style={[theme.typography.headingMd, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[theme.typography.textSm, styles.subtitle]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Side */}
        <View style={[styles.sideSlot, { alignItems: 'flex-end' }]}>
          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={styles.rightIconWrapper}>
                {rightIcon}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Bar (Optional) */}
      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <Text style={[theme.typography.textXs, styles.progressLabel]}>
            Progress
          </Text>
          <ProgressBar progress={progress} height={4} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideSlot: {
    width: 40,
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  title: {
    color: palette.gray[50],
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: palette.gray[400],
    marginTop: 2,
  },
  icon: {
    fontSize: 28,
    color: palette.gray[200],
    lineHeight: 30,
    marginTop: -4,
  },
  rightIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  progressLabel: {
    color: palette.brand[500],
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.5,
  },
});
