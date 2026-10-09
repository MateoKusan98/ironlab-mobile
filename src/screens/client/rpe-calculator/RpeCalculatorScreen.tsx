import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import { KeyboardAwareScreen } from '../../../components/ui/KeyboardAwareScreen';
import type { RpeChart } from '../../../services/session.service';
import { LiftingUnit, formatNumber, unitLabel } from '../../../units/weight';
import { useLiftingUnit } from '../../../units/useLiftingUnit';
import { ChipPicker } from './ChipPicker';
import { chartReps, estimatedMax, isExtrapolated, loadFor } from './rpeCalc';
import { useRpeChart } from './useRpeChart';
import { styles } from './RpeCalculatorScreen.styles';

/** A heavy triple in, a five out — the conversion lifters most often do in their heads. */
const DEFAULT_DONE = { reps: 3, rpe: 8 };
const DEFAULT_TARGET = { reps: 5, rpe: 8 };

/** "142,5" is how half the app's languages write a decimal. */
const parseWeight = (text: string): number => parseFloat(text.replace(',', '.'));

/**
 * The RPE calculator (2026-10-09): "I did 160×3 @ 8 — what's 5 @ 7?"
 *
 * Priced off the engine's own chart, so it agrees with the loads the coach prescribes.
 * A tool for the athlete's own sums; it never writes a load anywhere.
 */
export const RpeCalculatorScreen: React.FC = () => {
  const { t } = useTranslation();
  const chartState = useRpeChart();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t('rpeCalculator.title', { defaultValue: 'RPE calculator' })}
        </Text>
        <Text style={styles.subtitle}>
          {t('rpeCalculator.subtitle', { defaultValue: 'From a set you did to the weight for the one you want' })}
        </Text>
      </View>
      {chartState.status === 'loading' && <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} />}
      {chartState.status === 'unavailable' && (
        <Text style={styles.empty}>
          {t('rpeCalculator.unavailable', { defaultValue: 'The calculator needs a connection the first time you open it.' })}
        </Text>
      )}
      {chartState.status === 'ready' && <Calculator chart={chartState.chart} />}
    </SafeAreaView>
  );
};

const Calculator: React.FC<{ chart: RpeChart }> = ({ chart }) => {
  const { t } = useTranslation();
  const unit = useLiftingUnit();
  const [weightText, setWeightText] = useState('');
  const [done, setDone] = useState(DEFAULT_DONE);
  const [target, setTarget] = useState(DEFAULT_TARGET);

  const reps = chartReps(chart);
  // Ascending reads naturally left to right; the server sends the chart's RPE 10 → 6 order.
  const rpes = [...chart.rpe].sort((a, b) => a - b);
  const repsA11y = (n: number) => t('rpeCalculator.repsA11y', { count: n, defaultValue: '{{count}} reps' });
  const rpeA11y = (n: number) => t('rpeCalculator.rpeA11y', { rpe: formatNumber(n), defaultValue: 'RPE {{rpe}}' });

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('rpeCalculator.yourSet', { defaultValue: 'THE SET YOU DID' })}</Text>
        <View style={styles.weightRow}>
          <TextInput
            style={styles.weightInput}
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={palette.gray[600]}
            accessibilityLabel={t('rpeCalculator.weightA11y', { unit: unitLabel(unit), defaultValue: 'Weight lifted, in {{unit}}' })}
          />
          <Text style={styles.weightUnit}>{unitLabel(unit)}</Text>
        </View>
        <ChipPicker label={t('rpeCalculator.reps', { defaultValue: 'Reps' })} options={reps} value={done.reps} onChange={(n) => setDone({ ...done, reps: n })} a11yLabel={repsA11y} />
        <ChipPicker label="RPE" options={rpes} value={done.rpe} onChange={(n) => setDone({ ...done, rpe: n })} a11yLabel={rpeA11y} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('rpeCalculator.target', { defaultValue: 'THE SET YOU WANT' })}</Text>
        <ChipPicker label={t('rpeCalculator.reps', { defaultValue: 'Reps' })} options={reps} value={target.reps} onChange={(n) => setTarget({ ...target, reps: n })} a11yLabel={repsA11y} />
        <ChipPicker label="RPE" options={rpes} value={target.rpe} onChange={(n) => setTarget({ ...target, rpe: n })} a11yLabel={rpeA11y} />
      </View>

      <Result chart={chart} unit={unit} done={{ ...done, weight: parseWeight(weightText) }} target={target} />

      <Text style={styles.footnote}>
        {t('rpeCalculator.footnote', { defaultValue: 'Uses the same RPE chart your coach prices your loads from.' })}
      </Text>
    </KeyboardAwareScreen>
  );
};

interface ResultProps {
  chart: RpeChart;
  unit: LiftingUnit;
  done: { weight: number; reps: number; rpe: number };
  target: { reps: number; rpe: number };
}

const Result: React.FC<ResultProps> = ({ chart, unit, done, target }) => {
  const { t } = useTranslation();
  const max = estimatedMax(chart, done);
  const load = max != null ? loadFor(chart, max, target, unit) : null;

  if (max == null || load == null) {
    return (
      <View style={styles.resultCard}>
        <Text style={styles.resultHint}>{t('rpeCalculator.enterWeight', { defaultValue: 'Enter the weight you lifted.' })}</Text>
      </View>
    );
  }

  const u = unitLabel(unit);
  return (
    <View style={styles.resultCard} accessibilityLiveRegion="polite">
      <Text style={styles.resultLoad}>{formatNumber(load)} {u}</Text>
      <Text style={styles.resultFor}>
        {t('rpeCalculator.resultFor', { reps: target.reps, rpe: formatNumber(target.rpe), defaultValue: 'for {{reps}} reps @ RPE {{rpe}}' })}
      </Text>
      <Text style={styles.resultMax}>
        {t('rpeCalculator.estimatedMax', { max: `${formatNumber(Math.round(max * 10) / 10)} ${u}`, defaultValue: 'Estimated max: {{max}}' })}
      </Text>
      {isExtrapolated(chart, done) && (
        <Text style={styles.caveat}>
          {t('rpeCalculator.roughEstimate', {
            rpe: formatNumber(chart.nearFailureRpe),
            reps: chart.nearFailureMaxReps,
            defaultValue: 'Rough estimate: below RPE {{rpe}} or past {{reps}} reps, the chart is guessing at reps you never did. A set closer to failure gives a truer number.',
          })}
        </Text>
      )}
    </View>
  );
};
