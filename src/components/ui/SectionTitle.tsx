import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { theme } from '../../theme';

export interface SectionTitleProps {
  children: React.ReactNode;
  /**
   * `overline` is the small uppercase label above a group of cards; `heading`
   * is the plain title used inside one.
   */
  variant?: 'overline' | 'heading';
  color?: string;
  /** Extra top spacing when the section follows other content. */
  spaced?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * A section heading.
 *
 * Fourteen screens each declared their own `sectionTitle:` and ended up with
 * eight different font sizes for the same visual role. The two variants here
 * cover almost all of them; the rest pass an explicit override.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  variant = 'overline',
  color,
  spaced = false,
  style,
}) => (
  <Text
    accessibilityRole="header"
    style={[
      variant === 'overline' ? styles.overline : styles.heading,
      color ? { color } : null,
      spaced && styles.spaced,
      style,
    ]}
  >
    {children}
  </Text>
);

const styles = StyleSheet.create({
  overline: {
    ...theme.sectionTitle.overline,
    color: theme.colors.textTertiary,
  },
  heading: {
    ...theme.sectionTitle.heading,
    color: theme.colors.text,
  },
  spaced: {
    marginTop: 28,
  },
});
