import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { palette } from '../theme';
import { Loader } from '../components/ui/Loader';


export const SplashScreen: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulsing animation on the logo to make the splash feel "alive"
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centerContent, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.logoText}>IronLab</Text>
      </Animated.View>

      <View style={styles.footer}>
        {/* White loader against the brand background */}
        <Loader size="large" color={palette.white} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.brand[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: palette.white,
    letterSpacing: -1,
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
});
