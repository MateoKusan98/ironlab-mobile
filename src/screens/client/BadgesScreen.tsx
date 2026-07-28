import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy } from 'phosphor-react-native';
import { theme, palette } from '../../theme';
import { useBadges } from '../../hooks/useBadges';
import { BADGE_CATALOG, BADGE_GROUPS, BadgeGroup, BadgeKey, BadgeMeta } from '../../services/badges.service';
import { useBadgeCelebration } from '../../contexts/BadgeCelebrationContext';
import { Medallion, MedalTier, TIERS, TIER_ORDER } from '../../components/ui/Medallion';

const LOCKED_IN_THRESHOLDS = [1000, 2500, 5000] as const;

// Tier is derived from a badge's prestige (bonus points); the Dedication
// milestones are the rarest, so they read as Legendary.
function tierFor(b: { group: BadgeGroup; points: number }): MedalTier {
  if (b.group === 'dedication') return 'legendary';
  if (b.points >= 150) return 'diamond';
  if (b.points >= 75) return 'platinum';
  if (b.points >= 50) return 'gold';
  if (b.points >= 25) return 'silver';
  return 'bronze';
}

export const BadgesScreen: React.FC = () => {
  const { data, isLoading, refetch, isRefetching } = useBadges();
  const { refresh: refreshBadges } = useBadgeCelebration();
  const [syncing, setSyncing] = useState(false);

  // Recompute badges on open. Any newly unlocked ones are celebrated globally
  // by the provider, so the popup survives leaving this screen.
  useEffect(() => {
    setSyncing(true);
    refreshBadges().finally(() => setSyncing(false));
  }, [refreshBadges]);

  const unlockedSet = new Set<BadgeKey>(data?.unlockedBadges ?? []);
  const points = data?.achievementPoints ?? 0;

  const nextThreshold = LOCKED_IN_THRESHOLDS.find((t) => points < t) ?? null;
  const progressPct = nextThreshold ? Math.min(points / nextThreshold, 1) : 1;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} size="large" />
      </SafeAreaView>
    );
  }

  const unlockedCount = unlockedSet.size;
  const totalCount = BADGE_CATALOG.length;

  // Highest-tier unlocked medal → featured hero
  const featured: { badge: BadgeMeta; tier: MedalTier } | null = BADGE_CATALOG
    .filter((b) => unlockedSet.has(b.key))
    .map((b) => ({ badge: b, tier: tierFor(b) }))
    .sort((a, z) => TIER_ORDER.indexOf(z.tier) - TIER_ORDER.indexOf(a.tier) || z.badge.points - a.badge.points)[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.backBtn} />
        <View>
          <Text style={styles.title}>Badges</Text>
          <Text style={styles.subtitle}>
            {unlockedCount} / {totalCount} unlocked{syncing ? '  •  syncing...' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.brand[500]} />}
      >
        {/* Achievement Points card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsRow}>
            <View>
              <Text style={styles.pointsLabel}>ACHIEVEMENT POINTS</Text>
              <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
            </View>
            <Trophy size={38} weight="fill" color={nextThreshold === null ? palette.brand[400] : palette.gray[600]} />
          </View>

          {nextThreshold !== null && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressSub}>{nextThreshold - points} pts to next milestone</Text>
                <Text style={styles.progressSub}>{nextThreshold.toLocaleString()}</Text>
              </View>
            </>
          )}
          {nextThreshold === null && (
            <Text style={[styles.progressSub, { marginTop: 8, color: palette.brand[400] }]}>
              Max milestone reached — This Is Your Life Now
            </Text>
          )}

          <View style={styles.pointsHintBox}>
            <Text style={styles.pointsHintTitle}>HOW POINTS ARE EARNED</Text>
            <Text style={styles.pointsHint}>
              You earn points every time you train and eat — badges are just a bonus on top.
            </Text>
            <Text style={styles.pointsHintList}>
              +20 completing a session   ·   +5 logging readiness   ·   +10 RPE on your sets   ·   +5 technique notes   ·   +5 per meal (up to 6/day)   ·   bonus points each time a badge unlocks
            </Text>
          </View>
        </View>

        {/* Featured top medal */}
        {featured && (
          <View style={[styles.heroCard, { borderColor: TIERS[featured.tier].glow + '55' }]}>
            <View style={[styles.heroGlow, { backgroundColor: TIERS[featured.tier].glow + '22' }]} />
            <Medallion tier={featured.tier} size={132} />
            <Text style={[styles.heroTier, { color: TIERS[featured.tier].glow }]}>
              {TIERS[featured.tier].label} · TOP MEDAL
            </Text>
            <Text style={styles.heroName}>{featured.badge.name}</Text>
            <Text style={styles.heroDesc}>{featured.badge.description}</Text>
          </View>
        )}

        {/* Badge sections */}
        {BADGE_GROUPS.map(({ key: group, label }) => {
          const badges = BADGE_CATALOG.filter((b) => b.group === group);
          return (
            <View key={group}>
              <Text style={styles.sectionTitle}>{label}</Text>
              <View style={styles.badgeGrid}>
                {badges.map((badge) => {
                  const unlocked = unlockedSet.has(badge.key);
                  const tier = tierFor(badge);
                  return (
                    <View
                      key={badge.key}
                      style={[styles.badgeCard, unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked]}
                    >
                      <Medallion tier={tier} size={72} locked={!unlocked} />
                      <Text style={[styles.tierLabel, { color: unlocked ? TIERS[tier].glow : palette.gray[600] }]}>
                        {TIERS[tier].label}
                      </Text>
                      <Text style={[styles.badgeName, !unlocked && styles.textMuted]}>{badge.name}</Text>
                      <Text style={[styles.badgeDesc, !unlocked && styles.textDimmed]} numberOfLines={2}>{badge.description}</Text>
                      {badge.points > 0 && (
                        <Text style={[styles.badgePts, !unlocked && styles.textDimmed]}>+{badge.points} pts</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  backBtn: { padding: 8 },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
  subtitle: { fontSize: 12, color: palette.gray[500], marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 48 },

  // Points card
  pointsCard: {
    backgroundColor: palette.gray[900],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.gray[700],
    padding: 18,
    marginBottom: 28,
  },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pointsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: palette.gray[500], marginBottom: 4 },
  pointsValue: { fontSize: 40, fontWeight: '900', color: theme.colors.text },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: palette.gray[700], overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: palette.brand[500] },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressSub: { fontSize: 11, color: palette.gray[500] },
  pointsHintBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.gray[700],
  },
  pointsHintTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: palette.brand[400], marginBottom: 6 },
  pointsHint: { fontSize: 13, color: palette.gray[300], lineHeight: 19, fontWeight: '600', marginBottom: 8 },
  pointsHintList: { fontSize: 11, color: palette.gray[500], lineHeight: 18 },

  // Featured hero
  heroCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: palette.gray[900],
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 28,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  heroTier: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginTop: 14 },
  heroName: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginTop: 6, textAlign: 'center' },
  heroDesc: { fontSize: 12, color: palette.gray[400], marginTop: 4, textAlign: 'center', lineHeight: 17 },

  // Sections
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: palette.gray[500], marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },

  // Badge cards
  badgeCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  badgeCardUnlocked: { backgroundColor: palette.gray[900], borderColor: palette.gray[700] },
  badgeCardLocked: { backgroundColor: palette.gray[950], borderColor: palette.gray[800] },
  tierLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 10, marginBottom: 4 },
  badgeName: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginBottom: 3, textAlign: 'center' },
  badgeDesc: { fontSize: 11, color: palette.gray[400], lineHeight: 15, marginBottom: 6, textAlign: 'center' },
  badgePts: { fontSize: 10, fontWeight: '700', color: palette.brand[500] },
  textMuted: { color: palette.gray[500] },
  textDimmed: { color: palette.gray[700] },
});
