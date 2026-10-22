import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { useCreateWorkoutPlan } from '../../hooks/useWorkout';
import { CreateWorkoutExerciseDto } from '@shared';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';

type Route = RouteProp<CoachStackParamList, 'CreateWorkout'>;

interface ExerciseForm {
  exerciseName: string;
  sets: string;
  reps: string;
  targetWeight: string;
}

export const CreateWorkoutScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation();
  const createPlan = useCreateWorkoutPlan();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [exercises, setExercises] = useState<ExerciseForm[]>([
    { exerciseName: '', sets: '3', reps: '10', targetWeight: '' },
  ]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      { exerciseName: '', sets: '3', reps: '10', targetWeight: '' },
    ]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof ExerciseForm, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createWorkout.titleRequired'));
      return;
    }

    const validExercises: CreateWorkoutExerciseDto[] = exercises
      .filter((e) => e.exerciseName.trim())
      .map((e, i) => ({
        exerciseName: e.exerciseName.trim(),
        sets: parseInt(e.sets, 10) || 3,
        reps: parseInt(e.reps, 10) || 10,
        targetWeight: e.targetWeight ? parseFloat(e.targetWeight) : undefined,
        order: i,
      }));

    if (validExercises.length === 0) {
      Alert.alert(t('common.error'), t('createWorkout.exerciseRequired'));
      return;
    }

    createPlan.mutate(
      {
        clientId: params.clientId,
        title: title.trim(),
        scheduledDate,
        exercises: validExercises,
      },
      {
        onSuccess: () => {
          Alert.alert(t('common.success'), t('createWorkout.planCreated'));
          navigation.goBack();
        },
        onError: () => Alert.alert(t('common.error'), t('createWorkout.planFailed')),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScreen style={styles.scroll}>

        <Text style={styles.title}>{t('createWorkout.title')}</Text>
        <Text style={styles.subtitle}>{t('createWorkout.forClient', { name: params.clientName })}</Text>

        <Text style={styles.label}>{t('createWorkout.titleLabel')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('createWorkout.titlePlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
        />

        <Text style={styles.label}>{t('createWorkout.scheduledDate')}</Text>
        <TextInput
          style={styles.input}
          value={scheduledDate}
          onChangeText={setScheduledDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textTertiary}
        />

        <View style={styles.exercisesHeader}>
          <Text style={styles.label}>{t('createWorkout.exercises')}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={addExercise}>
            <Text style={styles.addText}>{t('createWorkout.add')}</Text>
          </TouchableOpacity>
        </View>

        {exercises.map((ex, i) => (
          <View key={i} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseNum}>#{i + 1}</Text>
              {exercises.length > 1 && (
                <TouchableOpacity accessibilityRole="button" onPress={() => removeExercise(i)}>
                  <Text style={styles.removeText}>{t('createWorkout.remove')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={ex.exerciseName}
              onChangeText={(v) => updateExercise(i, 'exerciseName', v)}
              placeholder={t('createWorkout.exerciseName')}
              placeholderTextColor={theme.colors.textTertiary}
            />
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.smallLabel}>{t('createWorkout.sets')}</Text>
                <TextInput
                  style={styles.input}
                  value={ex.sets}
                  onChangeText={(v) => updateExercise(i, 'sets', v)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.smallLabel}>{t('createWorkout.reps')}</Text>
                <TextInput
                  style={styles.input}
                  value={ex.reps}
                  onChangeText={(v) => updateExercise(i, 'reps', v)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.smallLabel}>{t('createWorkout.weightKg')}</Text>
                <TextInput
                  style={styles.input}
                  value={ex.targetWeight}
                  onChangeText={(v) => updateExercise(i, 'targetWeight', v)}
                  keyboardType="decimal-pad"
                  placeholder={t('createWorkout.optionalShort')}
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.submitBtn, createPlan.isPending && styles.disabled]}
          onPress={handleSubmit}
          disabled={createPlan.isPending}
        >
          {createPlan.isPending ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.submitText}>{t('createWorkout.createPlan')}</Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  smallLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  addText: { color: theme.colors.primary, fontWeight: theme.fontWeight.semibold },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  exerciseNum: { color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
  removeText: { color: theme.colors.error, fontSize: theme.fontSize.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  col: { flex: 1 },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  disabled: { opacity: 0.6 },
  submitText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, color: theme.colors.text },
});
