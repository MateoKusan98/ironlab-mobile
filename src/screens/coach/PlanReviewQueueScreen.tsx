import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock, PencilSimple, Barbell } from 'phosphor-react-native';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { Card } from '../../components/ui';
import { planReviewService, PlanReviewSummary } from '../../services/plan-review.service';
import { theme, palette, alpha } from '../../theme';

type Nav = NativeStackNavigationProp<CoachStackParamList, 'PlanReviewQueue'>;

/**
 * The coach's queue of AI-drafted sessions waiting on a human.
 *
 * Ordered by deadline, not by arrival: the useful question here is "which of these ships
 * without me first", and that is what the sort answers. Each row carries its own
 * countdown for the same reason — a queue that does not say when it stops waiting is a
 * queue you have to remember to check.
 */

/** "in 3h" / "in 40m" / "any moment". Coarse on purpose — this is a triage hint. */
const useCountdown = (iso: string | null): string | null => {
  const { t } = useTranslation();
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('planReview.shippingNow');
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) return t('planReview.inDays', { count: Math.floor(hours / 24) });
  if (hours >= 1) return t('planReview.inHours', { count: hours });
  return t('planReview.inMinutes', { count: Math.max(1, Math.floor(ms / 60_000)) });
};

const QueueRow: React.FC<{ item: PlanReviewSummary; onPress: () => void }> = ({ item, onPress }) => {
  const { t } = useTranslation();
  const countdown = useCountdown(item.autoApproveAt);
  // Under an hour left: this one ships with or without the coach, so it earns the accent.
  const urgent = !!item.autoApproveAt && new Date(item.autoApproveAt).getTime() - Date.now() < 3_600_000;

  return (
    <Card variant="row" radius={14} padding={14} onPress={onPress} activeOpacity={0.75} style={styles.row}>
      <View style={styles.iconWrap}>
        <Barbell size={18} weight="fill" color={palette.brand[400]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{item.athleteName ?? t('planReview.anAthlete')}</Text>
        <Text style={styles.focus} numberOfLines={1}>
          {item.focus ?? t('planReview.untitledSession')}
        </Text>
        <Text style={styles.meta}>
          {t('planReview.exerciseCount', { count: item.exerciseCount })} · {item.targetDate}
        </Text>
      </View>
      <View style={styles.right}>
        {item.edited && <PencilSimple size={14} weight="fill" color={palette.brand[400]} />}
        {countdown && (
          <View style={[styles.chip, urgent && styles.chipUrgent]}>
            <Clock size={11} weight="fill" color={urgent ? palette.error[400] : palette.warning[400]} />
            <Text style={[styles.chipText, urgent && styles.chipTextUrgent]}>{countdown}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

export const PlanReviewQueueScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<PlanReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setItems(await planReviewService.list('pending'));
    } catch {
      // An unreachable queue shows as empty rather than as an error screen; the coach
      // pulls to retry. Nothing here is destructive enough to warrant an alert.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on focus: approving a draft returns here, and a stale row would invite the
  // coach to approve something already gone.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('planReview.queueTitle')}</Text>
        <Text style={styles.subtitle}>
          {items.length
            ? t('planReview.queueCount', { count: items.length })
            : t('planReview.queueEmptySubtitle')}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={palette.brand[500]} />
        }
        renderItem={({ item }) => (
          <QueueRow item={item} onPress={() => navigation.navigate('PlanReviewDetail', { reviewId: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('planReview.queueEmpty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing['4xl'] },
  row: { marginBottom: theme.spacing.md },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: alpha(palette.brand[500], 0.14), marginRight: theme.spacing.md,
  },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  focus: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.full,
    backgroundColor: alpha(palette.warning[500], 0.14),
  },
  chipUrgent: { backgroundColor: alpha(palette.error[500], 0.16) },
  chipText: { fontSize: 10, fontWeight: '600', color: palette.warning[400] },
  chipTextUrgent: { color: palette.error[400] },
  empty: { paddingTop: theme.spacing['5xl'], alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
});
