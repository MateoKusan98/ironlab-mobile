import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { useClients } from '../../hooks/useUsers';
import { useAuthStore } from '../../stores/auth.store';
import { UserResponse } from '@shared';
import { theme, palette, alpha } from '../../theme';
import { Users, Camera } from 'phosphor-react-native';

type Nav = NativeStackNavigationProp<CoachStackParamList, 'Dashboard'>;

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const { data: clients, isLoading } = useClients();

  const renderClient = ({ item }: { item: UserResponse }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() =>
        navigation.navigate('ClientDetail', {
          clientId: item.id,
          clientName: item.name,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.clientAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientEmail}>{item.email}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('coach.greeting', { name: user?.name?.split(' ')[0] })}
        </Text>
        <Text style={styles.subtitle}>
          {t('coach.clientCount', { count: clients?.length || 0 })}
        </Text>
        <TouchableOpacity
          style={styles.formCheckBtn}
          onPress={() => navigation.navigate('FormCheckQueue')}
        >
          <Camera size={18} weight="fill" color={palette.violet[400]} />
          <Text style={styles.formCheckBtnText}>{t('coach.formCheckQueue')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users size={48} weight="fill" color={theme.colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>{t('coach.noClientsYet')}</Text>
              <Text style={styles.emptySubtext}>{t('coach.noClientsSub')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg },
  greeting: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  formCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: alpha(palette.violet[600], 0.133),
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: alpha(palette.violet[600], 0.267),
  },
  formCheckBtnText: { fontSize: 13, fontWeight: '700', color: palette.violet[400] },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: 20,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accent,
  },
  clientInfo: { flex: 1, marginLeft: theme.spacing.md },
  clientName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  clientEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  arrow: { fontSize: 18, color: theme.colors.textTertiary },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
  },
});
