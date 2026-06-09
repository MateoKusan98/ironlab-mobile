import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Checkbox } from '../../components/ui/Checkbox';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';
import { Envelope, Eye, EyeSlash, GoogleLogo, Lock } from 'phosphor-react-native';
import { useSocialAuth } from '../../hooks/useSocialAuth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

// Dark gym photo backdrop (matches WelcomeScreen)
const GYM_BG = require('../../../assets/IRONLAB.png');

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { signInWithGoogle, isGoogleReady, isLoading: isSocialLoading } = useSocialAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      await setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid email or password.';
      Alert.alert(t('auth.signIn'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Dark gym photo background */}
      <ImageBackground
        source={GYM_BG}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logoText}>IronLab</Text>
          <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Envelope size={18} color={palette.gray[500]} />}
          />
          <TextInput
            label={t('auth.password')}
            placeholder="••••••••••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={18} color={palette.gray[500]} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                {showPassword ? (
                  <EyeSlash size={18} color={palette.gray[500]} />
                ) : (
                  <Eye size={18} color={palette.gray[500]} />
                )}
              </TouchableOpacity>
            }
          />

          <View style={styles.optionsRow}>
            <Checkbox
              checked={keepSignedIn}
              onValueChange={setKeepSignedIn}
              label={t('auth.keepSignedIn')}
            />
            <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
          </View>

          <Button
            label={isLoading ? t('auth.signingIn') : t('auth.signInBtn')}
            onPress={handleLogin}
            variant="solid"
            color="brand"
            style={styles.mainBtn}
            disabled={isLoading}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.orDivider')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label={isSocialLoading ? t('auth.signingIn') : t('auth.signInWithGoogle')}
            onPress={signInWithGoogle}
            variant="outline"
            color="gray"
            style={styles.googleBtn}
            disabled={!isGoogleReady || isSocialLoading || isLoading}
            icon={<GoogleLogo size={18} color={palette.gray[300]} weight="bold" />}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
          {t('auth.signUp')}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.gray[950],
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgImage: {
    opacity: 0.55,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing['4xl'],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: palette.brand[500],
    letterSpacing: -1.5,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    color: palette.gray[400],
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: theme.spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  forgotLink: {
    color: palette.brand[400],
    fontWeight: '600',
    fontSize: 14,
  },
  mainBtn: {
    marginTop: theme.spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.gray[800],
  },
  dividerText: {
    color: palette.gray[600],
    paddingHorizontal: theme.spacing.md,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleBtn: {
    marginBottom: theme.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
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
