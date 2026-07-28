import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { theme, palette } from '../../theme';
import { Envelope, GoogleLogo } from 'phosphor-react-native';
import { useSocialAuth } from '../../hooks/useSocialAuth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

// Dark gym photo backdrop
const GYM_BG = require('../../../assets/IRONLAB.png');

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { signInWithGoogle, isGoogleReady, isLoading } = useSocialAuth();

  return (
    <View style={styles.container}>
      {/* Dark gym photo background */}
      <ImageBackground
        source={GYM_BG}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      />
      {/* Bottom fade keeps the action buttons readable over the photo */}
      <View style={styles.bottomFade} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logoText}>IronLab</Text>
          <Text style={styles.title}>{t('auth.welcome')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        <View style={styles.actionBlock}>
          <TouchableOpacity
            style={[styles.socialBtn, (!isGoogleReady || isLoading) && styles.btnDisabled]}
            onPress={signInWithGoogle}
            activeOpacity={0.75}
            disabled={!isGoogleReady || isLoading}>
            <GoogleLogo size={20} color={palette.white} weight="bold" />
            <Text style={styles.socialBtnText}>{t('auth.signInWithGoogle')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.emailBtn]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.75}>
            <Envelope size={20} color={palette.white} weight="bold" />
            <Text style={styles.socialBtnText}>{t('auth.signInWithEmail')}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
            <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
              {t('auth.signUp')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.black,
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgImage: {
    opacity: 1,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: theme.surface.black,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing['3xl'],
    justifyContent: 'space-between',
    paddingBottom: 52,
  },
  header: {
    marginTop: 110,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: palette.brand[500],
    letterSpacing: -1.5,
    marginBottom: theme.spacing['3xl'],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.gray[50],
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: palette.gray[400],
    textAlign: 'center',
    lineHeight: 22,
  },
  actionBlock: {
    gap: theme.spacing.md,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 10,
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emailBtn: {
    borderColor: palette.brand[700],
    backgroundColor: `rgba(194, 65, 12, 0.15)`,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  socialBtnText: {
    color: palette.gray[50],
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    color: palette.gray[500],
    fontSize: 14,
  },
  link: {
    color: palette.brand[400],
    fontWeight: '700',
    fontSize: 14,
  },
});
