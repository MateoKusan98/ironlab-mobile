import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette, alpha } from '../../theme';
import { PrForecast, PrLiftForecast, PrVerdict } from '../../services/ai-coach.service';

/**
 * "Is a PR on today?" — the forecast the athlete sees before they walk up to the bar.
 *
 * Copy (headline / detail / drivers) is authored server-side, exactly like the
 * readiness gate's `reasons`: the wording has to move in lockstep with the thresholds
 * that produced it, and duplicating it here is how the two drift apart. Only the
 * chrome is translated.
 *
 * The card deliberately renders 'not_today' and 'deferred' rather than hiding — an
 * athlete who is told "the strength is there, it lands at the end of your taper" reads
 * a taper as the thing that banks the PR. Hiding the card would make the same taper
 * feel like the app quietly taking the attempt away.
 */

type VerdictStyle = { emoji: string; label: string; color: string; tint: string };

const VERDICT: Record<Exclude<PrVerdict, 'insufficient_data'>, VerdictStyle> = {
  primed:     { emoji: '🔥', label: 'PR ON',        color: palette.success[500], tint: theme.surfaceTint.success },
  on_track:   { emoji: '🎯', label: 'IN RANGE',     color: palette.brand[400],   tint: theme.surfaceTint.brand },
  hold:       { emoji: '🧱', label: 'BUILDING',     color: palette.gray[400],    tint: theme.surfaceTint.neutral },
  not_today:  { emoji: '🛑', label: 'NOT TODAY',    color: palette.warning[500], tint: theme.surfaceTint.warning },
  deferred:   { emoji: '⏳', label: 'HELD',         color: palette.brand[400],   tint: theme.surfaceTint.brand },
};

const CONFIDENCE_LABEL: Record<PrLiftForecast['confidence'], string> = {
  high: 'high confidence',
  medium: 'moderate confidence',
  low: 'low confidence — still learning your numbers',
};

/** Nothing honest to say → say nothing, rather than rendering an empty promise. */
function isRenderable(f: PrForecast | null): f is PrForecast {
  return !!f && !f.suppressed && !!f.best && f.best.verdict !== 'insufficient_data';
}

const MarginRow: React.FC<{ lift: PrLiftForecast }> = ({ lift }) => {
  if (lift.record == null || lift.projectedTop == null) return null;
  const up = (lift.marginPct ?? 0) >= 0;
  return (
    <View style={s.numbers}>
      <View style={s.numberBlock}>
        <Text style={s.numberLabel}>Your record</Text>
        <Text style={s.numberValue}>{lift.record}kg</Text>
      </View>
      <Text style={[s.arrow, { color: up ? palette.success[500] : palette.gray[500] }]}>→</Text>
      <View style={s.numberBlock}>
        <Text style={s.numberLabel}>Projected today</Text>
        <Text style={[s.numberValue, { color: up ? palette.success[500] : palette.gray[300] }]}>
          {lift.projectedTop}kg
        </Text>
      </View>
      <View style={[s.marginPill, { backgroundColor: alpha(up ? palette.success[500] : palette.gray[500], 0.15) }]}>
        <Text style={[s.marginText, { color: up ? palette.success[500] : palette.gray[400] }]}>
          {up ? '+' : ''}{lift.marginPct}%
        </Text>
      </View>
    </View>
  );
};

