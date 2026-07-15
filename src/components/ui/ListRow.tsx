import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme, palette } from '../../theme';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string; // Optional image URL
  badgeLabel?: string;
  badgeColor?: 'brand' | 'success' | 'warning' | 'error' | 'gray';
  progress?: number; // 0-100
  onPress?: () => void;
  onActionPress?: () => void; // Trailing action (e.g. edit/delete)
  actionLabel?: string; // Accessibility label for the trailing action button
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  avatarUrl,
  badgeLabel,
  badgeColor,
  progress,
  onPress,
  onActionPress,
  actionLabel = 'More options',
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? [title, subtitle].filter(Boolean).join(', ') : undefined}
    >
      <View style={styles.leftContent}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        
        <View style={styles.textContainer}>
          <Text style={[theme.typography.textMd, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[theme.typography.textSm, styles.subtitle]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.centerContent}>
        {badgeLabel && (
          <Badge label={badgeLabel} color={badgeColor} variant="tinted" size="sm" />
        )}

        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} height={6} style={styles.progressBar} />
            <Text style={[theme.typography.textXs, styles.progressText]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightContent}>
        {onActionPress && (
          <TouchableOpacity
            onPress={onActionPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionIcon}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[900],
    backgroundColor: 'transparent',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
    backgroundColor: palette.gray[800],
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
    backgroundColor: palette.gray[800],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: palette.gray[50],
    fontWeight: theme.fontWeight.medium,
  },
  subtitle: {
    color: palette.gray[400],
    marginTop: 2,
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    marginLeft: theme.spacing.md,
  },
  progressBar: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  progressText: {
    color: palette.gray[400],
    width: 30,
    textAlign: 'right',
  },
  rightContent: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 32,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
  actionIcon: {
    fontSize: 24,
    color: palette.gray[400],
    lineHeight: 24,
  },
});
