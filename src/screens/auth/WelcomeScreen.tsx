import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Button } from '../../components/ui/Button';
import { theme, palette } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const MinimalLogo = () => (
  <Text style={styles.logoText}>IronLab</Text>
);

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {/* We use a solid black background as fallback for the background image */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.gray[950] }]} />
      
      {/* Since you don't have the exact asset yet, this sets up the structural background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop' }}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ opacity: 0.4 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <MinimalLogo />
          <Text style={[theme.typography.headingXl, styles.title]}>{t('auth.welcome')}</Text>
          <Text style={[theme.typography.textLg, styles.subtitle]}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        <View style={styles.actionBlock}>
          <Button
            label={t('auth.signInWithGoogle')}
            onPress={() => {}}
            variant="solid"
            color="gray"
            style={styles.socialBtn}
            textStyle={{ color: palette.gray[50] }}
            // We mock a G icon letter here for now
            icon={<Text style={{ color: '#4285F4', fontWeight: 'bold', marginRight: 8, fontSize: 18 }}>G</Text>}
          />
          <Button
            label={t('auth.signInWithFacebook')}
            onPress={() => {}}
            variant="solid"
            color="brand"
            style={[styles.socialBtn, { backgroundColor: '#1877F2' }]} // Native facebook blue
            textStyle={{ color: '#FFF' }}
            icon={<Text style={{ color: '#FFF', fontWeight: 'bold', marginRight: 8, fontSize: 18 }}>f</Text>}
          />
          <Button
            label={t('auth.signInWithEmail')}
            onPress={() => navigation.navigate('Login')}
            variant="solid"
            color="brand"
            style={styles.socialBtn}
            textStyle={{ color: '#FFF' }}
            icon={<Text style={{ color: '#FFF', marginRight: 8, fontSize: 18 }}>✉</Text>}
          />

          <View style={styles.footerRow}>
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
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.gray[950],
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 80,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: palette.brand[500],
    letterSpacing: -1,
    marginBottom: theme.spacing.xl,
  },
  title: {
    color: palette.gray[50],
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: palette.gray[300],
    textAlign: 'center',
  },
  actionBlock: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  socialBtn: {
    marginBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  link: {
    color: palette.brand[500],
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
