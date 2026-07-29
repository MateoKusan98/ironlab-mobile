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
import { theme, palette } from '../../../theme';

export interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the chosen (or freely typed) exercise name. */
  onAdd: (name: string) => void;
  /** The catalogue to search. */
  catalogue: readonly string[];
}

/** A typed name counts as custom once it's long enough and matches nothing. */
export function isCustomExercise(search: string, catalogue: readonly string[]): boolean {
  const q = search.trim();
  return q.length > 2 && !catalogue.some((e) => e.toLowerCase() === q.toLowerCase());
}

/**
 * Adds an exercise mid-workout — either from the catalogue or as free text, so
 * an athlete who improvises on a busy gym floor can still log what they did.
 *
 * Owns its own search state: it resets on close, which the screen previously
 * had to remember to do at three separate call sites.
 */
export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onAdd,
  catalogue,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => catalogue.filter((e) => e.toLowerCase().includes(search.toLowerCase())),
    [catalogue, search],
  );
  const custom = isCustomExercise(search, catalogue);

  const close = () => {
    setSearch('');
    onClose();
  };

  const add = (name: string) => {
    setSearch('');
    onAdd(name);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('activeWorkout.addExercise')}</Text>
          <TouchableOpacity
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
          >
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('activeWorkout.searchExercise')}
          placeholderTextColor={palette.gray[500]}
          autoFocus
        />

        <ScrollView>
          {custom && (
            <TouchableOpacity style={styles.customRow} onPress={() => add(search.trim())}>
              <Text style={styles.customText}>+ Add &quot;{search.trim()}&quot;</Text>
            </TouchableOpacity>
          )}
          {filtered.map((name) => (
            <TouchableOpacity key={name} style={styles.row} onPress={() => add(name)}>
              <Text style={styles.rowText}>{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
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
});
