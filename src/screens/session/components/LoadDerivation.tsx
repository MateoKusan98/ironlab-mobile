import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, palette, alpha } from '../../../theme';
import { LoadBasisView } from '../../../services/ai-coach.service';

export interface LoadDerivationProps {
  basis: LoadBasisView;
  weight: number;
  /** weight as a percentage of the basis anchor, computed server-side. */
  weightPerc?: number;
  /** Opens the maxes section of AI Coach settings. Omit to hide the stale-max action. */
  onFixMax?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  heavy: 'heavy day',
  secondary: 'secondary day',
  volume: 'volume day',
  technique: 'technique day',
};

const kg = (n: number) => `${Math.round(n * 10) / 10}kg`;

/**
 * WHY THIS WEIGHT — the derivation behind a computed comp-lift load, spelled out.
 *
 * The big-3 bar weight stopped being the model's choice and became the value of one
 * expression, which means for the first time there is an actual chain to show rather
 * than a number to take on faith. Every line here is one term of it:
 *
 *     anchor  ×  role discount  →  % at the target RPE  →  rounded to the bar
 *
 * It buys trust, and it buys something the engine cannot buy for itself. The anchor is
 * deliberately the athlete's STORED max — a rolling estimate off training logs is what
 * caused the 2026-08-17 mis-load — and a stored max only moves when the athlete moves it.
 * So a max that has gone stale silently discounts every prescription made from it, and
 * until this card the only place that fact appeared was a validator's log line. The one
 * person who can fix it in a single tap was the only one who could not see it.
 *
 * Renders NOTHING it was not given. No basis (an accessory, a deload/taper/realization
 * day, a plan generated before the snapshot existed) means no card — an invented
 * explanation of a load is worse than none.
 */
export const LoadDerivation: React.FC<LoadDerivationProps> = ({ basis, weight, weightPerc, onFixMax }) => {
  const { t } = useTranslation();
  const { rpeParts, stale } = basis;

  const anchorLabel =
    basis.anchorSource === 'stored-1rm' ? t('loadDerivation.sourceStored', { defaultValue: 'your stored 1RM' })
    : basis.anchorSource === 'own-e1rm' ? t('loadDerivation.sourceOwn', { defaultValue: 'your own logged best on this movement' })
    : t('loadDerivation.sourceRatio', { defaultValue: 'estimated from your competition lift (first time doing this one)' });

  // Only the terms that actually moved the number. A line reading "−0 for frequency" is
  // noise dressed as transparency.
  const rpeTerms = [
    t('loadDerivation.rpeBlock', { rpe: rpeParts.phase, defaultValue: 'RPE {{rpe}} for this block' }),
    ...(rpeParts.weeklyRamp > 0 ? [t('loadDerivation.rpeRamp', { amount: rpeParts.weeklyRamp, defaultValue: '+{{amount}} this week' })] : []),
    ...(rpeParts.frequencyDamping > 0 ? [t('loadDerivation.rpeFrequency', { amount: rpeParts.frequencyDamping, defaultValue: '\u2212{{amount}} for training it often' })] : []),
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('loadDerivation.title', { weight, defaultValue: 'WHY {{weight}}KG' })}</Text>

      <View style={styles.row}>
        <Text style={styles.value}>{kg(basis.anchor)}</Text>
        <Text style={styles.term}>{anchorLabel}</Text>
      </View>

      {basis.roleMultiplier !== 1 && (
        <View style={styles.row}>
          <Text style={styles.value}>× {Math.round(basis.roleMultiplier * 100)}%</Text>
          <Text style={styles.term}>{ROLE_LABEL[basis.role ?? ''] ?? basis.role}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.value}>RPE {basis.targetRpe}</Text>
        <Text style={styles.term}>{rpeTerms.join(' · ')}</Text>
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.result}>
          {weightPerc ? `${weightPerc}% → ` : ''}{weight}kg
        </Text>
        <Text style={styles.term}>{t('loadDerivation.rounded', { increment: basis.incrementKg, defaultValue: 'rounded to the nearest {{increment}}kg' })}</Text>
      </View>

      {/* The stale anchor. Stated as an estimate, because that is what it is — the
          demonstrated e1RM is inverted from logged sets, and the stored max is a real
          tested single. We report the gap; the athlete decides whether it is real. */}
      {stale && (
        <TouchableOpacity
          style={styles.stale}
          onPress={onFixMax}
          disabled={!onFixMax}
          accessibilityRole={onFixMax ? 'button' : undefined}
          accessibilityLabel={t('loadDerivation.staleA11y', { defaultValue: 'Update your stored one rep max' })}
        >
          <Text style={styles.staleText}>
            {t('loadDerivation.stale', {
              demonstrated: kg(stale.demonstratedE1Rm),
              stored: kg(stale.storedAnchor),
              pct: Math.round(stale.deltaPct),
              defaultValue: 'Your logged sets estimate {{demonstrated}} — {{pct}}% above the {{stored}} this was priced from.',
            })}
          </Text>
          {onFixMax ? <Text style={styles.staleCta}>{t('loadDerivation.staleCta', { defaultValue: 'Update your max \u2192' })}</Text> : null}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.gray[700],
    gap: 4,
  },
  title: { fontSize: 11, fontWeight: '800', color: palette.gray[400], letterSpacing: 1, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  value: { fontSize: 13, fontWeight: '700', color: theme.colors.text, minWidth: 72 },
  term: { flex: 1, fontSize: 12, color: palette.gray[400], lineHeight: 17 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: palette.gray[800],
  },
  result: { fontSize: 15, fontWeight: '800', color: theme.colors.text, minWidth: 72 },
  stale: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: alpha(palette.warning[500], 0.1),
    borderWidth: 1,
    borderColor: alpha(palette.warning[500], 0.3),
    gap: 4,
  },
  staleText: { fontSize: 12, color: theme.colors.text, lineHeight: 17 },
  staleCta: { fontSize: 12, fontWeight: '700', color: palette.warning[500] },
});
