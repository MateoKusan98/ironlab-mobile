import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, palette } from '../../theme';
import { Button } from './Button';

export interface TooltipProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  arrowPosition?: 'up' | 'down';
  color?: 'brand' | 'warning' | 'error' | 'gray';
  style?: any;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  arrowPosition = 'up',
  color = 'gray',
  style,
}) => {
  const isDark = color === 'gray'; // Based on Figma, gray tooltips are dark
  
  const getBackgroundColor = () => {
    switch (color) {
      case 'brand': return palette.brand[600];
      case 'warning': return palette.warning[600];
      case 'error': return palette.error[600];
      case 'gray':
      default: return palette.gray[900];
    }
  };

  const bgColor = getBackgroundColor();

  return (
    <View style={[styles.container, style]}>
      {arrowPosition === 'up' && (
        <View style={[styles.arrowUp, { borderBottomColor: bgColor }]} />
      )}

      <View style={[styles.contentBox, { backgroundColor: bgColor }]}>
        <Text style={[theme.typography.textMd, styles.title]}>
          {title}
        </Text>
        <Text style={[theme.typography.textSm, styles.description]}>
          {description}
        </Text>
        
        {actionLabel && (
          <View style={styles.actionRow}>
            <Button
              label={actionLabel}
              onPress={onAction}
              size="sm"
              variant={isDark ? 'solid' : 'tinted'} // Tinted buttons inside bright tooltips usually contrast well
              color={isDark ? 'brand' : 'gray'}
              style={styles.actionButton}
            />
          </View>
        )}
      </View>

      {arrowPosition === 'down' && (
        <View style={[styles.arrowDown, { borderTopColor: bgColor }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: theme.spacing.sm,
    maxWidth: 320,
  },
  contentBox: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    ...theme.shadow.md,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  actionRow: {
    marginTop: theme.spacing.md,
    alignItems: 'flex-end',
  },
  actionButton: {
    alignSelf: 'flex-end',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginLeft: theme.spacing.xl,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginLeft: theme.spacing.xl,
  },
});
