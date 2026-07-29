import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  PanResponder,
  DimensionValue,
} from 'react-native';
import { theme, palette } from '../../theme';

export interface SliderProps {
  label?: string;
  value: number; // 0-100 percentage
  onValueChange?: (value: number) => void;
  minValueLabel?: string;
  maxValueLabel?: string;
  color?: 'brand' | 'warning' | 'error' | 'success'; 
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onValueChange,
  minValueLabel = '0%',
  maxValueLabel = '100%',
  color = 'brand',
  disabled = false,
}) => {
  const trackWidth = useRef(0);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (evt) => {
        if (trackWidth.current > 0 && onValueChange) {
          // Calculate percentage based on touch location relative to track
          // gestureState.moveX is root-relative, so we use evt.nativeEvent.locationX 
          // but for dragging it's better to use offset
          const touchX = evt.nativeEvent.locationX;
          let newPercent = (touchX / trackWidth.current) * 100;
          newPercent = Math.max(0, Math.min(100, newPercent));
          onValueChange(Math.round(newPercent));
        }
      },
      onPanResponderGrant: (evt) => {
        if (trackWidth.current > 0 && onValueChange) {
          const touchX = evt.nativeEvent.locationX;
          let newPercent = (touchX / trackWidth.current) * 100;
          newPercent = Math.max(0, Math.min(100, newPercent));
          onValueChange(Math.round(newPercent));
        }
      }
    })
  ).current;

  const getTrackColor = () => palette[color][500];

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      {/* Top Labels */}
      <View style={styles.labelRow}>
        {label && <Text style={[theme.typography.textSm, styles.label]}>{label}</Text>}
        <Text style={[theme.typography.textSm, styles.valueText]}>{value}%</Text>
      </View>

      {/* Track */}
      <View 
        style={styles.trackArea} 
        {...panResponder.panHandlers}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
      >
        <View style={styles.trackBackground} />
        <View
          style={[
            styles.trackFill,
            { backgroundColor: getTrackColor(), width: `${value}%` as DimensionValue },
          ]}
        />
        <View style={[styles.thumb, { left: `${value}%` as DimensionValue, borderColor: getTrackColor() }]} />
      </View>

      {/* Bottom Range Labels */}
      <View style={styles.rangeLabelRow}>
        <Text style={[theme.typography.textXs, { color: palette.gray[500] }]}>{minValueLabel}</Text>
        <Text style={[theme.typography.textXs, { color: palette.gray[500] }]}>{maxValueLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  label: {
    color: palette.gray[200],
    fontWeight: theme.fontWeight.medium,
  },
  valueText: {
    color: palette.gray[400],
  },
  trackArea: {
    height: 32, // Touch target height increased for better hit box
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    width: '100%',
    height: 4,
    backgroundColor: palette.gray[800],
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    top: 14, // Center vertically in 32px area
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.gray[950],
    borderWidth: 2,
    top: 4, // Center vertically in 32px area
    transform: [{ translateX: -12 }], // Center thumb on its point
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  rangeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
});
