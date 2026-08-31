import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { useClientFoodLogs } from '../../hooks/useNutrition';
import { useClientWorkoutLogs } from '../../hooks/useWorkout';
import { useClientNotes } from '../../hooks/useNotes';
import { theme } from '../../theme';

import { Card } from '../../components/ui';
type Route = RouteProp<CoachStackParamList, 'ClientDetail'>;
type Nav = NativeStackNavigationProp<CoachStackParamList, 'ClientDetail'>;

type TabName = 'workouts' | 'nutrition' | 'notes';

export const ClientDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<TabName>('workouts');

  const { data: workoutLogs, isLoading: logsLoading } = useClientWorkoutLogs(params.clientId);
  const { data: foodLogs, isLoading: foodLoading } = useClientFoodLogs(params.clientId);
  const { data: notes, isLoading: notesLoading } = useClientNotes(params.clientId);

  const tabs: { key: TabName; label: string }[] = [
    { key: 'workouts', label: t('coach.tabWorkouts') },
    { key: 'nutrition', label: t('coach.tabNutrition') },
    { key: 'notes', label: t('coach.tabNotes') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{params.clientName}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreateWorkout', params)}
          >
            <Text style={styles.actionText}>{t('coach.addWorkout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Notes', params)}
          >
            <Text style={styles.actionText}>{t('coach.addNote')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === 'workouts' && (
          logsLoading ? <ActivityIndicator color={theme.colors.primary} /> :
          workoutLogs && workoutLogs.length > 0 ? (
            workoutLogs.map((log) => (
              <Card key={log.id} radius={theme.borderRadius.md} padding={theme.spacing.md} style={styles.cardSpacing}>
                <Text style={styles.cardTitle}>
                  {log.mood ? `${log.mood} ` : ''}Workout Log
                </Text>
                <Text style={styles.cardDetail}>
                  Weight: {log.actualWeight ?? 'N/A'}kg • Reps: {log.repsCompleted ?? 'N/A'}
                </Text>
                {!!log.techniqueRating && (
                  <Text style={styles.cardDetail}>Technique: {'⭐'.repeat(log.techniqueRating)}</Text>
                )}
                {log.notes && <Text style={styles.cardNotes}>{log.notes}</Text>}
                <Text style={styles.cardDate}>{new Date(log.submittedAt).toLocaleDateString()}</Text>
              </Card>
            ))
          ) : <Text style={styles.empty}>{t('coach.noWorkoutLogs')}</Text>
        )}

        {activeTab === 'nutrition' && (
          foodLoading ? <ActivityIndicator color={theme.colors.primary} /> :
          foodLogs && foodLogs.length > 0 ? (
            foodLogs.map((log) => (
              <Card key={log.id} radius={theme.borderRadius.md} padding={theme.spacing.md} style={styles.cardSpacing}>
                <Text style={styles.cardTitle}>{log.mealType}</Text>
                <Text style={styles.cardDetail}>
                  {log.calories ? `${log.calories} cal` : 'No calories logged'}
                </Text>
                {log.notes && <Text style={styles.cardNotes}>{log.notes}</Text>}
                <Text style={styles.cardDate}>{log.date}</Text>
              </Card>
            ))
          ) : <Text style={styles.empty}>{t('coach.noNutritionLogs')}</Text>
        )}

        {activeTab === 'notes' && (
          notesLoading ? <ActivityIndicator color={theme.colors.primary} /> :
          notes && notes.length > 0 ? (
            notes.map((note) => (
              <Card key={note.id} radius={theme.borderRadius.md} padding={theme.spacing.md} style={styles.cardSpacing}>
                <Text style={styles.cardNotes}>{note.content}</Text>
                <Text style={styles.cardDate}>{new Date(note.createdAt).toLocaleDateString()}</Text>
              </Card>
            ))
          ) : <Text style={styles.empty}>{t('coach.noNotes')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
  back: { fontSize: theme.fontSize.md, color: theme.colors.primary, marginBottom: theme.spacing.sm },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  actionText: { color: theme.colors.text, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.textSecondary, fontWeight: theme.fontWeight.medium },
  tabTextActive: { color: theme.colors.text },
  scrollView: { flex: 1, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  cardSpacing: { marginBottom: theme.spacing.sm },
  cardTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.text },
  cardDetail: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 },
  cardNotes: { fontSize: theme.fontSize.sm, color: theme.colors.text, marginTop: theme.spacing.sm },
  cardDate: { fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: theme.spacing.sm },
  empty: { color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: theme.spacing.xl },
});
