import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../theme';
import { logService, ClientErrorLogEntry } from '../../services/log.service';

import { Card } from '../../components/ui';
const LEVELS = ['all', 'error', 'fatal', 'stalled', 'warning'] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_COLOR: Record<string, string> = {
  error: palette.error[500],
  fatal: palette.error[400],
  stalled: palette.warning[500],
  warning: palette.warning[400],
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const AdminLogsScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState<Level>('all');
  const [logs, setLogs] = useState<ClientErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await logService.getClientLogs(
        email,
        level === 'all' ? undefined : level,
        200,
      );
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email, level]);

  // Reload when the level filter changes; email is applied via the Search button.
  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const onSearch = () => {
    setLoading(true);
    load();
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = ({ item }: { item: ClientErrorLogEntry }) => {
    const color = LEVEL_COLOR[item.level] ?? palette.gray[400];
    const isOpen = expanded.has(item.id);
    return (
      <Card radius={12} padding={14} background={palette.gray[900]} borderColor={palette.gray[800]} style={styles.cardSpacing} activeOpacity={0.8} onPress={() => toggle(item.id)}>
        <View style={styles.cardHeader}>
          <View style={[styles.levelBadge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
            <Text style={[styles.levelText, { color }]}>{item.level.toUpperCase()}</Text>
          </View>
          <Text style={styles.source}>{item.source}</Text>
          {item.statusCode != null && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.statusCode}</Text>
            </View>
          )}
          <Text style={styles.time}>{fmtTime(item.createdAt)}</Text>
        </View>

        <Text style={styles.message} numberOfLines={isOpen ? undefined : 3}>{item.message}</Text>

        {(item.route || item.method) && (
          <Text style={styles.route}>
            {item.method ? `${item.method} ` : ''}{item.route ?? ''}
          </Text>
        )}

        <Text style={styles.identity} numberOfLines={1}>
          {item.email ?? '(no email)'}{item.platform ? ` · ${item.platform}` : ''}{item.appVersion ? ` · v${item.appVersion}` : ''}
        </Text>

        {isOpen && (
          <View style={styles.detail}>
            {item.context && (
              <Text style={styles.detailText} selectable>
                context: {JSON.stringify(item.context, null, 2)}
              </Text>
            )}
            {item.stack && (
              <Text style={styles.detailText} selectable>{item.stack}</Text>
            )}
            {item.userId && <Text style={styles.detailMeta}>userId: {item.userId}</Text>}
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Error Logs</Text>
        <Text style={styles.count}>{logs.length}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Filter by email…"
          placeholderTextColor={palette.gray[500]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity accessibilityRole="button" style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {LEVELS.map((lv) => (
          <TouchableOpacity
            key={lv}
            style={[styles.filterChip, level === lv && styles.filterChipActive]}
            onPress={() => setLevel(lv)}
            accessibilityRole="tab"
            accessibilityLabel={lv}
            accessibilityState={{ selected: level === lv }}
          >
            <Text style={[styles.filterChipText, level === lv && styles.filterChipTextActive]}>{lv}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={palette.brand[400]}
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>No logs found</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  count: { fontSize: 13, color: palette.gray[500], backgroundColor: palette.gray[800], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  search: {
    flex: 1, backgroundColor: palette.gray[900], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: theme.colors.text, fontSize: 14, borderWidth: 1, borderColor: palette.gray[700],
  },
  searchBtn: { backgroundColor: palette.brand[600], borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: palette.white, fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700] },
  filterChipActive: { backgroundColor: palette.brand[600] + '33', borderColor: palette.brand[500] },
  filterChipText: { fontSize: 12, color: palette.gray[400] },
  filterChipTextActive: { color: palette.brand[300], fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: palette.gray[500], marginTop: 60 },

  cardSpacing: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  levelText: { fontSize: 10, fontWeight: '700' },
  source: { fontSize: 11, color: palette.gray[500] },
  statusBadge: { backgroundColor: palette.gray[800], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700', color: palette.gray[300] },
  time: { flex: 1, textAlign: 'right', fontSize: 11, color: palette.gray[600] },

  message: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  route: { fontSize: 12, color: palette.brand[300], marginTop: 4, fontFamily: 'monospace' },
  identity: { fontSize: 11, color: palette.gray[500], marginTop: 6 },

  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.gray[800], gap: 8 },
  detailText: { fontSize: 11, color: palette.gray[400], fontFamily: 'monospace' },
  detailMeta: { fontSize: 11, color: palette.gray[600] },
});