const LiftDetail: React.FC<{ lift: PrLiftForecast }> = ({ lift }) => {
  const v = lift.verdict === 'insufficient_data' ? null : VERDICT[lift.verdict];
  return (
    <View style={s.liftBlock}>
      <View style={s.liftHeader}>
        <Text style={s.liftName}>{lift.label}</Text>
        {v && (
          <View style={[s.chip, { backgroundColor: alpha(v.color, 0.15) }]}>
            <Text style={[s.chipText, { color: v.color }]}>{v.emoji} {v.label}</Text>
          </View>
        )}
      </View>

      <Text style={s.liftHeadline}>{lift.headline}</Text>
      <Text style={s.liftDetail}>{lift.detail}</Text>

      <MarginRow lift={lift} />

      {/* The mini PR. A triple is a real record in this app and is often live on a
          day the single is not — worth naming so a good day isn't wasted. */}
      {lift.triple?.projected != null && (
        <Text style={s.tripleNote}>
          A triple at {lift.triple.projected}kg would also stand as a record
          {lift.triple.record != null ? ` (current best: ${lift.triple.record}kg)` : ''}.
        </Text>
      )}

      {/* The actionability gap: only singles and triples can set a record. */}
      {!lift.attemptScheduled && (lift.verdict === 'primed' || lift.verdict === 'on_track') && (
        <Text style={s.gapNote}>
          Today's session doesn't have a single or triple on {lift.label.toLowerCase()}, so no record can be set in it —
          this is what you're carrying into your next heavy day.
        </Text>
      )}

      {lift.attemptWindow && (
        <Text style={s.gapNote}>Attempt lands on {lift.attemptWindow}.</Text>
      )}

      {lift.drivers.length > 0 && (
        <View style={s.drivers}>
          {lift.drivers.map((d) => (
            <View key={d.key} style={s.driverRow}>
              <Text
                style={[
                  s.driverDot,
                  {
                    color:
                      d.direction === 'positive' ? palette.success[500]
                        : d.direction === 'negative' ? palette.warning[500]
                          : palette.gray[500],
                  },
                ]}
              >
                {d.direction === 'positive' ? '▲' : d.direction === 'negative' ? '▼' : '•'}
              </Text>
              <Text style={s.driverText}>{d.detail}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.confidence}>
        {CONFIDENCE_LABEL[lift.confidence]} · {lift.sessionsInBlock} session
        {lift.sessionsInBlock === 1 ? '' : 's'} of evidence this block
      </Text>
    </View>
  );
};

export const PRForecastModal: React.FC<{
  visible: boolean;
  forecast: PrForecast | null;
  onClose: () => void;
}> = ({ visible, forecast, onClose }) => {
  const { t } = useTranslation();
  if (!forecast) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modalContainer}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>🏋 {t('aiCoach.prForecast.title', { defaultValue: 'PR forecast' })}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
          >
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={s.modalIntro}>
            {t('aiCoach.prForecast.intro', {
              defaultValue:
                "Read off your logged sets — what the bar has actually been doing this block, not how a day felt. It never changes your programmed weights; it tells you whether the attempt is worth taking.",
            })}
          </Text>

          {forecast.lifts
            .filter((l) => l.verdict !== 'insufficient_data')
            .map((l) => <LiftDetail key={l.lift} lift={l} />)}

          {forecast.lifts.every((l) => l.verdict === 'insufficient_data') && (
            <Text style={s.modalIntro}>
              {t('aiCoach.prForecast.empty', {
                defaultValue: 'Not enough logged work in this block yet. Keep training and this fills in on its own.',
              })}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export const PRForecastCard: React.FC<{ forecast: PrForecast | null }> = ({ forecast }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!isRenderable(forecast)) return null;
  const best = forecast.best!;
  const v = VERDICT[best.verdict as Exclude<PrVerdict, 'insufficient_data'>];

  return (
    <>
      <TouchableOpacity
        style={[s.card, { borderColor: alpha(v.color, 0.4), backgroundColor: v.tint }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${t('aiCoach.prForecast.title', { defaultValue: 'PR forecast' })}: ${best.headline}`}
        accessibilityHint={t('aiCoach.prForecast.hint', { defaultValue: 'Opens the full breakdown for every lift' })}
      >
        <View style={s.cardHeader}>
          <View style={[s.chip, { backgroundColor: alpha(v.color, 0.18) }]}>
            <Text style={[s.chipText, { color: v.color }]}>{v.emoji} {v.label}</Text>
          </View>
          <Text style={s.cardMore}>{t('common.details', { defaultValue: 'Details' })} ›</Text>
        </View>

        <Text style={s.cardHeadline}>{best.headline}</Text>
        <MarginRow lift={best} />
      </TouchableOpacity>

      <PRForecastModal visible={open} forecast={forecast} onClose={() => setOpen(false)} />
    </>
  );
};

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardMore: { color: palette.gray[500], fontSize: 12, fontWeight: '600' },
  cardHeadline: { color: palette.white, fontSize: 15, fontWeight: '700', marginBottom: 10 },

  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  numbers: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numberBlock: {},
  numberLabel: { color: palette.gray[500], fontSize: 10, fontWeight: '600', marginBottom: 2 },
  numberValue: { color: palette.gray[100], fontSize: 17, fontWeight: '800' },
  arrow: { fontSize: 16, fontWeight: '700' },
  marginPill: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  marginText: { fontSize: 12, fontWeight: '800' },

  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  modalTitle: { color: palette.white, fontSize: 18, fontWeight: '800' },
  closeBtn: { padding: 6 },
  closeText: { color: palette.gray[400], fontSize: 18, fontWeight: '700' },
  modalIntro: { color: palette.gray[400], fontSize: 13, lineHeight: 19, marginBottom: 18 },

  liftBlock: {
    borderWidth: 1,
    borderColor: palette.gray[800],
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  liftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  liftName: { color: palette.white, fontSize: 16, fontWeight: '800' },
  liftHeadline: { color: palette.gray[100], fontSize: 14, fontWeight: '700', marginBottom: 6 },
  liftDetail: { color: palette.gray[400], fontSize: 13, lineHeight: 19, marginBottom: 12 },
  tripleNote: { color: palette.brand[400], fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: '600' },
  gapNote: { color: palette.warning[500], fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: '600' },

  drivers: { marginTop: 12, gap: 6 },
  driverRow: { flexDirection: 'row', gap: 8 },
  driverDot: { fontSize: 11, marginTop: 2 },
  driverText: { color: palette.gray[300], fontSize: 12, lineHeight: 18, flex: 1 },

  confidence: { color: palette.gray[600], fontSize: 11, marginTop: 12, fontStyle: 'italic' },
});
