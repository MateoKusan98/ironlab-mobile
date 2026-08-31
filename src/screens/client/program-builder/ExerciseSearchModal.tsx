import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { theme, palette } from '../../../theme';
import { useExercises } from '../../../hooks/useWorkout';

import { ExerciseCatalogItem } from '@shared';
interface ExerciseSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseCatalogItem) => void;
}

const MUSCLE_GROUPS = [
    'abdominals', 'hamstrings', 'calves', 'shoulders', 'adductors', 'glutes', 'quadriceps', 'biceps', 'forearms', 'triceps', 'chest', 'lower back', 'middle back', 'traps', 'lats', 'neck'
];

export const ExerciseSearchModal: React.FC<ExerciseSearchModalProps> = ({ visible, onClose, onSelect }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Simple debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: exercises, isLoading } = useExercises({
    q: debouncedSearch,
    muscle: selectedMuscle || undefined,
  });

  const renderExercise = ({ item }: { item: ExerciseCatalogItem }) => (
    <TouchableOpacity accessibilityRole="button" style={styles.exerciseItem} onPress={() => onSelect(item)}>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseMeta}>
            {item.targetMuscleGroup} • {item.equipmentNeeded || 'Bodyweight'}
        </Text>
      </View>
      <Text style={styles.addIcon}>+</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('programBuilder.addExercise')}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>{t('programBuilder.close')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('programBuilder.searchPlaceholder')}
              placeholderTextColor={palette.gray[500]}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.filterSection}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[null, ...MUSCLE_GROUPS]}
              keyExtractor={(item) => item || 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.muscleChip, selectedMuscle === item && styles.muscleChipActive]}
                  onPress={() => setSelectedMuscle(item)}
                >
                  <Text style={[styles.muscleChipText, selectedMuscle === item && styles.muscleChipTextActive]}>
                    {item ? item.charAt(0).toUpperCase() + item.slice(1) : t('programBuilder.allMuscles')}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.filterList}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={palette.brand[500]} style={{ flex: 1 }} />
          ) : (
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.id}
              renderItem={renderExercise}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>{t('programBuilder.noExercisesFound')}</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { 
      backgroundColor: theme.colors.card, 
      height: '85%', 
      borderTopLeftRadius: 24, 
      borderTopRightRadius: 24,
      paddingTop: 20,
  },
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  title: { color: palette.white, fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 8 },
  closeText: { color: palette.brand[500], fontWeight: '600' },
  
  searchBox: { paddingHorizontal: 20, marginBottom: 16 },
  searchInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      borderRadius: 12,
      color: palette.white,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
  },
  
  filterSection: { marginBottom: 16 },
  filterList: { paddingHorizontal: 20, gap: 10 },
  muscleChip: { 
      paddingHorizontal: 16, 
      paddingVertical: 8, 
      borderRadius: 20, 
      backgroundColor: theme.colors.cardElevated,
      borderWidth: 1,
      borderColor: palette.zinc[700],
  },
  muscleChipActive: { backgroundColor: palette.brand[500] + '33', borderColor: palette.brand[500] },
  muscleChipText: { color: palette.gray[400], fontSize: 13 },
  muscleChipTextActive: { color: palette.brand[500], fontWeight: 'bold' },
  
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  exerciseItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: palette.white, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  exerciseMeta: { color: palette.gray[500], fontSize: 12, textTransform: 'capitalize' },
  addIcon: { color: palette.brand[500], fontSize: 24, fontWeight: '300' },
  
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: palette.gray[500], textAlign: 'center' },
});
