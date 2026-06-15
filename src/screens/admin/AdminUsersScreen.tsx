import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '@shared';
import { usersService, AdminUserEntry, UsageStatEntry } from '../../services/users.service';
import { theme, palette } from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_COLORS: Record<string, string> = {
  [UserRole.ROLE_SUPER_ADMIN]: palette.error[500],
  [UserRole.ROLE_ADMIN]:       palette.warning[500],
  [UserRole.ROLE_COACH]:       palette.brand[400],
  [UserRole.ROLE_TRAINEE]:     palette.gray[400],
};

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ROLE_SUPER_ADMIN]: 'Super Admin',
  [UserRole.ROLE_ADMIN]:       'Admin',
  [UserRole.ROLE_COACH]:       'Coach',
  [UserRole.ROLE_TRAINEE]:     'Trainee',
};

const FITNESS_LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  return `$${usd.toFixed(4)}`;
}

function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[styles.initials, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export const AdminUsersScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { user: viewer, startImpersonation } = useAuthStore();
  const isSuperAdmin = viewer?.role === UserRole.ROLE_SUPER_ADMIN;

  const handleImpersonate = (item: AdminUserEntry) => {
    Alert.alert(
      t('admin.impersonateConfirmTitle'),
      t('admin.impersonateConfirmBody', { name: item.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.impersonate'),
          onPress: async () => {
            try {
              const { user, accessToken } = await usersService.impersonate(item.id);
              await startImpersonation(user, accessToken);
            } catch {
              Alert.alert(t('common.error'), t('admin.impersonateFailed'));
            }
          },
        },
      ],
    );
  };

  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [usageMap, setUsageMap] = useState<Map<string, UsageStatEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [allUsers, usageData] = await Promise.all([
          usersService.getAllUsers(),
          isSuperAdmin ? usersService.getUsageStats() : Promise.resolve(null),
        ]);
        setUsers(allUsers);
        if (usageData) {
          setUsageMap(new Map(usageData.perUser.map((u) => [u.userId, u])));
        }
      } catch {
        Alert.alert(t('common.error'), t('admin.couldNotLoadUsers'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !filterRole || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, query, filterRole]);

  const totals = useMemo(() => {
    if (!isSuperAdmin) return null;
    let tokens = 0, cost = 0, calls = 0;
    usageMap.forEach((u) => { tokens += u.totalTokens; cost += u.totalCostUsd; calls += u.callCount; });
    return { tokens, cost, calls };
  }, [usageMap, isSuperAdmin]);

  const renderUser = ({ item }: { item: AdminUserEntry }) => {
    const usage = isSuperAdmin ? usageMap.get(item.id) : undefined;
    const roleColor = ROLE_COLORS[item.role] ?? palette.gray[400];
    const canImpersonate =
      isSuperAdmin &&
      item.id !== viewer?.id &&
      item.role !== UserRole.ROLE_ADMIN &&
      item.role !== UserRole.ROLE_SUPER_ADMIN;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <InitialsAvatar name={item.name} />
          )}
          <View style={styles.cardIdentity}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor + '66' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[item.role] ?? item.role}</Text>
              </View>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Joined" value={fmtDate(item.createdAt)} />
          <Stat label="Sessions" value={String(item.totalSessions)} />
          <Stat label="Last session" value={fmtDate(item.lastSessionAt)} />
          <Stat label="Fitness" value={item.fitnessLevel != null ? FITNESS_LEVELS[item.fitnessLevel] ?? '—' : '—'} />
        </View>

        <View style={styles.setupRow}>
          <SetupBadge label="Profile" done={item.isSetupComplete} />
          <SetupBadge label="Nutrition" done={item.isNutritionSetupComplete} />
          <SetupBadge label="AI Coach" done={item.isAICoachSetupComplete} />
          {item.fitnessGoal && (
            <View style={styles.goalBadge}>
              <Text style={styles.goalText}>{item.fitnessGoal}</Text>
            </View>
          )}
        </View>

        {isSuperAdmin && (
          <View style={styles.usageRow}>
            {usage ? (
              <>
                <UsageStat label="Tokens" value={usage.totalTokens.toLocaleString()} />
                <UsageStat label="Calls" value={String(usage.callCount)} />
                <UsageStat label="Est. cost" value={fmtCost(usage.totalCostUsd)} highlight />
              </>
            ) : (
              <Text style={styles.noUsage}>{t('admin.noAiUsage')}</Text>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.aiLabBtn, styles.actionBtn]}
            onPress={() => navigation.navigate('AdminAILab', { userId: item.id, userName: item.name })}
          >
            <Text style={styles.aiLabBtnText}>{t('admin.aiLab')}</Text>
          </TouchableOpacity>
          {canImpersonate && (
            <TouchableOpacity
              style={[styles.impersonateBtn, styles.actionBtn]}
              onPress={() => handleImpersonate(item)}
            >
              <Text style={styles.impersonateBtnText}>{t('admin.impersonate')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.title}>{t('admin.userManagement')}</Text>
        <Text style={styles.count}>{users.length}</Text>
      </View>

      {isSuperAdmin && totals && (
        <View style={styles.totalsBar}>
          <TotalStat label={t('admin.totalTokens')} value={totals.tokens.toLocaleString()} />
          <TotalStat label={t('admin.totalCalls')} value={String(totals.calls)} />
          <TotalStat label={t('admin.totalCost')} value={`$${totals.cost.toFixed(4)}`} />
        </View>
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder={t('admin.searchPlaceholder')}
          placeholderTextColor={palette.gray[500]}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {[null, UserRole.ROLE_SUPER_ADMIN, UserRole.ROLE_ADMIN, UserRole.ROLE_COACH, UserRole.ROLE_TRAINEE].map((role) => (
          <TouchableOpacity
            key={role ?? 'all'}
            style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
            onPress={() => setFilterRole(role)}
          >
            <Text style={[styles.filterChipText, filterRole === role && styles.filterChipTextActive]}>
              {role ? ROLE_LABELS[role] : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('admin.noUsersFound')}</Text>}
        />
      )}
    </SafeAreaView>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UsageStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.usageStatItem}>
      <Text style={[styles.usageValue, highlight && styles.usageValueHighlight]}>{value}</Text>
      <Text style={styles.usageLabel}>{label}</Text>
    </View>
  );
}

function TotalStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalStatItem}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

function SetupBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={[styles.setupBadge, done ? styles.setupBadgeDone : styles.setupBadgePending]}>
      <Text style={[styles.setupBadgeText, done ? styles.setupBadgeTextDone : styles.setupBadgeTextPending]}>
        {done ? '✓' : '○'} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4, marginRight: 10 },
  backArrow: { fontSize: 22, color: theme.colors.text },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  count: { fontSize: 13, color: palette.gray[500], backgroundColor: palette.gray[800], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  totalsBar: { flexDirection: 'row', backgroundColor: palette.gray[900], marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 10, gap: 8 },
  totalStatItem: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: 14, fontWeight: '700', color: palette.error[400] },
  totalLabel: { fontSize: 10, color: palette.gray[500], marginTop: 2 },

  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  search: {
    backgroundColor: palette.gray[900], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: theme.colors.text, fontSize: 14, borderWidth: 1, borderColor: palette.gray[700],
  },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700] },
  filterChipActive: { backgroundColor: palette.brand[600] + '33', borderColor: palette.brand[500] },
  filterChipText: { fontSize: 12, color: palette.gray[400] },
  filterChipTextActive: { color: palette.brand[300], fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: palette.gray[500], marginTop: 60 },

  card: { backgroundColor: palette.gray[900], borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: palette.gray[800] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  initials: { backgroundColor: palette.brand[700], marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: '#fff', fontWeight: '700' },
  cardIdentity: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flexShrink: 1 },
  userEmail: { fontSize: 12, color: palette.gray[500] },
  roleBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: palette.gray[800], borderRadius: 8, paddingVertical: 6 },
  statValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  statLabel: { fontSize: 9, color: palette.gray[500], marginTop: 1 },

  setupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  setupBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  setupBadgeDone: { backgroundColor: palette.success[500] + '22' },
  setupBadgePending: { backgroundColor: palette.gray[800] },
  setupBadgeText: { fontSize: 10, fontWeight: '600' },
  setupBadgeTextDone: { color: palette.success[400] },
  setupBadgeTextPending: { color: palette.gray[600] },
  goalBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: palette.brand[700] + '33' },
  goalText: { fontSize: 10, fontWeight: '600', color: palette.brand[300] },

  usageRow: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.gray[800] },
  usageStatItem: { flex: 1, alignItems: 'center', backgroundColor: palette.gray[800] + '88', borderRadius: 8, paddingVertical: 6 },
  usageValue: { fontSize: 13, fontWeight: '600', color: palette.gray[300] },
  usageValueHighlight: { color: palette.error[400] },
  usageLabel: { fontSize: 9, color: palette.gray[500], marginTop: 1 },
  noUsage: { fontSize: 11, color: palette.gray[600], paddingVertical: 6 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1 },
  aiLabBtn: { backgroundColor: palette.brand[600] + '22', borderWidth: 1, borderColor: palette.brand[600] + '66', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  aiLabBtnText: { fontSize: 12, fontWeight: '700', color: palette.brand[300], letterSpacing: 0.5 },
  impersonateBtn: { backgroundColor: palette.warning[600] + '22', borderWidth: 1, borderColor: palette.warning[600] + '66', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  impersonateBtnText: { fontSize: 12, fontWeight: '700', color: palette.warning[400], letterSpacing: 0.5 },
});
