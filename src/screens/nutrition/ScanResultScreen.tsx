import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { palette } from '../../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../stores/auth.store';

const { width } = Dimensions.get('window');

interface BodyScanAnalysis {
  bodyFatPercentage: number;
  bodyWaterPercentage: number;
  leanMassKg: number;
  fatMassKg: number;
  muscleMassKg: number;
  boneMassKg: number;
  visceralFatLevel: number;
  bmr: number;
  metabolicAge: number | null;
  goal: string;
  explanation: string;
  calories: number;
  macros: { protein: number; fat: number; carbs: number };
}

function visceralFatColor(level: number): string {
  if (level <= 4) return palette.success[400];
  if (level <= 8) return palette.warning[400];
  return palette.error[400];
}

function bodyFatRating(pct: number, isFemale: boolean): { label: string; color: string } {
  if (isFemale) {
    if (pct < 14) return { label: 'Essential', color: palette.info[400] };
    if (pct < 21) return { label: 'Athletic', color: palette.success[400] };
    if (pct < 25) return { label: 'Fitness', color: palette.success[500] };
    if (pct < 32) return { label: 'Average', color: palette.warning[400] };
    return { label: 'Obese', color: palette.error[400] };
  }
  if (pct < 6) return { label: 'Essential', color: palette.info[400] };
  if (pct < 14) return { label: 'Athletic', color: palette.success[400] };
  if (pct < 18) return { label: 'Fitness', color: palette.success[500] };
  if (pct < 25) return { label: 'Average', color: palette.warning[400] };
  return { label: 'Obese', color: palette.error[400] };
}

