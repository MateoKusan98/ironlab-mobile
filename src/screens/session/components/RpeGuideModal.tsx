import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../../../theme';
import { InfoSheet } from '../../../components/ui/InfoSheet';

/**
 * The RPE scale, shown the first time an athlete logs a set.
 *
 * The wording matters: the coach's fatigue detection regresses estimated 1RM
 * against logged RPE, so an athlete entering arbitrary numbers silently
 * degrades every load it prescribes afterwards. Hence the closing note.
 */
const SCALE = [
  { rpe: '10', label: 'Max effort', detail: 'Could not do one more rep. True maximum.' },
  { rpe: '9',  label: 'Near max',   detail: 'Could squeeze out 1 more rep at most.' },
  { rpe: '8',  label: 'Hard',       detail: '2 reps left in the tank. Main working sets.' },
  { rpe: '7',  label: 'Moderate',   detail: '3 reps in reserve. Challenging but controlled.' },
  { rpe: '6',  label: 'Easy',       detail: '4+ reps left. Warm-up and technique work.' },
];

export interface RpeGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RpeGuideModal: React.FC<RpeGuideModalProps> = ({ visible, onClose }) => (
  <InfoSheet
    visible={visible}
    onClose={onClose}
    title="What is RPE?"
    subtitle="Rate of Perceived Exertion — how hard was that set?"
  >
    {SCALE.map(({ rpe, label, detail }) => (
      <View key={rpe} style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{rpe}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowDetail}>{detail}</Text>
        </View>
      </View>
    ))}

    <View style={styles.note}>
      <Text style={styles.noteText}>
        Accurate RPE logging is how the AI detects fatigue and adjusts your loads automatically. Random numbers break the system.
      </Text>
    </View>
  </InfoSheet>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.gray[800],
    gap: 14,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 16, fontWeight: '800', color: palette.white },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: palette.white, marginBottom: 2 },
  rowDetail: { fontSize: 12, color: palette.gray[400] },
  note: {
    backgroundColor: palette.gray[800],
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  noteText: { fontSize: 12, color: palette.brand[300], lineHeight: 18 },
});
