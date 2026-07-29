import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { nutritionService } from '../../services/nutrition.service';
import { theme, palette } from '../../theme';
import { Card } from '../../components/ui';
import { MyMeal } from '@shared';
const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Breakfast', emoji: '🌅' },
  { value: 'LUNCH',     label: 'Lunch',     emoji: '☀️' },
  { value: 'DINNER',    label: 'Dinner',    emoji: '🌙' },
  { value: 'SNACK',     label: 'Snack',     emoji: '🍿' },
];

// Shape comes from the shared DTO so the screen and the service cannot drift.
type Meal = MyMeal;

export const MyMealsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logModalMeal, setLogModalMeal] = useState<Meal | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await nutritionService.getMyMeals();
      setMeals(data);
    } catch {
      Alert.alert(t('common.error'), t('myMeals.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleQuickLog = async (meal: Meal, mealType: string) => {
    setLoggingId(meal.id);
    setLogModalMeal(null);
    try {
      await nutritionService.quickLogMeal(meal.id, mealType);
      Alert.alert(t('common.success'), t('myMeals.loggedSuccess', { name: meal.name }));
    } catch {
      Alert.alert(t('common.error'), t('myMeals.logError'));
    } finally {
      setLoggingId(null);
    }
  };

  const handleDelete = (meal: Meal) => {
    Alert.alert(t('myMeals.removeTitle'), t('myMeals.removeMsg', { name: meal.name }), [
      { text: t('myMeals.cancel'), style: 'cancel' },
      {
        text: t('myMeals.remove'), style: 'destructive',
        onPress: async () => {
          try {
            await nutritionService.deleteMyMeal(meal.id);
            setMeals((prev) => prev.filter((m) => m.id !== meal.id));
          } catch {
            Alert.alert(t('common.error'), t('myMeals.removeError'));
          }
        },
      },
    ]);
  };

  const renderMeal = ({ item }: { item: Meal }) => (
    <Card variant="row" padding={0} gap={0} background={theme.colors.backgroundSecondary} borderColor={theme.colors.cardElevated} style={s.cardClip}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={s.cardImg} />
      ) : (
        <View style={[s.cardImg, s.cardImgPlaceholder]}>
          <Text style={s.cardImgEmoji}>🍽️</Text>
        </View>
      )}
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={s.macroRow}>
          <Text style={s.kcal}>{item.calories} kcal</Text>
          <Text style={s.macro}>P {item.protein}g</Text>
          <Text style={s.macro}>C {item.carbs}g</Text>
          <Text style={s.macro}>F {item.fat}g</Text>
        </View>
      </View>
      <View style={s.cardActions}>
        {loggingId === item.id ? (
          <ActivityIndicator color={palette.brand[400]} />
        ) : (
          <TouchableOpacity style={s.logBtn} onPress={() => setLogModalMeal(item)}>
            <Text style={s.logBtnText}>+ Log</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
          <Text style={s.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.backBtn} />
        <Text style={s.title}>{t('myMeals.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 60 }} />
      ) : meals.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🍽️</Text>
          <Text style={s.emptyTitle}>{t('myMeals.noMeals')}</Text>
          <Text style={s.emptySub}>{t('myMeals.noMealsSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(m) => m.id}
          renderItem={renderMeal}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={palette.brand[400]} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Meal type picker modal */}
      <Modal
        visible={!!logModalMeal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogModalMeal(null)}
      >
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setLogModalMeal(null)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('myMeals.logAs')}</Text>
            <Text style={s.sheetSub} numberOfLines={1}>{logModalMeal?.name}</Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt.value}
                style={s.sheetOption}
                onPress={() => logModalMeal && handleQuickLog(logModalMeal, mt.value)}
              >
                <Text style={s.sheetOptionEmoji}>{mt.emoji}</Text>
                <Text style={s.sheetOptionLabel}>{mt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.sheetCancel} onPress={() => setLogModalMeal(null)}>
              <Text style={s.sheetCancelText}>{t('myMeals.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: palette.black },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon:   { color: palette.white, fontSize: 32 },
  title:      { fontSize: 20, fontWeight: '700', color: palette.white },

  cardClip: { overflow: 'hidden' },
  cardImg: { width: 80, height: 80 },
  cardImgPlaceholder: { backgroundColor: theme.colors.backgroundTertiary, alignItems: 'center', justifyContent: 'center' },
  cardImgEmoji: { fontSize: 32 },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  cardName: { color: palette.white, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kcal:  { color: palette.brand[400], fontSize: 12, fontWeight: '700' },
  macro: { color: palette.mono[88], fontSize: 11 },
  cardActions: { paddingRight: 12, alignItems: 'center', gap: 8 },
  logBtn:     { backgroundColor: palette.brand[500], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  logBtnText: { color: palette.black, fontWeight: '700', fontSize: 12 },
  deleteBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: palette.mono[88], fontSize: 12, fontWeight: '700' },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: palette.white, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  emptySub:   { color: palette.mono[66], fontSize: 14, textAlign: 'center', lineHeight: 20 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: theme.colors.cardElevated,
  },
  sheetTitle:  { color: palette.white, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sheetSub:    { color: palette.mono[88], fontSize: 13, marginBottom: 20 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.backgroundTertiary, gap: 14 },
  sheetOptionEmoji: { fontSize: 24 },
  sheetOptionLabel: { color: palette.white, fontSize: 16, fontWeight: '600' },
  sheetCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  sheetCancelText: { color: palette.mono[88], fontSize: 15 },
});
