import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  ImageBackground,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { theme, palette } from '../../theme';
import { authService } from '../../services/auth.service';
import { Envelope } from 'phosphor-react-native';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const GYM_BG = require('../../../assets/IRONLAB.png');

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email: trimmed });
      // The backend always responds the same way (no account enumeration), so we
      // unconditionally advance to the code-entry screen.
      navigation.navigate('ResetPassword', { email: trimmed });
    } catch (error: any) {
      const message = error.response?.data?.message || t('auth.resetRequestError');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
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
          <Text style={styles.title}>{t('auth.forgotTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
            leftIcon={<Envelope size={18} color={palette.gray[500]} />}
          />

          <Button
            label={isLoading ? t('auth.sending') : t('auth.sendResetCode')}
            onPress={handleSubmit}
            variant="solid"
            color="brand"
            style={styles.mainBtn}
            disabled={isLoading}
          />
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
