import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette, alpha } from '../../theme';
import { aiCoachService, TechniqueLift } from '../../services/ai-coach.service';
import { useExerciseName } from '../../hooks/useExerciseName';

/**
 * WHAT THE VIDEO SAID — the athlete's standing technique state, per movement.
 *
 * Form check used to be a one-shot novelty: film a squat, read a score, never see it
 * again. This card makes the verdict a fact about the athlete that persists between
 * films — and it is also the ask. The three movements listed are the ones HIS OWN
 * logs say he trains most, so an unfilmed row is a concrete, finite request
 * ("film your deadlift once") rather than a nag to use a feature.
 *
 * A movement scoring badly carries a load reduction, and this card is where that is
 * explained. A discount the athlete cannot see the reason for is indistinguishable
 * from the app being broken — and he would be right to distrust it.
 */

type Nav = NativeStackNavigationProp<Record<string, object | undefined>>;

const scoreColor = (score: number): string =>
  score <= 5 ? palette.error[500] : score <= 6 ? palette.warning[500] : palette.success[500];

const daysSince = (atMs: number): string => {
  const days = Math.floor((Date.now() - atMs) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const Row: React.FC<{
  lift: TechniqueLift;
  exName: (n: string) => string;
  onFilm: () => void;
  onToggleFlag: (lift: TechniqueLift) => void;
  busy: boolean;
}> = ({ lift, exName, onFilm, onToggleFlag, busy }) => {
  const filmed = lift.score != null;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.movement} numberOfLines={1}>{exName(lift.label)}</Text>

        {filmed ? (
          <>
            <Text style={[styles.score, { color: scoreColor(lift.score!) }]}>{lift.score}</Text>
            <Text style={styles.outOf}>/10</Text>
          </>
        ) : (
          <TouchableOpacity onPress={onFilm} accessibilityRole="button" accessibilityLabel={`Film your ${lift.label}`}>
            <Text style={styles.filmCta}>Film it →</Text>
          </TouchableOpacity>
        )}
      </View>

      {filmed && (
        <Text style={styles.meta}>
          {daysSince(lift.scoredAtMs!)}
          {/* Only ever named on a lift the discount can actually reach. Claiming a
              reduction on a movement whose weight the coach chooses freely would be
              the card asserting something the engine never did. */}
          {lift.flagged && lift.compLift ? ' · weight reduced 10% while this stands' : ''}
          {lift.flagged && !lift.compLift ? ' · work light and film it again' : ''}
          {lift.dismissed ? ' · reduction waived by you' : ''}
        </Text>
      )}

      {(lift.flagged || lift.dismissed) && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onFilm} accessibilityRole="button">
            <Text style={styles.actionPrimary}>Re-film it</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onToggleFlag(lift)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={lift.dismissed ? 'Restore the reduction' : 'Remove the reduction'}
          >
            {busy
              ? <ActivityIndicator size="small" color={palette.zinc[500]} />
              : <Text style={styles.actionMuted}>{lift.dismissed ? 'Restore reduction' : 'Remove reduction'}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const TechniqueCard: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { exName } = useExerciseName();
  const [lifts, setLifts] = useState<TechniqueLift[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    aiCoachService.technique()
      .then((d) => { if (!cancelled) setLifts(d.lifts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const goFilm = useCallback(() => navigation.navigate('FormCheck'), [navigation]);

  const toggleFlag = useCallback(async (lift: TechniqueLift) => {
    setBusyKey(lift.key);
    try {
      const { lifts: next } = await aiCoachService.setTechniqueFlag(lift.key, !lift.dismissed);
      setLifts(next);
    } catch {
      Alert.alert('Error', 'Could not update that. Try again in a moment.');
    } finally {
      setBusyKey(null);
    }
  }, []);

  // An athlete with no logged training has no movements to name, and a card that
  // asked him to film "your key lifts" without knowing what they are would be
  // guessing at him. Say nothing until his own history can answer.
  if (!lifts?.length) return null;

  const flagged = lifts.filter((l) => l.flagged);
  const unfilmed = lifts.filter((l) => l.score == null);

  const subtitle = flagged.length
    ? `${flagged.length} movement${flagged.length > 1 ? 's' : ''} training lighter until it improves`
    : unfilmed.length
      ? `${unfilmed.length} of your main lifts ${unfilmed.length > 1 ? 'have' : 'has'} never been filmed`
      : 'the coach has seen all of your main lifts';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Your technique</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.subtitleDim}>
          scored from the form-check videos you upload, on the movements you train most
        </Text>
      </View>

      {lifts.map((l) => (
        <Row
          key={l.key}
          lift={l}
          exName={exName}
          onFilm={goFilm}
          onToggleFlag={toggleFlag}
          busy={busyKey === l.key}
        />
      ))}

      {!!unfilmed.length && (
        <TouchableOpacity onPress={goFilm} style={styles.cta} accessibilityRole="button">
          <Text style={styles.ctaText}>Film a set →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.zinc[900],
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: alpha(palette.zinc[700], 0.5),
  },
  header: { marginBottom: 16 },
  title: { color: palette.zinc[200], fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { color: palette.zinc[400], fontSize: 12, marginTop: 3, fontWeight: '600' },
  subtitleDim: { color: palette.zinc[600], fontSize: 11, marginTop: 4, lineHeight: 15 },

  row: { marginBottom: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline' },
  movement: { color: palette.zinc[300], fontSize: 13, fontWeight: '600', flex: 1 },
  score: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  outOf: { color: palette.zinc[600], fontSize: 10, marginLeft: 2 },
  filmCta: { color: palette.brand[400], fontSize: 12, fontWeight: '700' },
  meta: { color: palette.zinc[600], fontSize: 10, marginTop: 4, lineHeight: 14 },

  actions: { flexDirection: 'row', gap: 18, marginTop: 8, alignItems: 'center' },
  actionPrimary: { color: palette.brand[400], fontSize: 12, fontWeight: '700' },
  actionMuted: { color: palette.zinc[500], fontSize: 12, fontWeight: '600' },

  cta: { alignSelf: 'flex-start', marginTop: 2 },
  ctaText: { color: palette.brand[400], fontSize: 13, fontWeight: '600' },
});
