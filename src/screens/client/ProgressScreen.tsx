import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';
import { theme, palette } from '../../theme';
import { ProgressPhotoResponse , ApiResponse } from '@shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Camera, Trash, ScanSmiley } from 'phosphor-react-native';

import { Card } from '../../components/ui';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupByMonth(photos: ProgressPhotoResponse[]) {
  const map: Record<string, ProgressPhotoResponse[]> = {};
  photos.forEach((p) => {
    const key = p.date.slice(0, 7); // "YYYY-MM"
    if (!map[key]) map[key] = [];
    map[key].push(p);
  });
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
}

function formatMonthKey(key: string) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function trendArrow(photos: ProgressPhotoResponse[]) {
  const scans = photos.filter((p) => p.bodyFatPercentage != null);
  if (scans.length < 2) return null;
  const sorted = [...scans].sort((a, b) => a.date.localeCompare(b.date));
  const delta = Number(sorted[sorted.length - 1].bodyFatPercentage) - Number(sorted[0].bodyFatPercentage);
  return { delta: Math.abs(delta).toFixed(1), down: delta < 0 };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ProgressScreen: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['progress-photos'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProgressPhotoResponse[]>>('/users/progress');
      return data.data ?? [];
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post('/users/progress', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress-photos'] }),
    onError: () => Alert.alert(t('common.error'), t('progress.uploadError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/progress/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress-photos'] }),
  });

  const handleAddPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('progress.permissionNeeded'), t('progress.permissionMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const filename = uri.split('/').pop() || 'progress.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    const formData = new FormData();
    formData.append('image', { uri, name: filename, type } as any);

    setIsUploading(true);
    uploadMutation.mutate(formData, { onSettled: () => setIsUploading(false) });
  };

  const confirmDelete = (id: string) => {
    Alert.alert(t('progress.deletePhoto'), t('progress.deletePhotoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
        },
      },
    ]);
  };

  const grouped = useMemo(() => groupByMonth(photos), [photos]);
  const trend = useMemo(() => trendArrow(photos), [photos]);
  const latestScan = useMemo(
    () => photos.find((p) => p.bodyFatPercentage != null),
    [photos],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('progress.title')}</Text>
            <Text style={styles.subtitle}>{photos.length} {photos.length === 1 ? t('progress.entry') : t('progress.entries')}</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleAddPhoto} disabled={isUploading}>
              {isUploading
                ? <ActivityIndicator color={palette.black} size="small" />
                : <Camera size={18} weight="bold" color={palette.black} />
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => navigation.navigate('BodyScan', {})}
            >
              <ScanSmiley size={18} weight="bold" color={palette.black} />
              <Text style={styles.scanBtnText}>{t('progress.scan')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Trend Banner (if ≥2 body scans) ── */}
        {trend && (
          <View style={[styles.trendBanner, { borderColor: trend.down ? palette.success[600] : palette.error[600] }]}>
            <Text style={styles.trendEmoji}>{trend.down ? '📉' : '📈'}</Text>
            <Text style={styles.trendText}>
              {t('progress.bodyFatPrefix')}{' '}
              <Text style={{ color: trend.down ? palette.success[400] : palette.error[400], fontWeight: '700' }}>
                {trend.down ? '↓' : '↑'} {trend.delta}%
              </Text>
              {' '}{t('progress.bodyFatSuffix')}
            </Text>
          </View>
        )}

        {/* ── Latest scan quick-stats ── */}
        {latestScan && latestScan.bodyFatPercentage != null && (
          <View style={styles.statsRow}>
            <QuickStat label={t('progress.bodyFat')} value={`${Number(latestScan.bodyFatPercentage).toFixed(1)}%`} color={palette.error[400]} />
            <QuickStat label={t('progress.bodyWater')} value={`${Number(latestScan.bodyWaterPercentage ?? 0).toFixed(1)}%`} color={palette.info[400]} />
            <QuickStat label={t('progress.muscle')} value={`${Number(latestScan.muscleMassKg ?? 0).toFixed(1)}kg`} color={palette.success[400]} />
            <QuickStat label={t('progress.bmr')} value={`${latestScan.bmr ?? '—'}`} sub="kcal" color={palette.brand[400]} />
          </View>
        )}

        {/* ── Empty state ── */}
        {isLoading ? (
          <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 60 }} />
        ) : photos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>{t('progress.noPhotos')}</Text>
            <Text style={styles.emptySub}>{t('progress.noPhotosSub')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('BodyScan', {})}>
              <Text style={styles.emptyBtnText}>{t('progress.startFirstScan')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(([monthKey, monthPhotos]) => (
            <View key={monthKey} style={styles.monthSection}>
              <Text style={styles.monthLabel}>{formatMonthKey(monthKey)}</Text>
              <View style={styles.grid}>
                {monthPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    isDeleting={deletingId === photo.id}
                    onDelete={() => confirmDelete(photo.id)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── PhotoCard ─────────────────────────────────────────────────────────────────

const PhotoCard: React.FC<{
  photo: ProgressPhotoResponse;
  isDeleting: boolean;
  onDelete: () => void;
}> = ({ photo, isDeleting, onDelete }) => {
  const hasScan = photo.bodyFatPercentage != null;
  const dateLabel = new Date(photo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card padding={0} radius={18} borderColor={theme.colors.cardElevated} style={cardStyles.cardBox}>
      <Image source={{ uri: photo.imageUrl }} style={cardStyles.image} resizeMode="cover" />

      {/* Top row: date + delete */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.dateBadge}>
          <Text style={cardStyles.dateText}>{dateLabel}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={cardStyles.deleteBtn} disabled={isDeleting}>
          {isDeleting
            ? <ActivityIndicator size="small" color={palette.white} />
            : <Trash size={14} weight="bold" color={palette.white} />
          }
        </TouchableOpacity>
      </View>

      {/* Bottom: body scan chips */}
      {hasScan && (
        <View style={cardStyles.chips}>
          <StatChip color={palette.error[400]} label={`${Number(photo.bodyFatPercentage).toFixed(1)}% fat`} />
          <StatChip color={palette.info[400]} label={`${Number(photo.bodyWaterPercentage ?? 0).toFixed(0)}% H₂O`} />
          {photo.muscleMassKg != null && (
            <StatChip color={palette.success[400]} label={`${Number(photo.muscleMassKg).toFixed(1)}kg muscle`} />
          )}
          {photo.metabolicAge != null && (
            <StatChip color={palette.warning[400]} label={`Age ${photo.metabolicAge}`} />
          )}
        </View>
      )}

      {/* Scan badge */}
      {hasScan && (
        <View style={cardStyles.scanBadge}>
          <Text style={cardStyles.scanBadgeText}>AI Scan</Text>
        </View>
      )}
    </Card>
  );
};

const StatChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={[chipStyles.chip, { borderColor: color + '66' }]}>
    <View style={[chipStyles.dot, { backgroundColor: color }]} />
    <Text style={chipStyles.label}>{label}</Text>
  </View>
);

const QuickStat: React.FC<{ label: string; value: string; sub?: string; color: string }> = ({ label, value, sub, color }) => (
  <Card radius={14} padding={12} borderColor={theme.colors.cardElevated} gap={2} style={quickStyles.cardBox}>
    <Text style={[quickStyles.value, { color }]}>{value}</Text>
    {sub && <Text style={quickStyles.sub}>{sub}</Text>}
    <Text style={quickStyles.label}>{label}</Text>
  </Card>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: palette.white },
  subtitle: { fontSize: 13, color: palette.zinc[500], marginTop: 2 },
  headerLeft: { flex: 1, marginRight: 8, minWidth: 0 },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.brand[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanBtnText: { fontSize: 14, fontWeight: '700', color: palette.black },

  trendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.mono[11],
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  trendEmoji: { fontSize: 18 },
  trendText: { fontSize: 14, color: palette.zinc[400] },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },

  monthSection: { marginBottom: 24 },
  monthLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.zinc[500],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: palette.white, marginBottom: 8 },
  emptySub: { fontSize: 14, color: palette.zinc[500], textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: palette.brand[500],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: palette.black },
});

const cardStyles = StyleSheet.create({
  cardBox: { width: CARD_WIDTH, overflow: 'hidden' },
  image: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
  },
  topRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: { fontSize: 11, fontWeight: '700', color: palette.white },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  scanBadge: {
    position: 'absolute',
    top: 8,
    right: 34,
  },
  scanBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: palette.brand[400],
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: '600', color: palette.white },
});

const quickStyles = StyleSheet.create({
  cardBox: { flex: 1, alignItems: 'center' },
  value: { fontSize: 16, fontWeight: 'bold' },
  sub: { fontSize: 10, color: palette.zinc[500] },
  label: { fontSize: 10, color: palette.zinc[500], textAlign: 'center' },
});
