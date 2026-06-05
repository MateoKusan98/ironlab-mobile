import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';

export interface CheckboxProps {
  label?: string;
  checked: boolean;
  onValueChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onValueChange,
  disabled,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      activeOpacity={0.8}
      onPress={() => onValueChange(!checked)}
      disabled={disabled}
    >
      <View
        style={[
          styles.box,
          checked ? styles.boxChecked : styles.boxUnchecked,
        ]}
      >
        {checked && <Text style={styles.checkIcon}>✓</Text>}
      </View>

      {label && (
        <Text style={[theme.typography.textSm, styles.label]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxUnchecked: {
    borderColor: palette.gray[600],
    backgroundColor: 'transparent',
  },
  boxChecked: {
    borderColor: palette.brand[600],
    backgroundColor: palette.brand[600],
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    marginLeft: theme.spacing.sm,
    color: palette.gray[200],
    fontWeight: theme.fontWeight.medium,
  },
});
