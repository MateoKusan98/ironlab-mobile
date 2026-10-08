import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../../theme';
import { InfoSheet } from '../../../components/ui/InfoSheet';
import type { TimeCut } from '../hooks/useTimeCut';
import type { TimeCutChange } from '../timeCut';

// The time slots an athlete actually says out loud: "I've got 20 minutes", "half an
// hour", "45", "an hour". Only the ones shorter than what is left are offered.
const TIME_OPTIONS_MIN = [20, 30, 45, 60];

export interface TimeCutSheetProps {
  timeCut: TimeCut;
  exName: (name: string) => string;
}

/** Pick the minutes you have, see exactly what goes, apply or back out. */
export const TimeCutSheet: React.FC<TimeCutSheetProps> = ({ timeCut, exName }) => {
  const { t } = useTranslation();
  const { plan, minutesAvailable } = timeCut;
  const options = TIME_OPTIONS_MIN.filter((m) => m < timeCut.minutesLeft);

  return (
    <InfoSheet
      visible={timeCut.open}
      onClose={() => timeCut.setOpen(false)}
      title={`⏱ ${t('activeWorkout.timeCutTitle', { defaultValue: 'Short on time?' })}`}
      subtitle={t('activeWorkout.timeCutSubtitle', {
        minutes: timeCut.minutesLeft,
        defaultValue: 'What is left takes about {{minutes}} min at your rest times. How long have you got?',
      })}
      confirmLabel={t('common.cancel', { defaultValue: 'Cancel' })}
    >
      <View style={styles.options}>
        {options.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.option, minutesAvailable === m && styles.optionPicked]}
            onPress={() => timeCut.setMinutesAvailable(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: minutesAvailable === m }}
          >
            <Text style={styles.optionText}>{t('activeWorkout.timeCutMinutes', { count: m, defaultValue: '{{count}} min' })}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {options.length === 0 && (
        <Text style={styles.note}>{t('activeWorkout.timeCutAlreadyShort', { defaultValue: 'What is left is already short — just get it done.' })}</Text>
      )}

      {plan && (
        <View style={styles.preview}>
          {plan.changes.map((c) => <Text key={c.exIdx} style={styles.change}>{describeChange(c, exName, t)}</Text>)}
          <Text style={styles.note}>
            {t('activeWorkout.timeCutKept', { defaultValue: 'Main lifts stay as written — same sets, same weight.' })}
          </Text>
          {!plan.fits && (
            <Text style={styles.warning}>
              {t('activeWorkout.timeCutMainTooLong', {
                minutes: plan.mainWorkMinutes,
                defaultValue: 'The main lifts alone take about {{minutes}} min. Do them and call it a day — that is still a good session.',
              })}
            </Text>
          )}
          {plan.changes.length > 0 && (
            <TouchableOpacity style={styles.apply} onPress={timeCut.apply} accessibilityRole="button">
              <Text style={styles.applyText}>
                {t('activeWorkout.timeCutApply', { minutes: plan.minutesAfter, defaultValue: 'Cut it to ~{{minutes}} min' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </InfoSheet>
  );
};

function describeChange(c: TimeCutChange, exName: (n: string) => string, t: ReturnType<typeof useTranslation>['t']): string {
  if (c.to === 0) return t('activeWorkout.timeCutDropped', { exercise: exName(c.name), defaultValue: '✕ {{exercise}} — skipped today' });
  return t('activeWorkout.timeCutTrimmed', {
    exercise: exName(c.name), from: c.from, to: c.to, defaultValue: '− {{exercise}}: {{from}} → {{to}} sets',
  });
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: 8, marginTop: 4 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: palette.gray[800], borderWidth: 1, borderColor: palette.gray[700] },
  optionPicked: { borderColor: palette.brand[500], backgroundColor: palette.gray[700] },
  optionText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  preview: { marginTop: 14, gap: 6 },
  change: { fontSize: 14, color: theme.colors.text },
  note: { fontSize: 13, color: palette.gray[400], marginTop: 4 },
  warning: { fontSize: 13, color: palette.warning[400], marginTop: 4 },
  apply: { marginTop: 10, backgroundColor: palette.brand[600], borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  applyText: { fontSize: 15, fontWeight: '700', color: palette.white },
});
