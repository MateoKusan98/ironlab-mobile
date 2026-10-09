import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './RpeCalculatorScreen.styles';

export interface ChipPickerProps {
  label: string;
  options: number[];
  value: number;
  onChange: (value: number) => void;
  /** Spoken per chip, e.g. "3 reps" — the bare digit means nothing to a screen reader. */
  a11yLabel: (value: number) => string;
}

/** One labelled row of tap targets — reps or RPE — so the calculator needs no keyboard but for the weight. */
export const ChipPicker: React.FC<ChipPickerProps> = ({ label, options, value, onChange, a11yLabel }) => (
  <View style={styles.pickerBlock}>
    <Text style={styles.pickerLabel}>{label}</Text>
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={a11yLabel(option)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);
