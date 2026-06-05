import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme, palette } from '../../theme';

export interface SwitchProps {
  label?: string;
  checked: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onValueChange,
  disabled,
}) => {
  const animatedValue = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: checked ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // color interpolation doesn't support native driver well in some RN versions
    }).start();
  }, [checked, animatedValue]);

  const switchContainerColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.gray[700], palette.brand[600]],
  });

  const toggleTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // 24px wide container - 20px knob = 4px padding total (2px each side), moves by 20px
  });

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      activeOpacity={0.8}
      onPress={() => onValueChange(!checked)}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.switchBase,
          { backgroundColor: switchContainerColor as any },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            { transform: [{ translateX: toggleTranslateX }] },
          ]}
        />
      </Animated.View>

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
  switchBase: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    ...theme.shadow.sm,
  },
  label: {
    marginLeft: theme.spacing.sm,
    color: palette.gray[200],
    fontWeight: theme.fontWeight.medium,
  },
});
