import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';

export interface KeyboardAwareScreenProps extends KeyboardAwareScrollViewProps {
  /**
   * Extra gap (px) kept between the focused input and the top of the keyboard.
   * Defaults to a comfortable 24px so the field is never flush against the keys.
   */
  bottomOffset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Drop-in replacement for a scrollable screen body that keeps the focused
 * TextInput visible above the keyboard on both iOS and Android.
 *
 * Backed by react-native-keyboard-controller, which tracks the real keyboard
 * frame (works under edge-to-edge, unlike RN's KeyboardAvoidingView). It also
 * auto-scrolls long forms so the active field is always in view.
 *
 * Usage — replace a screen's <ScrollView> with this:
 *   <SafeAreaView style={styles.container}>
 *     <KeyboardAwareScreen contentContainerStyle={styles.content}>
 *       ...fields...
 *     </KeyboardAwareScreen>
 *   </SafeAreaView>
 */
export const KeyboardAwareScreen: React.FC<KeyboardAwareScreenProps> = ({
  bottomOffset = 24,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  children,
  ...rest
}) => {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      {...rest}
    >
      {children}
    </KeyboardAwareScrollView>
  );
};
