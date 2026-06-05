import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
  isActive?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, separator = '>' }) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const color = item.isActive
          ? palette.gray[50]
          : palette.gray[400];

        return (
          <React.Fragment key={index}>
            <TouchableOpacity
              onPress={item.onPress}
              disabled={!item.onPress || item.isActive}
              style={styles.item}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                style={[
                  theme.typography.textSm,
                  styles.itemText,
                  { color, fontWeight: item.isActive ? theme.fontWeight.medium : theme.fontWeight.regular },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>

            {!isLast && (
              <View style={styles.separatorContainer}>
                <Text style={styles.separator}>{separator}</Text>
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  item: {
    paddingVertical: 4,
  },
  itemText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorContainer: {
    marginHorizontal: theme.spacing.sm,
  },
  separator: {
    color: palette.gray[600],
    fontSize: 14,
  },
});
