import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Eye, Minus, Sparkle } from 'phosphor-react-native';
import { theme, palette, alpha } from '../../theme';
import { DebriefFact, SessionDebrief } from '../../services/ai-coach.service';
import { Card } from './Card';

/**
 * "What did the session I just finished actually say about me?"
 *
 * The card renders in two beats, because that is how the data arrives: the
 * measurements are computed the moment the workout is saved, the coach's read comes
 * back with the next session a few seconds later. Rendering the facts immediately
 * and slotting the note in when it lands is the difference between a card that feels
 * instant and a spinner the athlete stares at after a two-hour workout.
 *
 * Fact copy is authored server-side (see PRForecastCard for the same call): the
 * wording carries thresholds, and a translated duplicate here drifts. Chrome only is
 * translated.
 */

const TONE: Record<DebriefFact['tone'], { color: string; Icon: typeof CheckCircle }> = {
  good:    { color: palette.success[500], Icon: CheckCircle },
  neutral: { color: palette.gray[400],    Icon: Minus },
  watch:   { color: palette.warning[500], Icon: Eye },
};

export interface SessionDebriefCardProps {
  debrief: SessionDebrief;
  /**
   * True while the coach's note may still be on its way. Separate from
   * `coachNote === null` on purpose: once the wait is over, a missing note means the
   * generation failed, and the card should simply stop mentioning it rather than
   * spin forever.
   */
  notePending?: boolean;
  style?: React.ComponentProps<typeof Card>['style'];
}

const FactRow: React.FC<{ fact: DebriefFact }> = ({ fact }) => {
  const { color, Icon } = TONE[fact.tone] ?? TONE.neutral;
  return (
    <View style={s.factRow} accessibilityLabel={`${fact.label}: ${fact.text}`}>
      <View style={[s.factIcon, { backgroundColor: alpha(color, 0.15) }]}>
        <Icon size={14} weight="bold" color={color} />
      </View>
      <View style={s.factBody}>
        <Text style={[s.factLabel, { color }]}>{fact.label.toUpperCase()}</Text>
        <Text style={s.factText}>{fact.text}</Text>
      </View>
    </View>
  );
};

export const SessionDebriefCard: React.FC<SessionDebriefCardProps> = ({ debrief, notePending = false, style }) => {
  const { t } = useTranslation();
  if (!debrief.facts?.length) return null;

  return (
    <Card
      background={palette.gray[800]}
      borderColor={alpha(palette.brand[500], 0.35)}
      padding={18}
      style={style}
    >
      <View style={s.header}>
        <Sparkle size={18} weight="fill" color={palette.brand[400]} />
        <Text style={s.headerText}>{t('sessionDebrief.title')}</Text>
      </View>

      <View style={s.facts}>
        {debrief.facts.map((f) => <FactRow key={f.key} fact={f} />)}
      </View>

      {debrief.coachNote ? (
        <View style={s.note}>
          <Text style={s.noteLabel}>{t('sessionDebrief.coachsRead')}</Text>
          <Text style={s.noteText}>{debrief.coachNote}</Text>
        </View>
      ) : notePending ? (
        <View style={[s.note, s.notePending]}>
          <ActivityIndicator size="small" color={palette.brand[400]} />
          <Text style={s.notePendingText}>{t('sessionDebrief.writing')}</Text>
        </View>
      ) : null}
    </Card>
  );
};

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  headerText: { fontSize: 11, fontWeight: '700', color: palette.gray[400], letterSpacing: 1 },

  facts: { gap: 12 },
  factRow: { flexDirection: 'row', gap: 10 },
  factIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  factBody: { flex: 1 },
  factLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  factText: { fontSize: 13, lineHeight: 19, color: theme.colors.text },

  note: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.gray[700],
  },
  noteLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: palette.brand[400], marginBottom: 6 },
  noteText: { fontSize: 14, lineHeight: 21, color: theme.colors.text, fontStyle: 'italic' },
  notePending: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notePendingText: { fontSize: 13, color: palette.gray[500] },
});
