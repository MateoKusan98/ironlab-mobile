import React from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { theme, palette } from '../../theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  style,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[theme.typography.textSm, styles.label]}>
          {label}
        </Text>
      )}
      
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          style,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <RNTextInput
          style={[styles.input, theme.typography.textMd]}
          placeholderTextColor={palette.gray[500]}
          {...rest}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {error && (
        <Text style={[theme.typography.textSm, styles.errorText]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    color: palette.gray[300],
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray[950],
    borderWidth: 1,
    borderColor: palette.gray[800],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 64,
  },
  inputWrapperError: {
    borderColor: palette.error[500],
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: palette.gray[50],
    paddingVertical: theme.spacing.sm,
  },
  errorText: {
    color: palette.error[500],
    marginTop: theme.spacing.xs,
  },
});
