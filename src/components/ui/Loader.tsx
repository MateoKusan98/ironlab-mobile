import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme, palette } from '../../theme';

export interface LoaderProps {
  size?: 'small' | 'large' | number;
  color?: string;
  label?: string;
  variant?: 'circle' | 'square'; // Grid logic requires Lottie/SVG usually, falling back to circle
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'large',
  color = palette.brand[500],
  label,
  variant = 'circle',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={size === 'small' || size === 'large' ? size : 'large'}
        color={color}
      />
      {label && <Text style={[theme.typography.textSm, styles.label, { color }]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: theme.spacing.sm,
    fontWeight: theme.fontWeight.medium,
  },
});
