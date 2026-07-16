import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { palette } from '../../theme';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string; // Hex color, defaults to brand[500]
  trackColor?: string; // Hex color, defaults to gray[800]
  height?: number; // Defaults to 8
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = palette.brand[500],
  trackColor = palette.gray[800],
  height = 8,
  style,
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: height / 2 },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clampedProgress}%`,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
