import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { theme, palette } from '../../theme';
import { authService } from '../../services/auth.service';
import { Lock, Eye, EyeSlash, Hash } from 'phosphor-react-native';

import { apiErrorMessage } from '../../utils/apiError';
type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const GYM_BG = require('../../../assets/IRONLAB.png');

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleReset = async () => {
    if (code.length !== 6) {
      Alert.alert(t('common.error'), t('auth.codeInvalid'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ email, code, newPassword: password });
      Alert.alert(t('auth.resetSuccessTitle'), t('auth.resetSuccessMessage'), [
        { text: t('auth.signIn'), onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: unknown) {
      const message = apiErrorMessage(error, t('auth.resetError'));
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authService.forgotPassword({ email });
      Alert.alert(t('auth.codeResentTitle'), t('auth.codeResentMessage'));
    } catch {
      Alert.alert(t('common.error'), t('auth.resetRequestError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={GYM_BG}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      />

      <KeyboardAwareScreen contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logoText}>IronLab</Text>
          <Text style={styles.title}>{t('auth.resetTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.resetSubtitle', { email })}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t('auth.resetCode')}
            placeholder="••••••"
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            leftIcon={<Hash size={18} color={palette.gray[500]} />}
          />
          <TextInput
            label={t('auth.newPassword')}
            placeholder="••••••••••••••••"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={18} color={palette.gray[500]} />}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('auth.togglePassword', { defaultValue: 'Show or hide password' })}
                accessibilityState={{ expanded: showPassword }}
              >
                {showPassword ? (
                  <EyeSlash size={18} color={palette.gray[500]} />
                ) : (
                  <Eye size={18} color={palette.gray[500]} />
                )}
              </TouchableOpacity>
            }
          />
          <TextInput
            label={t('auth.confirmPassword')}
            placeholder="••••••••••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={18} color={palette.gray[500]} />}
          />

          <Button
            label={isLoading ? t('auth.resetting') : t('auth.resetPasswordBtn')}
            onPress={handleReset}
            variant="solid"
            color="brand"
            style={styles.mainBtn}
            disabled={isLoading}
          />

          <TouchableOpacity accessibilityRole="button" onPress={handleResend} disabled={isResending} style={styles.resendRow}>
            <Text style={styles.resendText}>
              {isResending ? t('auth.sending') : t('auth.resendCode')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScreen>

      <View style={styles.footer}>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          {t('auth.backToSignIn')}
        </Text>
      </View>
    </View>
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
    marginBottom: theme.spacing['2xl'],
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: palette.brand[500],
    letterSpacing: -1.5,
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: palette.gray[50],
    fontSize: 22,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
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
  mainBtn: {
    marginTop: theme.spacing.lg,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  resendText: {
    color: palette.brand[400],
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
  },
  link: {
    color: palette.brand[400],
    fontWeight: '700',
    fontSize: 14,
  },
});
