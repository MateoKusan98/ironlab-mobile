import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../theme';

const { width, height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachWelcome'>;
};

const FloatingBadge = ({
  label,
  color,
  icon,
  delay,
  x,
  y,
}: {
  label: string;
  color: string;
  icon: string;
  delay: number;
  x: number;
  y: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -8, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: color, left: x, top: y, transform: [{ translateY: anim }] },
      ]}
    >
      <Text style={styles.badgeIcon}>{icon}</Text>
      <Text style={styles.badgeText}>{label}</Text>
    </Animated.View>
  );
};

const RobotHead = () => (
  <View style={styles.robotContainer}>
    <View style={styles.robotHead}>
      <View style={styles.robotFaceplate}>
        <View style={styles.robotEyeRow}>
          <View style={styles.robotEye}>
            <View style={styles.robotPupil} />
          </View>
          <View style={styles.robotEye}>
            <View style={styles.robotPupil} />
          </View>
        </View>
        <View style={styles.robotMouth}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.robotTooth} />
          ))}
        </View>
      </View>
      <View style={styles.robotEarLeft} />
      <View style={styles.robotEarRight} />
    </View>
    <View style={styles.robotNeck} />
    <View style={styles.robotShoulder} />
  </View>
);

export const AICoachWelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <FloatingBadge label={t('aiCoachWelcome.badgeGetUp')} color={palette.brand[500]} icon="⚡" delay={0} x={20} y={height * 0.12} />
      <FloatingBadge label={t('aiCoachWelcome.badgeWrongForm')} color={palette.violet[600]} icon="🏃" delay={400} x={width - 140} y={height * 0.2} />
      <FloatingBadge label={t('aiCoachWelcome.badgeDoReps')} color={palette.info[600]} icon="💪" delay={800} x={24} y={height * 0.32} />

      <View style={styles.heroSection}>
        <RobotHead />
      </View>

      <Animated.View
        style={[styles.bottomSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <Text style={styles.title}>{t('aiCoachWelcome.title')}</Text>
        <Text style={styles.subtitle}>{t('aiCoachWelcome.subtitle')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.ctaButton}
          onPress={() => navigation.replace('AICoachSetup')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('aiCoachWelcome.getStarted')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.black,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotContainer: {
    alignItems: 'center',
  },
  robotHead: {
    width: 180,
    height: 160,
    backgroundColor: theme.surface.raised,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.mono[33],
    position: 'relative',
  },
  robotFaceplate: {
    width: 140,
    height: 120,
    backgroundColor: palette.mono[11],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  robotEyeRow: {
    flexDirection: 'row',
    gap: 24,
  },
  robotEye: {
    width: 32,
    height: 32,
    backgroundColor: palette.black,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.brand[500],
  },
  robotPupil: {
    width: 12,
    height: 12,
    backgroundColor: palette.brand[500],
    borderRadius: 6,
    shadowColor: palette.brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  robotMouth: {
    flexDirection: 'row',
    gap: 4,
  },
  robotTooth: {
    width: 10,
    height: 14,
    backgroundColor: palette.brand[600],
    borderRadius: 3,
  },
  robotEarLeft: {
    position: 'absolute',
    left: -16,
    width: 16,
    height: 40,
    backgroundColor: palette.mono[22],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.mono[33],
  },
  robotEarRight: {
    position: 'absolute',
    right: -16,
    width: 16,
    height: 40,
    backgroundColor: palette.mono[22],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.mono[33],
  },
  robotNeck: {
    width: 40,
    height: 20,
    backgroundColor: theme.surface.raised,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: palette.mono[33],
  },
  robotShoulder: {
    width: 220,
    height: 40,
    backgroundColor: theme.surface.raised,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.mono[33],
  },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10,
  },
  badgeIcon: { fontSize: 13 },
  badgeText: { color: palette.white, fontSize: 12, fontWeight: '700' },
  bottomSection: {
    padding: 28,
    paddingBottom: 40,
    backgroundColor: palette.black,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: palette.white,
    letterSpacing: -1,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: palette.gray[400],
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: palette.brand[500],
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: palette.black,
    fontSize: 16,
    fontWeight: '800',
  },
});