export const ScanResultScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ScanResult'>>();
  const { analysis: rawAnalysis } = route.params;
  const analysis = rawAnalysis as BodyScanAnalysis;
  const user = useAuthStore((s) => s.user);

  const firstName = user?.name?.split(' ')[0] || 'Athlete';
  const isFemale = user?.gender?.toLowerCase().includes('female') || false;
  const fatRating = bodyFatRating(analysis.bodyFatPercentage, isFemale);

  // Composition bar segments (water / fat / other lean)
  const waterSeg = analysis.bodyWaterPercentage;
  const fatSeg = analysis.bodyFatPercentage;
  const leanOtherSeg = Math.max(0, 100 - waterSeg - fatSeg);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.aiLogo}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {t('scanResult.title', { name: firstName })}
        </Text>
        <Text style={styles.subtitle}>{t('scanResult.subtitle')}</Text>

        {/* ── Body Fat Ring Card ── */}
        <View style={styles.card}>
          <View style={styles.ringRow}>
            <View style={styles.ringOuter}>
              <View style={[styles.ringProgress, { borderColor: fatRating.color }]}>
                <Text style={[styles.ringValue, { color: fatRating.color }]}>
                  {analysis.bodyFatPercentage.toFixed(1)}%
                </Text>
                <Text style={styles.ringLabel}>{t('scanResult.bodyFat')}</Text>
              </View>
            </View>
            <View style={styles.ringStats}>
              <View style={styles.ringStat}>
                <Text style={styles.ringStatValue}>{analysis.fatMassKg} kg</Text>
                <Text style={styles.ringStatLabel}>{t('scanResult.fatMass')}</Text>
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: fatRating.color + '22' }]}>
                <Text style={[styles.ratingText, { color: fatRating.color }]}>{fatRating.label}</Text>
              </View>
              <View style={styles.ringStat}>
                <Text style={styles.ringStatValue}>{analysis.leanMassKg} kg</Text>
                <Text style={styles.ringStatLabel}>{t('scanResult.leanMass')}</Text>
              </View>
            </View>
          </View>

          {/* Composition Bar */}
          <View style={styles.compBarWrap}>
            <View style={styles.compBar}>
              <View style={[styles.compSeg, { flex: waterSeg, backgroundColor: palette.info[500] }]} />
              <View style={[styles.compSeg, { flex: fatSeg, backgroundColor: palette.error[400] }]} />
              <View style={[styles.compSeg, { flex: leanOtherSeg, backgroundColor: palette.success[500] }]} />
            </View>
            <View style={styles.compLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.info[500] }]} />
                <Text style={styles.legendText}>{t('scanResult.water')} {waterSeg.toFixed(0)}%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.error[400] }]} />
                <Text style={styles.legendText}>{t('scanResult.fat')} {fatSeg.toFixed(0)}%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.success[500] }]} />
                <Text style={styles.legendText}>{t('scanResult.lean')} {leanOtherSeg.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Metrics Grid ── */}
        <View style={styles.grid}>
          <MetricCard icon="💧" value={`${analysis.bodyWaterPercentage}%`} label={t('scanResult.bodyWater')} accent={palette.info[400]} />
          <MetricCard icon="💪" value={`${analysis.muscleMassKg} kg`} label={t('scanResult.muscleMass')} accent={palette.success[400]} />
          <MetricCard icon="🦴" value={`${analysis.boneMassKg} kg`} label={t('scanResult.boneMass')} accent={palette.gray[300]} />
          <MetricCard
            icon="🔶"
            value={`${analysis.visceralFatLevel}/12`}
            label={t('scanResult.visceralFat')}
            accent={visceralFatColor(analysis.visceralFatLevel)}
          />
          <MetricCard icon="🔥" value={`${analysis.bmr.toLocaleString()}`} label={t('scanResult.bmr')} sub="kcal/day" accent={palette.brand[400]} />
          {analysis.metabolicAge != null ? (
            <MetricCard
              icon="⚡"
              value={`${analysis.metabolicAge}`}
              sub="yrs"
              label={t('scanResult.metabolicAge')}
              accent={analysis.metabolicAge <= (30) ? palette.success[400] : palette.warning[400]}
            />
          ) : (
            <MetricCard icon="⚡" value="—" label={t('scanResult.metabolicAge')} accent={palette.gray[400]} />
          )}
        </View>

        {/* ── AI Strategy ── */}
        <View style={[styles.card, styles.strategyCard]}>
          <View style={styles.strategyHeader}>
            <Text style={styles.strategyGoalBadge}>{analysis.goal}</Text>
            <Text style={styles.strategyTitle}>{t('scanResult.aiStrategy')}</Text>
          </View>
          <Text style={styles.strategyText}>{analysis.explanation}</Text>
        </View>

        {/* ── Nutrition Targets ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('scanResult.nutritionTargets')}</Text>
          <View style={styles.calorieRow}>
            <Text style={styles.calorieValue}>{analysis.calories.toLocaleString()}</Text>
            <Text style={styles.calorieUnit}> kcal / {t('scanResult.day')}</Text>
          </View>
          <View style={styles.macrosRow}>
            <MacroChip label="Protein" value={analysis.macros.protein} color={palette.brand[500]} />
            <MacroChip label="Carbs" value={analysis.macros.carbs} color={palette.warning[400]} />
            <MacroChip label="Fat" value={analysis.macros.fat} color={palette.error[400]} />
          </View>
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('ClientApp' as any)}
        >
          <Text style={styles.ctaBtnText}>{t('scanResult.continueBtn')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────────

const MetricCard: React.FC<{
  icon: string;
  value: string;
  label: string;
  sub?: string;
  accent: string;
}> = ({ icon, value, label, sub, accent }) => (
  <View style={metricStyles.card}>
    <Text style={metricStyles.icon}>{icon}</Text>
    <View style={metricStyles.valueRow}>
      <Text style={[metricStyles.value, { color: accent }]}>{value}</Text>
      {sub && <Text style={metricStyles.sub}>{sub}</Text>}
    </View>
    <Text style={metricStyles.label}>{label}</Text>
  </View>
);

const MacroChip: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={macroStyles.chip}>
    <Text style={[macroStyles.value, { color }]}>{value}g</Text>
    <Text style={macroStyles.label}>{label}</Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#18181B';
const CARD_BORDER = '#27272A';
const TEXT_MUTED = '#71717A';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  scroll: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: '#FFF' },
  aiLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  plusIcon: { fontSize: 26, color: '#000', fontWeight: 'bold' },

  title: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  subtitle: { fontSize: 14, color: TEXT_MUTED, marginBottom: 24 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    marginBottom: 16,
  },
  strategyCard: { gap: 12 },

  // Ring section
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  ringOuter: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  ringValue: { fontSize: 22, fontWeight: 'bold' },
  ringLabel: { fontSize: 10, color: TEXT_MUTED, marginTop: 2 },
  ringStats: { flex: 1, gap: 12, alignItems: 'flex-start' },
  ringStat: { gap: 2 },
  ringStatValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  ringStatLabel: { fontSize: 12, color: TEXT_MUTED },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingText: { fontSize: 13, fontWeight: '600' },

  // Composition bar
  compBarWrap: { gap: 10 },
  compBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  compSeg: { borderRadius: 4 },
  compLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: TEXT_MUTED },

  // Metrics grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  // Strategy
  strategyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strategyGoalBadge: {
    backgroundColor: palette.brand[600] + '33',
    color: palette.brand[400],
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  strategyTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  strategyText: { fontSize: 14, color: '#A1A1AA', lineHeight: 22 },

  // Nutrition targets
  sectionTitle: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED, marginBottom: 12 },
  calorieRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  calorieValue: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  calorieUnit: { fontSize: 14, color: TEXT_MUTED },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between' },

  // CTA
  ctaBtn: {
    backgroundColor: palette.brand[500],
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaBtnText: { fontSize: 17, fontWeight: 'bold', color: '#000' },
});

const metricStyles = StyleSheet.create({
  card: {
    width: (width - 50) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 4,
  },
  icon: { fontSize: 22, marginBottom: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  value: { fontSize: 22, fontWeight: 'bold' },
  sub: { fontSize: 12, color: TEXT_MUTED },
  label: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
});

const macroStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 2,
  },
  value: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 12, color: TEXT_MUTED },
});
