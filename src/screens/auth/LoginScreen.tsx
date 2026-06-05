import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Checkbox } from '../../components/ui/Checkbox';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';
import { Lock } from 'phosphor-react-native';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const AuthLogo = () => (
  <Text style={styles.logoText}>IronLab</Text>
);

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      await setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
      // navigation will happen automatically via AppNavigator
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AuthLogo />
          <Text style={[theme.typography.textLg, styles.subtitle]}>
            {t('auth.signInSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
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
            placeholder="••••••••••••••••"
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
            label={t('auth.signInWithGoogle')}
            onPress={() => {}}
            variant="ghost"
            color="gray"
            style={styles.googleBtn}
            icon={<Text style={{ color: '#4285F4', fontWeight: 'bold', marginRight: 8, fontSize: 18 }}>G</Text>}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[theme.typography.textMd, { color: palette.gray[400] }]}>
          {t('auth.noAccount')}{' '}
        </Text>
        <Text
          style={[theme.typography.textMd, styles.link]}
          onPress={() => navigation.navigate('Register')}
        >
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  forgotLink: {
    color: palette.brand[500],
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
    color: palette.gray[500],
    paddingHorizontal: theme.spacing.md,
    fontSize: 12,
    fontWeight: 'bold',
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
  link: {
    color: palette.brand[500],
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
