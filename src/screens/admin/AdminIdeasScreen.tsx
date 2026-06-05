import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ideasService, IdeaSubmission } from '../../services/ideas.service';
import { theme, palette } from '../../theme';

type FilterStatus = 'PENDING' | 'THANKED' | 'REJECTED' | 'ALL';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: palette.warning[400],
  THANKED: palette.success[400],
  REJECTED: palette.error[400],
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  THANKED: 'Thanked',
  REJECTED: 'Rejected',
};

export const AdminIdeasScreen: React.FC = () => {
  const navigation = useNavigation();
  const [ideas, setIdeas] = useState<IdeaSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ideasService.getAll();
      setIdeas(data);
    } catch {
      Alert.alert('Error', 'Could not load ideas.');
    } finally {
      setLoading(false);
    }
  };

  const handleThanks = async (idea: IdeaSubmission) => {
    Alert.alert(
      'Say Thanks',
      `Thank ${idea.user?.name ?? 'this user'} for their idea? They'll earn an achievement badge.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Thanks 👍',
          onPress: async () => {
            setProcessingId(idea.id);
            try {
              const updated = await ideasService.thankIdea(idea.id);
              setIdeas((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = async (idea: IdeaSubmission) => {
    Alert.alert(
      'Reject Idea',
      'Reject this idea? The user won\'t receive an achievement.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(idea.id);
            try {
              const updated = await ideasService.rejectIdea(idea.id);
              setIdeas((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const filtered = filter === 'ALL' ? ideas : ideas.filter((i) => i.status === filter);

  const counts = {
    ALL: ideas.length,
    PENDING: ideas.filter((i) => i.status === 'PENDING').length,
    THANKED: ideas.filter((i) => i.status === 'THANKED').length,
    REJECTED: ideas.filter((i) => i.status === 'REJECTED').length,
  };

  const renderItem = ({ item }: { item: IdeaSubmission }) => {
    const isPending = item.status === 'PENDING';
    const isProcessing = processingId === item.id;
    const statusColor = STATUS_COLORS[item.status] ?? palette.gray[400];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardUser}>
            <Text style={styles.userName}>{item.user?.name ?? 'Unknown'}</Text>
            <Text style={styles.userEmail}>{item.user?.email ?? ''}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '66' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>

        <Text style={styles.ideaContent}>{item.content}</Text>

        <Text style={styles.ideaDate}>Submitted {fmtDate(item.createdAt)}</Text>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
              onPress={() => handleReject(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={palette.error[400]} />
              ) : (
                <Text style={styles.rejectBtnText}>Reject</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thanksBtn, isProcessing && styles.btnDisabled]}
              onPress={() => handleThanks(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.thanksBtnText}>Thanks 👍</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Community Ideas</Text>
        <Text style={styles.count}>{ideas.length}</Text>
      </View>

      <View style={styles.filterRow}>
        {(['PENDING', 'ALL', 'THANKED', 'REJECTED'] as FilterStatus[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'ALL' ? 'All' : STATUS_LABELS[f]} {counts[f] > 0 ? `(${counts[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {filter === 'PENDING' ? 'No pending ideas to review.' : 'No ideas here.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4, marginRight: 10 },
  backArrow: { fontSize: 22, color: theme.colors.text },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  count: { fontSize: 13, color: palette.gray[500], backgroundColor: palette.gray[800], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700] },
  filterChipActive: { backgroundColor: palette.brand[600] + '33', borderColor: palette.brand[500] },
  filterChipText: { fontSize: 12, color: palette.gray[400] },
  filterChipTextActive: { color: palette.brand[300], fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: palette.gray[500], marginTop: 60 },

  card: { backgroundColor: palette.gray[900], borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: palette.gray[800] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardUser: { flex: 1, marginRight: 10 },
  userName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  userEmail: { fontSize: 11, color: palette.gray[500], marginTop: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },

  ideaContent: { fontSize: 14, color: palette.gray[200], lineHeight: 21, marginBottom: 8 },
  ideaDate: { fontSize: 11, color: palette.gray[600], marginBottom: 12 },

  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.error[600] + '88',
    alignItems: 'center',
    backgroundColor: palette.error[600] + '11',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: palette.error[400] },
  thanksBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
  },
  thanksBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.45 },
});
