import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/auth.store';
import { palette } from '../theme';

/**
 * Persistent bar shown while a Super Admin is impersonating another user.
 * Rendered once as an overlay in AppNavigator so it stays visible on every screen.
 */
export const ImpersonationBanner: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, impersonator, stopImpersonation } = useAuthStore();

  if (!impersonator) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
      <Text style={styles.label} numberOfLines={1}>
        {t('impersonation.viewingAs', { name: user?.name ?? '' })}
      </Text>
      <TouchableOpacity style={styles.exitBtn} onPress={() => stopImpersonation()}>
        <Text style={styles.exitText}>{t('impersonation.exit')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: palette.warning[600],
  },
  label: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  exitBtn: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  exitText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
