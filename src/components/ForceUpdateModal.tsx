import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { CURRENT_APP_VERSION, AppVersionRequirement } from '../services/appVersion.service';

interface Props {
  requirement: AppVersionRequirement;
}

/**
 * Full-screen, non-dismissable update wall. Rendered above everything (auth
 * included) whenever the running build is older than the server's minimum
 * supported version, so an out-of-date client can't reach an API it no longer
 * understands. There is no close affordance and Android back is swallowed — the
 * only way out is to update.
 */
export const ForceUpdateModal: React.FC<Props> = ({ requirement }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const openStore = () => {
    const url =
      Platform.OS === 'ios' ? requirement.storeUrl.ios : requirement.storeUrl.android;
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    // animationType="none" + onRequestClose no-op: this wall cannot be dismissed.
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => {}}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + theme.spacing.xl, paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🚀</Text>
        </View>

        <Text style={styles.title}>{t('forceUpdate.title')}</Text>
        <Text style={styles.message}>{t('forceUpdate.message')}</Text>

        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>
            {t('forceUpdate.currentVersion', { version: CURRENT_APP_VERSION })}
          </Text>
          <Text style={styles.versionLabel}>
            {t('forceUpdate.requiredVersion', { version: requirement.minSupported })}
          </Text>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={openStore} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{t('forceUpdate.updateNow')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading2xl.fontSize,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.textMd.fontSize,
    lineHeight: theme.typography.textMd.lineHeight,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  versionRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing['2xl'],
  },
  versionLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.textSm.fontSize,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['2xl'],
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.typography.textMd.fontSize,
    fontWeight: '700',
  },
});
