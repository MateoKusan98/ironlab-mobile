import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { UserRole } from '@shared';
import { palette } from '../../theme';
import { Switch } from '../../components/ui/Switch';
import { useAuthStore } from '../../stores/auth.store';
import { notificationPrefsService, NotificationPrefs } from '../../services/notificationPrefs.service';
import { PREF_SECTIONS, PrefRow } from './notificationSettings.sections';
import { useSettingsStore } from '../../stores/settings.store';

/**
 * What the athlete wants to be told about. Every toggle saves on its own — there is no
 * Save button to forget — and rolls back if the server refuses, so the switch never
 * shows a state that is not what the server will act on.
 */
export const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const isCoach = useAuthStore((s) => s.user?.role === UserRole.ROLE_COACH);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [failed, setFailed] = useState(false);
  const [osBlocked, setOsBlocked] = useState(false);
  // A device setting, not a server pref: the card is posted by this phone, mid-set,
  // with no network round trip to ask permission from.
  const lockScreenCard = useSettingsStore((s) => s.lockScreenCard);
  const setLockScreenCard = useSettingsStore((s) => s.setLockScreenCard);
  const tr = (key: string, fallback: string) => t(`notificationSettings.${key}`, { defaultValue: fallback });

  const load = useCallback(() => {
    setFailed(false);
    notificationPrefsService.get().then(setPrefs).catch(() => setFailed(true));
    Notifications.getPermissionsAsync().then((p) => setOsBlocked(p.status !== 'granted')).catch(() => {});
  }, []);

  // Re-read on focus AND on return from the phone's settings app, where the athlete
  // may just have allowed notifications.
  useFocusEffect(useCallback(() => {
    load();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]));

  const toggle = (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    notificationPrefsService.update({ [key]: value }).then(setPrefs).catch(() => setPrefs(before));
  };

  if (!prefs) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>{tr('title', 'Notifications')}</Text>
        <View style={styles.center}>
          {failed ? (
            <TouchableOpacity accessibilityRole="button" onPress={load}>
              <Text style={styles.retry}>{tr('loadFailed', "Couldn't load your settings — tap to retry")}</Text>
            </TouchableOpacity>
          ) : <ActivityIndicator color={palette.brand[500]} />}
        </View>
      </SafeAreaView>
    );
  }

  const renderRow = (row: PrefRow) => (
    <View key={row.key} style={[styles.row, !prefs.allEnabled && styles.dimmed]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{tr(row.titleKey, row.title)}</Text>
        <Text style={styles.rowBody}>{tr(row.bodyKey, row.body)}</Text>
      </View>
      <Switch checked={prefs[row.key]} disabled={!prefs.allEnabled} onValueChange={(v) => toggle(row.key, v)} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{tr('title', 'Notifications')}</Text>

        {osBlocked && (
          <TouchableOpacity accessibilityRole="button" style={styles.osBanner} onPress={() => Linking.openSettings()}>
            <Text style={styles.osBannerTitle}>{tr('osBlockedTitle', 'Notifications are off in your phone settings')}</Text>
            <Text style={styles.osBannerBody}>{tr('osBlockedBody', 'Nothing below can reach you until you allow them. Tap to open settings.')}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.row, styles.masterRow]}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{tr('allEnabled', 'All notifications')}</Text>
            <Text style={styles.rowBody}>{tr('allEnabledBody', 'Pause everything without losing your choices below.')}</Text>
          </View>
          <Switch checked={prefs.allEnabled} onValueChange={(v) => toggle('allEnabled', v)} />
        </View>

        {PREF_SECTIONS.map((section) => {
          const rows = section.rows.filter((r) => !r.coachOnly || isCoach);
          return (
            <View key={section.titleKey} style={styles.section}>
              <Text style={styles.sectionTitle}>{tr(section.titleKey, section.title)}</Text>
              {rows.map(renderRow)}
            </View>
          );
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tr('onThisPhone', 'On this phone')}</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{tr('lockScreenCard', 'Workout on the lock screen')}</Text>
              <Text style={styles.rowBody}>{tr('lockScreenCardBody', 'Your next set and when rest ends, without unlocking the phone.')}</Text>
            </View>
            <Switch checked={lockScreenCard} onValueChange={setLockScreenCard} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.gray[900] },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: palette.white, marginBottom: 16, paddingHorizontal: 16, paddingTop: 8 },
  retry: { color: palette.brand[400], fontSize: 14 },
  osBanner: { backgroundColor: palette.gray[800], borderColor: palette.warning[500], borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  osBannerTitle: { color: palette.warning[400], fontWeight: '700', fontSize: 14 },
  osBannerBody: { color: palette.gray[300], fontSize: 13, marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: palette.gray[400], letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  masterRow: { backgroundColor: palette.gray[800], borderRadius: 12, paddingHorizontal: 14, borderBottomWidth: 0 },
  dimmed: { opacity: 0.45 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: palette.white },
  rowBody: { fontSize: 13, color: palette.gray[400], marginTop: 2 },
});
