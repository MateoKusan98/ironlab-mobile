import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';
import { UserRole } from '@shared';
import { User, Lock } from 'phosphor-react-native';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const AuthLogo = () => (
  <Text style={styles.logoText}>IronLab</Text>
);

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Simple mock password strength
  const getPasswordStrength = () => {
    if (password.length === 0) return { score: 0, text: t('auth.passwordWeak'), color: palette.error[500] };
    if (password.length < 5) return { score: 25, text: t('auth.passwordAddStrength'), color: palette.error[500] };
    if (password.length < 8) return { score: 50, text: t('auth.passwordGettingThere'), color: palette.warning[500] };
    if (password.length < 10) return { score: 75, text: t('auth.passwordStrong'), color: palette.brand[500] };
    return { score: 100, text: t('auth.passwordVeryStrong'), color: palette.success[500] };
  };

  const strengthInfo = getPasswordStrength();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.register({
        email,
        password,
        name,
        role: UserRole.ROLE_TRAINEE,
      });

      await setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
      // navigation will happen automatically via AppNavigator
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create account. Please try again.';
      Alert.alert(t('auth.registrationError'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AuthLogo />
          <Text style={[theme.typography.textLg, styles.subtitle]}>
            {t('auth.registerSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t('auth.fullName')}
            placeholder={t('auth.namePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            leftIcon={<User size={18} color={palette.gray[500]} />}
          />
          <TextInput
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Text style={{ color: palette.gray[500] }}>✉</Text>}
          />
          <TextInput
            label={t('auth.password')}
            placeholder="***"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={18} color={palette.gray[500]} />}
            rightIcon={
              <Text 
                style={{ color: palette.gray[500] }} 
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁' : '🚫'}
              </Text>
            }
          />
          
          <View style={styles.strengthWrapper}>
            <ProgressBar 
              progress={strengthInfo.score} 
              color={strengthInfo.color} 
              height={4} 
              style={{ width: '100%', marginBottom: 8 }}
            />
            <Text style={[theme.typography.textSm, { color: palette.gray[400] }]}>
              {t('auth.passwordStrength')} <Text style={{ color: strengthInfo.color, fontWeight: 'bold' }}>{strengthInfo.text}</Text>
            </Text>
          </View>

          <TextInput
            label={t('auth.confirmPassword')}
            placeholder="***"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={18} color={palette.gray[500]} />}
          />
          
          <Button
            label={isLoading ? t('auth.creatingAccount') : t('auth.signUpBtn')}
            onPress={handleRegister}
            variant="solid"
            color="brand"
            style={styles.mainBtn}
            disabled={password !== confirmPassword || password === '' || isLoading}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[theme.typography.textMd, { color: palette.gray[400] }]}>
          {t('auth.hasAccount')}{' '}
        </Text>
        <Text
          style={[theme.typography.textMd, styles.link]}
          onPress={() => navigation.navigate('Login')}
        >
          {t('auth.signIn')}
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
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: palette.brand[500],
    letterSpacing: -1,
    marginBottom: theme.spacing.xl,
  },
  subtitle: {
    color: palette.gray[300],
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.sm,
  },
  strengthWrapper: {
    marginBottom: theme.spacing.md,
  },
  mainBtn: {
    marginTop: theme.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
  },
  link: {
    color: palette.brand[500],
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
