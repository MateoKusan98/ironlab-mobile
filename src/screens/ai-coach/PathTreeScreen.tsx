import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import {
  aiCoachService, PathTree, PathNodeState, PathMilestone, PathBranch,
} from '../../services/ai-coach.service';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PathTree'>;
};

const NODE_COLORS: Record<PathNodeState, { bg: string; border: string; text: string }> = {
  completed: { bg: 'rgba(234,88,12,0.18)', border: palette.brand[500], text: palette.brand[300] },
  current:   { bg: 'rgba(234,88,12,0.10)', border: palette.brand[400], text: palette.brand[300] },
  available: { bg: palette.gray[900],      border: palette.gray[700],  text: palette.gray[300] },
  locked:    { bg: palette.gray[900],      border: palette.gray[800],  text: palette.gray[600] },
};

const ProgressBar = ({ value }: { value: number }) => (
  <View style={s.progressTrack}>
    <View style={[s.progressFill, { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }]} />
  </View>
);

const MilestoneRow = ({ m }: { m: PathMilestone }) => (
  <View style={[s.msRow, m.achieved && s.msRowDone]}>
    <Text style={[s.msIcon, !m.achieved && s.msIconLocked]}>{m.achieved ? m.icon : '🔒'}</Text>
    <View style={{ flex: 1 }}>
      <View style={s.msTop}>
        <Text style={[s.msLabel, m.achieved && s.msLabelDone]}>{m.label}</Text>
        <Text style={s.msMeta}>
          {m.achieved ? '✓' : `${m.current}/${m.target} ${m.unit}`}
        </Text>
      </View>
      {!m.achieved && <ProgressBar value={m.progress} />}
    </View>
  </View>
);

