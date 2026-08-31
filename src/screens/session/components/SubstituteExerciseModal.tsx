import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette, alpha } from '../../../theme';

export interface SubstituteExerciseModalProps {
  /** The exercise being replaced, or null when the sheet is closed. */
  exerciseName: string | null;
  /** Sets already logged under the original name — they stay in history. */
  loggedSetCount: number;
  /** True when this is a competition lift, which warrants a warning. */
  isKeyLift: boolean;
  /** Movements suggested for this exercise, best first. */
  suggestions: readonly string[];
  /** Full catalogue, searched once the suggestions are filtered out. */
  catalogue: readonly string[];
  onClose: () => void;
  onSubstitute: (name: string) => void;
  /** Localised exercise-name resolver (`useExerciseName`). */
  exName: (name: string) => string;
}

/**
 * Ranks substitute options for a search term: suggested movements first, then
 * anything else in the catalogue that matches. An empty search shows only the
 * suggestions, which is the common case (the athlete wants the coach's pick).
 */
export function rankSubstitutes(
  search: string,
  suggestions: readonly string[],
  catalogue: readonly string[],
  currentName: string,
): string[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...suggestions];
  return [
    ...suggestions.filter((s) => s.toLowerCase().includes(q)),
    ...catalogue.filter(
      (e) => e.toLowerCase().includes(q) && !suggestions.includes(e) && e !== currentName,
    ),
  ];
}

/**
 * Swapping a movement mid-workout — a rack is taken, a shoulder twinges.
 *
 * Two things the athlete needs to know before they commit, both of which used
 * to be buried in the screen: substituting a competition lift costs specificity,
 * and sets already logged keep the ORIGINAL exercise name in history (so the
 * coach's progression maths for that lift stays intact).
 */
export const SubstituteExerciseModal: React.FC<SubstituteExerciseModalProps> = ({
  exerciseName,
  loggedSetCount,
  isKeyLift,
  suggestions,
  catalogue,
  onClose,
  onSubstitute,
  exName,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const ranked = useMemo(
    () => rankSubstitutes(search, suggestions, catalogue, exerciseName ?? ''),
    [search, suggestions, catalogue, exerciseName],
  );

  const custom =
    search.trim().length > 2 &&
    !catalogue.some((e) => e.toLowerCase() === search.trim().toLowerCase());

  const close = () => {
    setSearch('');
    onClose();
  };

  const pick = (name: string) => {
    setSearch('');
    onSubstitute(name);
  };

  return (
    <Modal
      visible={exerciseName !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      {exerciseName !== null && (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Substitute Exercise</Text>
            <TouchableOpacity
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
            >
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>REPLACING</Text>
            <Text style={styles.currentName}>{exName(exerciseName)}</Text>
          </View>

          {isKeyLift && (
            <View style={styles.warning}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningBody}>
                <Text style={styles.warningTitle}>Key lift for today&apos;s program</Text>
                <Text style={styles.warningText}>
                  This is a primary exercise in your plan. Substituting reduces specificity — only swap if you have a real reason (injury, equipment, fatigue).
                </Text>
              </View>
            </View>
          )}

          {loggedSetCount > 0 && (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                {loggedSetCount} already-logged set{loggedSetCount > 1 ? 's' : ''} will remain under &quot;{exerciseName}&quot; in your history. New sets will use the substituted name.
              </Text>
            </View>
          )}

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search substitutes..."
            placeholderTextColor={palette.gray[500]}
            autoFocus={!isKeyLift}
          />

          <Text style={styles.suggestionsLabel}>SUGGESTIONS</Text>

          <ScrollView>
            {custom && (
              <TouchableOpacity accessibilityRole="button" style={styles.customRow} onPress={() => pick(search.trim())}>
                <Text style={styles.customText}>+ Use &quot;{search.trim()}&quot;</Text>
              </TouchableOpacity>
            )}
            {ranked.map((name) => (
              <TouchableOpacity accessibilityRole="button" key={name} style={styles.row} onPress={() => pick(name)}>
                <Text style={styles.rowText}>{name}</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.gray[900] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  close: { fontSize: 18, color: palette.gray[400] },
  currentCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: palette.gray[800],
    borderRadius: 12,
    padding: 14,
  },
  currentLabel: { fontSize: 10, fontWeight: '700', color: palette.gray[500], letterSpacing: 1, marginBottom: 4 },
  currentName: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  warning: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: alpha(palette.warning[900], 0.2),
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: alpha(palette.warning[500], 0.267),
  },
  warningIcon: { fontSize: 20 },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 13, fontWeight: '700', color: palette.warning[500], marginBottom: 4 },
  warningText: { fontSize: 12, color: palette.gray[300], lineHeight: 17 },
  note: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: palette.gray[700],
    borderRadius: 10,
    padding: 12,
  },
  noteText: { fontSize: 11, color: palette.gray[400], lineHeight: 16 },
  suggestionsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.gray[500],
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  searchInput: {
    margin: 16,
    backgroundColor: palette.gray[800],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  customRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.brand[600] + '22',
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
  },
  customText: { fontSize: 15, color: palette.brand[400], fontWeight: '600' },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { fontSize: 15, color: theme.colors.text },
  arrow: { fontSize: 14, color: palette.gray[500] },
});
