import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  /**
   * `plain` is the default surface. `row` lays its children out horizontally
   * and centres them — the shape used by list-style cards.
   */
  variant?: 'plain' | 'row';
  /** Override the canonical radius/padding when a screen genuinely differs. */
  radius?: number;
  padding?: number;
  background?: string;
  borderColor?: string;
  /** Drop the 1px border entirely (used by flat, tinted cards). */
  bordered?: boolean;
  gap?: number;
  onPress?: () => void;
  /** Matches the caller's existing feedback; RN's default is 0.2. */
  activeOpacity?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The app's card surface.
 *
 * Defaults come from `theme.card`, so the common case needs no styling at all.
 * Anything a screen wants different is passed as a prop rather than redeclared
 * in a private StyleSheet — which is how 20 near-identical `card:` styles drifted
 * into 19 different shapes.
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'plain',
  radius = theme.card.radius,
  padding = theme.card.padding,
  background = theme.card.background,
  borderColor = theme.card.border,
  bordered = true,
  gap,
  onPress,
  activeOpacity = 0.7,
  accessibilityLabel,
  style,
  testID,
}) => {
  const composed: StyleProp<ViewStyle> = [
    variant === 'row' && styles.row,
    {
      borderRadius: radius,
      padding,
      backgroundColor: background,
      // 1, not hairlineWidth — every existing card uses a literal 1px border and
      // hairlineWidth is 0.5 on most devices.
      borderWidth: bordered ? 1 : 0,
      borderColor: bordered ? borderColor : undefined,
    },
    gap !== undefined && { gap },
    style,
  ];

  if (!onPress) {
    return <View style={composed} testID={testID}>{children}</View>;
  }

  return (
    <TouchableOpacity
      style={composed}
      onPress={onPress}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
};

// No default `overflow: 'hidden'` — it would clip the shadows some callers set.
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.card.gap,
  },
});