const TierPill = ({ label, state }: { label: string; state: PathNodeState }) => {
  const c = NODE_COLORS[state];
  return (
    <View style={[s.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      {state === 'current' && <View style={s.pillDot} />}
      <Text style={[s.pillText, { color: c.text }]} numberOfLines={1}>
        {state === 'completed' ? '✓ ' : state === 'locked' ? '🔒 ' : ''}{label}
      </Text>
    </View>
  );
};

const BranchCard = ({ branch }: { branch: PathBranch }) => (
  <View style={[s.branch, branch.isCurrent && s.branchCurrent]}>
    <View style={s.branchHead}>
      <Text style={s.branchIcon}>{branch.icon}</Text>
      <Text style={[s.branchLabel, branch.isCurrent && s.branchLabelCurrent]}>{branch.label}</Text>
      {branch.isCurrent && (
        <View style={s.youBadge}><Text style={s.youBadgeText}>YOU</Text></View>
      )}
    </View>
    <View style={s.pillRow}>
      {branch.tiers.map((tn) => (
        <TierPill key={tn.tier} label={tn.label} state={tn.state} />
      ))}
    </View>
  </View>
);

export const PathTreeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [tree, setTree] = useState<PathTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    aiCoachService.getPathTree()
      .then((d) => { if (alive) setTree(d); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const currentBranch = tree?.branches.find((b) => b.isCurrent);
  const currentTierLabel = currentBranch?.tiers.find((tn) => tn.state === 'current')?.label
    ?? (tree?.foundation === 'current' ? 'Foundation' : currentBranch?.label);

  const consistency = tree?.milestones.filter((m) => m.kind === 'consistency') ?? [];
  const strength = tree?.milestones.filter((m) => m.kind === 'strength') ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>{t('pathTree.title')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={palette.brand[500]} /></View>
      ) : error || !tree ? (
        <View style={s.center}><Text style={s.errText}>{t('pathTree.error')}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* You are here */}
          <View style={s.hereCard}>
            <Text style={s.hereLabel}>{t('pathTree.youAreHere')}</Text>
            <Text style={s.hereValue}>
              {currentBranch?.icon} {currentBranch?.label} · {currentTierLabel}
            </Text>
          </View>

          {/* Next up */}
          {tree.nextMilestones.length > 0 && (
            <>
              <Text style={s.sectionTitle}>{t('pathTree.nextUp')}</Text>
              {tree.nextMilestones.map((m) => <MilestoneRow key={`next-${m.id}`} m={m} />)}
            </>
          )}

          {/* The tree */}
          <Text style={s.sectionTitle}>{t('pathTree.yourJourney')}</Text>
          <View style={[s.foundation, tree.foundation === 'current' && s.foundationCurrent]}>
            <Text style={s.foundationIcon}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.foundationLabel}>{t('pathTree.foundation')}</Text>
              <Text style={s.foundationSub}>{t('pathTree.foundationSub')}</Text>
            </View>
            {tree.foundation === 'completed' && <Text style={s.foundationCheck}>✓</Text>}
          </View>
          <Text style={s.branchStem}>┃</Text>
          {tree.branches.map((b) => <BranchCard key={b.id} branch={b} />)}

          {/* Milestones */}
          <Text style={s.sectionTitle}>{t('pathTree.consistency')}</Text>
          {consistency.map((m) => <MilestoneRow key={m.id} m={m} />)}

          <Text style={s.sectionTitle}>{t('pathTree.strengthClubs')}</Text>
          {strength.map((m) => <MilestoneRow key={m.id} m={m} />)}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 22, fontWeight: '900', color: palette.white },
  close: { fontSize: 22, color: palette.gray[400] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errText: { color: palette.gray[500], fontSize: 14 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  hereCard: {
    backgroundColor: 'rgba(234,88,12,0.10)', borderWidth: 1, borderColor: palette.brand[600],
    borderRadius: 16, padding: 16, marginBottom: 8,
  },
  hereLabel: { color: palette.brand[400], fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  hereValue: { color: palette.white, fontSize: 18, fontWeight: '800' },

  sectionTitle: { color: palette.gray[300], fontSize: 14, fontWeight: '800', marginTop: 22, marginBottom: 10 },

  foundation: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700],
    borderRadius: 14, padding: 14,
  },
  foundationCurrent: { borderColor: palette.brand[400], backgroundColor: 'rgba(234,88,12,0.10)' },
  foundationIcon: { fontSize: 26 },
  foundationLabel: { color: palette.white, fontSize: 15, fontWeight: '800' },
  foundationSub: { color: palette.gray[500], fontSize: 12, marginTop: 2 },
  foundationCheck: { color: palette.brand[400], fontSize: 18, fontWeight: '800' },
  branchStem: { color: palette.gray[700], fontSize: 16, textAlign: 'center', marginVertical: 2 },

  branch: {
    backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[800],
    borderRadius: 14, padding: 14, marginBottom: 10, opacity: 0.7,
  },
  branchCurrent: { opacity: 1, borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.06)' },
  branchHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  branchIcon: { fontSize: 20 },
  branchLabel: { color: palette.gray[300], fontSize: 16, fontWeight: '800', flex: 1 },
  branchLabelCurrent: { color: palette.white },
  youBadge: { backgroundColor: palette.brand[500], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  youBadgeText: { color: palette.black, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.brand[400] },
  pillText: { fontSize: 12, fontWeight: '700' },

  msRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[800],
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  msRowDone: { borderColor: palette.brand[600], backgroundColor: 'rgba(234,88,12,0.06)' },
  msIcon: { fontSize: 22 },
  msIconLocked: { opacity: 0.6 },
  msTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  msLabel: { color: palette.gray[300], fontSize: 14, fontWeight: '700', flex: 1 },
  msLabelDone: { color: palette.white },
  msMeta: { color: palette.gray[500], fontSize: 12, fontWeight: '600', marginLeft: 8 },
  progressTrack: { height: 6, backgroundColor: palette.gray[800], borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.brand[500], borderRadius: 3 },
});
