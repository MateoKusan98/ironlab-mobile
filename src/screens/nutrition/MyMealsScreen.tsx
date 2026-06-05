import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { nutritionService } from '../../services/nutrition.service';
import { palette } from '../../theme';

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Breakfast', emoji: '🌅' },
  { value: 'LUNCH',     label: 'Lunch',     emoji: '☀️' },
  { value: 'DINNER',    label: 'Dinner',    emoji: '🌙' },
  { value: 'SNACK',     label: 'Snack',     emoji: '🍿' },
];

type Meal = {
  id: string;
  name: string;
  image: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
};

export const MyMealsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    <View style={s.card}>
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
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
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
  container:  { flex: 1, backgroundColor: '#000' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon:   { color: '#FFF', fontSize: 32 },
  title:      { fontSize: 20, fontWeight: '700', color: '#FFF' },

  card: {
    backgroundColor: '#111113',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImg: { width: 80, height: 80 },
  cardImgPlaceholder: { backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center' },
  cardImgEmoji: { fontSize: 32 },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  cardName: { color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kcal:  { color: palette.brand[400], fontSize: 12, fontWeight: '700' },
  macro: { color: '#888', fontSize: 11 },
  cardActions: { paddingRight: 12, alignItems: 'center', gap: 8 },
  logBtn:     { backgroundColor: palette.brand[500], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  logBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
  deleteBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#888', fontSize: 12, fontWeight: '700' },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  emptySub:   { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111113',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#27272A',
  },
  sheetTitle:  { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sheetSub:    { color: '#888', fontSize: 13, marginBottom: 20 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1c1c1e', gap: 14 },
  sheetOptionEmoji: { fontSize: 24 },
  sheetOptionLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  sheetCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  sheetCancelText: { color: '#888', fontSize: 15 },
});
