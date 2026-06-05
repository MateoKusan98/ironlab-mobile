import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill'; // Maps to Figma tab variants
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'underline',
}) => {
  return (
    <View style={[styles.container, variant === 'pill' && styles.pillContainer]}>
      {items.map((item) => {
        const isActive = activeId === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.tab,
              variant === 'pill' ? styles.pillTab : styles.underlineTab,
              isActive && variant === 'pill' && styles.activePillTab,
              isActive && variant === 'underline' && styles.activeUnderlineTab,
            ]}
            onPress={() => onChange(item.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                theme.typography.textSm,
                styles.label,
                isActive ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.md,
  },
  pillContainer: {
    backgroundColor: palette.gray[900],
    borderRadius: theme.borderRadius.full,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  underlineTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingBottom: theme.spacing.sm, // compensate for border
  },
  activeUnderlineTab: {
    borderBottomColor: palette.brand[500],
  },
  pillTab: {
    borderRadius: theme.borderRadius.full,
  },
  activePillTab: {
    backgroundColor: palette.gray[700],
    ...theme.shadow.sm,
  },
  label: {
    fontWeight: theme.fontWeight.medium,
  },
  activeLabel: {
    color: palette.gray[50], // White for active state in dark mode
  },
  inactiveLabel: {
    color: palette.gray[400], // Gray for inactive
  },
});
