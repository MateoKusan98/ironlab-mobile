import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface Props {
  title: string;
  subtitle?: string;
  left: React.ReactNode;
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<Props> = ({ title, subtitle, left, right }) => (
  <View style={styles.header}>
    <View style={styles.side}>{left}</View>
    <View style={styles.center}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    <View style={styles.side}>{right ?? null}</View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 0,
  },
  side: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
});
