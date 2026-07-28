import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { theme, palette } from '../../theme';
import { Badge, BadgeColor } from './Badge';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AccordionProps {
  title: string;
  label?: string; // Optional badge label next to title
  labelColor?: BadgeColor;
  content: string; // Detail text
  actionLabel?: string; // Optional button inside expanded area
  onAction?: () => void;
  defaultExpanded?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  label,
  labelColor = 'warning',
  content,
  actionLabel,
  onAction,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View
      style={[
        styles.container,
        expanded && styles.containerExpanded,
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={toggleAccordion}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
      >
        <View style={styles.titleRow}>
          <Text
            style={[
              theme.typography.headingMd,
              styles.titleText,
              { color: expanded ? palette.gray[50] : palette.gray[200] },
            ]}
          >
            {title}
          </Text>
          {label && (
            <Badge
              label={label}
              color={labelColor}
              size="sm"
              variant="tinted"
              style={styles.labelBadge}
            />
          )}
        </View>

        <View style={styles.chevronContainer}>
          {/* Simple unicode chevron placeholder, assumes caller might pass actual SVG */}
          <Text
            style={[
              styles.chevron,
              { transform: [{ rotate: expanded ? '180deg' : '0deg' }] },
              { color: palette.gray[400] },
            ]}
          >
            ⌄
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.contentContainer}>
          <Text style={[theme.typography.textSm, styles.contentText]}>
            {content}
          </Text>
          {actionLabel && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onAction}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
            >
              <Text style={[theme.typography.textSm, styles.actionText]}>
                {actionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.gray[950],
    borderWidth: 1,
    borderColor: palette.gray[800],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  containerExpanded: {
    borderColor: palette.brand[600], // Highlight border on expand (matches image active state)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleText: {
    fontWeight: theme.fontWeight.medium,
  },
  labelBadge: {
    marginLeft: theme.spacing.sm,
  },
  chevronContainer: {
    marginLeft: theme.spacing.md,
  },
  chevron: {
    fontSize: 24,
    lineHeight: 24,
    marginTop: -8, // Unicode tweak
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingTop: 0,
  },
  contentText: {
    color: palette.gray[400],
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: palette.brand[600],
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  actionText: {
    color: palette.white,
    fontWeight: theme.fontWeight.semibold,
  },
});
