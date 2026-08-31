import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../../theme';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useProgramBuilderStore } from '../../../store/useProgramBuilderStore';
import { ExerciseSearchModal } from './ExerciseSearchModal';

import { ExerciseCatalogItem } from '@shared';
type RouteParams = {
    params: {
        blockIndex: number;
        weekIndex: number;
        dayIndex: number;
    }
}

export const ProgramCreatorDayScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { blockIndex, weekIndex, dayIndex } = route.params;

  const { draft, updateDay, addExerciseToDay, addSetToExercise } = useProgramBuilderStore();
  const day = draft.blocks[blockIndex].weeks[weekIndex].days[dayIndex];

  const [showSearch, setShowSearch] = useState(false);

  const handleToggleRestDay = (value: boolean) => {
      updateDay(blockIndex, weekIndex, dayIndex, { isRestDay: value });
  };

  const handleSelectExercise = (exercise: ExerciseCatalogItem) => {
      addExerciseToDay(blockIndex, weekIndex, dayIndex, {
          id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          orderIndex: day.exercises.length + 1,
          supersetGroupId: null,
          notes: null,
          sets: [
              { id: `s_${Date.now()}_1`, setNumber: 1, setType: 'NORMAL', targetReps: 10, targetRepsRange: null, targetRpe: 8, targetWeightPerc: null, restDurationSeconds: 60 }
          ]
      });
      setShowSearch(false);
  };

  const handleAddSet = (exerciseId: string) => {
      const exercise = day.exercises.find(e => e.id === exerciseId);
      if (!exercise) return;

      const lastSet = exercise.sets[exercise.sets.length - 1];
      addSetToExercise(blockIndex, weekIndex, dayIndex, exerciseId, {
          id: `s_${Date.now()}_${exercise.sets.length + 1}`,
          setNumber: exercise.sets.length + 1,
          setType: lastSet?.setType || 'NORMAL',
          targetReps: lastSet?.targetReps || 10,
          targetRepsRange: lastSet?.targetRepsRange || null,
          targetRpe: lastSet?.targetRpe || 8,
          targetWeightPerc: lastSet?.targetWeightPerc || null,
          restDurationSeconds: lastSet?.restDurationSeconds || 60
      });
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <View style={styles.backBtn} />
            <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>Day {day.dayNumber}</Text>
                <Text style={styles.headerSubtitle}>Week {weekIndex + 1} · Block {blockIndex + 1}</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            
            <View style={styles.restDayCard}>
                <View>
                    <Text style={styles.restDayLabel}>Mark as Rest Day</Text>
                    <Text style={styles.restDaySub}>Clear exercises and mark for recovery</Text>
                </View>
                <Switch 
                    value={day.isRestDay} 
                    onValueChange={handleToggleRestDay}
                    trackColor={{ false: palette.zinc[700], true: palette.brand[500] }}
                />
            </View>

            {!day.isRestDay && (
                <>
                    {day.exercises.map((ex, i) => (
                        <View key={ex.id} style={styles.exerciseCard}>
                            <View style={styles.exHeader}>
                                <View style={styles.exOrder}><Text style={styles.exOrderText}>{i + 1}</Text></View>
                                <Text style={styles.exName}>{ex.exerciseName}</Text>
                                <Text style={styles.exMenuIcon}>⋮</Text>
                            </View>
                            
                            <View style={styles.setsContainer}>
                                <View style={styles.setRowHeader}>
                                    <Text style={[styles.setCol, {flex: 0.5}]}>Set</Text>
                                    <Text style={styles.setCol}>Type</Text>
                                    <Text style={styles.setCol}>Reps</Text>
                                    <Text style={styles.setCol}>RPE</Text>
                                    <Text style={styles.setCol}>Rest</Text>
                                </View>
                                {ex.sets.map((set) => (
                                    <View key={set.id} style={styles.setRow}>
                                        <Text style={[styles.setVal, {flex: 0.5}]}>{set.setNumber}</Text>
                                        <Text style={styles.setValBadge}>{set.setType.replace('_', ' ')}</Text>
                                        <Text style={styles.setVal}>{set.targetReps}</Text>
                                        <Text style={styles.setVal}>@{set.targetRpe}</Text>
                                        <Text style={styles.setVal}>{set.restDurationSeconds}s</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity accessibilityRole="button" style={styles.addSetBtn} onPress={() => handleAddSet(ex.id)}>
                                <Text style={styles.addSetText}>+ Add Set</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity accessibilityRole="button" style={styles.addExerciseBtn} onPress={() => setShowSearch(true)}>
                        <Text style={styles.addExerciseText}>+ Add Exercise</Text>
                    </TouchableOpacity>
                </>
            )}

        </ScrollView>

        <ExerciseSearchModal 
            visible={showSearch} 
            onClose={() => setShowSearch(false)} 
            onSelect={handleSelectExercise} 
        />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitles: { alignItems: 'center' },
  headerTitle: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: palette.gray[400], fontSize: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  
  restDayCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      marginBottom: 24,
  },
  restDayLabel: { color: palette.white, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  restDaySub: { color: palette.gray[400], fontSize: 12 },

  exerciseCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      marginBottom: 16,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  exOrder: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.cardElevated, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exOrderText: { color: palette.white, fontSize: 12, fontWeight: 'bold' },
  exName: { flex: 1, color: palette.white, fontSize: 16, fontWeight: 'bold' },
  exMenuIcon: { color: palette.gray[500], fontSize: 20, fontWeight: 'bold' },

  setsContainer: { marginBottom: 16 },
  setRowHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.cardElevated, marginBottom: 8 },
  setCol: { flex: 1, color: palette.gray[500], fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  setVal: { flex: 1, color: palette.white, fontSize: 13, textAlign: 'center' },
  setValBadge: {
      flex: 1,
      backgroundColor: theme.colors.cardElevated,
      color: palette.zinc[400],
      fontSize: 8,
      fontWeight: 'bold',
      paddingVertical: 4,
      borderRadius: 4,
      textAlign: 'center',
      overflow: 'hidden'
  },

  addSetBtn: { alignSelf: 'center', marginTop: 8 },
  addSetText: { color: palette.brand[500], fontSize: 13, fontWeight: 'bold' },

  addExerciseBtn: {
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      borderRadius: 16,
      borderStyle: 'dashed',
      alignItems: 'center',
      marginBottom: 40,
  },
  addExerciseText: { color: palette.brand[500], fontSize: 14, fontWeight: 'bold' },
});
