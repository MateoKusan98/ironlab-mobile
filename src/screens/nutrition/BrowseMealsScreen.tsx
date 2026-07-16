import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { palette } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useBrowseMeals } from '../../hooks/useNutrition';
import { MealType, FoodLogResponse } from '@shared';

const CATEGORIES = [
  { label: 'Vegetarian', value: 'Vegetarian', icon: '🍃', color: '#1A3322', iconColor: '#A3E635' },
  { label: 'Keto', value: 'Keto', icon: '🌾', color: '#3A2016', iconColor: '#F59E0B' },
  { label: 'Paleo', value: 'Paleo', icon: '🍎', color: '#3D1525', iconColor: '#F43F5E' },
  { label: 'High Protein', value: 'Heavy Protein', icon: '🦴', color: '#31230D', iconColor: '#EAB308' },
  { label: 'High Carb', value: 'Heavy Carbs', icon: '🍚', color: '#1E293B', iconColor: '#3B82F6' },
  { label: 'High Fat', value: 'Heavy Fat', icon: '🧀', color: '#422006', iconColor: '#D97706' },
];

const CALORIE_RANGES = [
  { label: 'Any', min: undefined, max: undefined },
  { label: '< 400', min: 0, max: 399 },
  { label: '400-800', min: 400, max: 800 },
  { label: '800+', min: 801, max: 10000 },
];

export const BrowseMealsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [activeCalorieRange, setActiveCalorieRange] = useState(CALORIE_RANGES[0]);
  const [page, setPage] = useState(1);
  const [allMeals, setAllMeals] = useState<FoodLogResponse[]>([]);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, isLoading, isFetching } = useBrowseMeals(
    activeCategory, 
    page, 
    10, 
    debouncedSearchQuery,
    activeCalorieRange.min,
    activeCalorieRange.max
  );

  // Reset when category, range or search changes
  React.useEffect(() => {
    setPage(1);
    setAllMeals([]);
  }, [activeCategory, debouncedSearchQuery, activeCalorieRange]);

  React.useEffect(() => {
    if (data?.meals) {
      if (page === 1) {
        setAllMeals(data.meals);
      } else {
        setAllMeals(prev => [...prev, ...data.meals]);
      }
    }
  }, [data, page]);

  const handleCategoryPress = (value: string) => {
    setActiveCategory(prev => prev === value ? undefined : value);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const filteredMeals = allMeals;
  const featuredMeal = filteredMeals.length > 0 ? filteredMeals[0] : null;
  
  const breakfastMeals = filteredMeals.filter(m => 
    m.mealType === MealType.BREAKFAST || 
    (Array.isArray(m.tags) && m.tags.some(t => t.toLowerCase() === 'breakfast'))
  );
  const lunchMeals = filteredMeals.filter(m => 
    m.mealType === MealType.LUNCH || 
    (Array.isArray(m.tags) && m.tags.some(t => t.toLowerCase() === 'lunch'))
  );
  const dinnerMeals = filteredMeals.filter(m => 
    m.mealType === MealType.DINNER || 
    (Array.isArray(m.tags) && m.tags.some(t => t.toLowerCase() === 'dinner'))
  );

  const isFiltering = activeCategory !== undefined || activeCalorieRange.label !== 'Any' || debouncedSearchQuery !== '';

  const renderHorizontalCard = (meal: FoodLogResponse) => (
    <TouchableOpacity key={meal.id} style={styles.horizontalCard} onPress={() => navigation.navigate('FoodDetails', { food: meal })}>
      <View style={styles.hCardContent}>
        <View style={styles.hCardTag}>
          <Text style={styles.hCardTagText}>{meal.tags?.[0] || 'Meal'}</Text>
        </View>
        <Text style={styles.hCardTitle} numberOfLines={2}>
          {meal.mealName || 'Untitled Meal'}
        </Text>
        <View style={styles.hCardMetrics}>
          <Text style={styles.hCardMetric}>🕒 {meal.prepTime || 30} min</Text>
          <Text style={styles.hCardMetric}>🔥 {meal.calories || 0} kcal</Text>
        </View>
      </View>
      <View style={styles.hCardImageContainer}>
        {meal.imageUrl ? (
            <Image source={{ uri: meal.imageUrl }} style={styles.hCardImage} />
        ) : (
            <View style={[styles.hCardImage, { backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' }]}>
                <Text>🍽️</Text>
            </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.backBtn} />
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>{t('browseMeals.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('browseMeals.subtitle')}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <RNTextInput
            style={styles.searchInput}
            placeholder={t('browseMeals.searchPlaceholder')}
            placeholderTextColor={palette.gray[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.filterIcon}>☰</Text>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('browseMeals.macroPreferences')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
                key={cat.value} 
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(cat.value)}
            >
              <View style={[styles.categoryCircle, { backgroundColor: cat.color, borderWidth: activeCategory === cat.value ? 2 : 0, borderColor: palette.brand[500] }]}>
                <Text style={{ fontSize: 24, color: cat.iconColor }}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Calorie Range */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('browseMeals.calorieRange')}</Text>
          {(isFetching && !isLoading) && <ActivityIndicator size="small" color={palette.brand[500]} />}
        </View>
        <View style={styles.rangeContainer}>
            {CALORIE_RANGES.map((range, i) => (
                <TouchableOpacity 
                    key={i} 
                    style={[styles.rangeBtn, activeCalorieRange.label === range.label && styles.rangeBtnActive]}
                    onPress={() => setActiveCalorieRange(range)}
                >
                    <Text style={[styles.rangeBtnText, activeCalorieRange.label === range.label && styles.rangeBtnTextActive]}>
                        {range.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* Featured Meal */}
        {featuredMeal && !isFiltering && (
            <>
                <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('browseMeals.featured')}</Text>
                </View>
                <TouchableOpacity style={styles.featuredCard} onPress={() => navigation.navigate('FoodDetails', { food: featuredMeal })}>
                    {featuredMeal.imageUrl ? (
                        <Image source={{ uri: featuredMeal.imageUrl }} style={styles.featuredImage} />
                    ) : (
                        <View style={[styles.featuredImage, { backgroundColor: '#27272A' }]} />
                    )}
                    <View style={styles.featuredOverlay}>
                        <View style={styles.featuredTopRow}>
                            <View style={styles.newBadge}><Text style={styles.newBadgeText}>New</Text></View>
                            <TouchableOpacity style={styles.saveBtn}><Text style={{ color: '#FFF' }}>🔖</Text></TouchableOpacity>
                        </View>
                        <View style={styles.featuredDetails}>
                            <Text style={styles.featuredTitle}>{featuredMeal.mealName || 'Untitled Meal'}</Text>
                            <View style={styles.featuredAuthorRow}>
                                <Image source={{ uri: 'https://i.pravatar.cc/150?u=author' }} style={styles.authorAvatar} />
                                <Text style={styles.authorName}>{t('browseMeals.byIronLab')}</Text>
                            </View>
                            <View style={styles.featuredBottomRow}>
                                <View style={styles.fMetric}><Text style={styles.fMetricIcon}>🔥</Text><Text style={styles.fMetricVal}>{featuredMeal.calories || 0}</Text><Text style={styles.fMetricUnit}>kcal</Text></View>
                                <View style={styles.fMetric}><Text style={styles.fMetricIcon}>🕒</Text><Text style={styles.fMetricVal}>{featuredMeal.prepTime || 25}</Text><Text style={styles.fMetricUnit}>minutes</Text></View>
                                <View style={styles.fMetric}><Text style={styles.fMetricIcon}>🍃</Text><Text style={styles.fMetricVal}>{featuredMeal.protein || 0}g</Text><Text style={styles.fMetricUnit}>protein</Text></View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </>
        )}

        {/* Selection Sections or Flat List */}
        {isFiltering ? (
            <View style={styles.verticalList}>
                <Text style={styles.resultsCount}>
                    {isFetching ? t('browseMeals.refreshing') : t('browseMeals.resultsFound', { count: allMeals.length })}
                </Text>
                {allMeals.length === 0 && !isFetching && (
                    <Text style={styles.emptyText}>{t('browseMeals.noMealsFound')}</Text>
                )}
                {allMeals.map((meal) => (
                    <TouchableOpacity key={meal.id} style={styles.verticalCard} onPress={() => navigation.navigate('FoodDetails', { food: meal })}>
                        <View style={styles.vCardImageContainer}>
                            {meal.imageUrl ? (
                                <Image source={{ uri: meal.imageUrl }} style={styles.vCardImage} />
                            ) : (
                                <View style={[styles.vCardImage, { backgroundColor: '#27272A' }]} />
                            )}
                        </View>
                        <View style={styles.vCardContent}>
                            <Text style={styles.vCardTitle} numberOfLines={2}>{meal.mealName || 'Untitled Meal'}</Text>
                            <View style={styles.vCardMetricsRow}>
                                <Text style={styles.vCardMetricSmall}>🕒 {meal.prepTime || 30} min</Text>
                                <Text style={styles.vCardMetricSmall}>🔥 {meal.calories || 0} kcal</Text>
                                <Text style={styles.vCardMetricSmall}>🍃 {meal.protein || 0}g protein</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        ) : (
            <>
                {breakfastMeals.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('browseMeals.breakfastSelection')}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {breakfastMeals.map(renderHorizontalCard)}
                        </ScrollView>
                    </>
                )}

                {lunchMeals.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('browseMeals.lunchSelection')}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {lunchMeals.map(renderHorizontalCard)}
                        </ScrollView>
                    </>
                )}

                {dinnerMeals.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('browseMeals.dinnerSelection')}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {dinnerMeals.map(renderHorizontalCard)}
                        </ScrollView>
                    </>
                )}
            </>
        )}

        {/* Load More Button */}
        {data && allMeals.length < data.total && (
            <TouchableOpacity 
                style={styles.loadMoreBtn} 
                onPress={handleLoadMore}
                disabled={isLoading || isFetching}
            >
                <Text style={styles.loadMoreText}>{(isLoading || isFetching) ? t('browseMeals.loading') : t('browseMeals.loadMore')}</Text>
                <Text style={styles.loadMoreIcon}>+</Text>
            </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: {
    color: '#FFF',
    fontSize: 28,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: palette.gray[400],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  searchIcon: {
    fontSize: 16,
    color: palette.gray[400],
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
  },
  filterIcon: {
    fontSize: 16,
    color: palette.gray[400],
    marginLeft: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  categoryScroll: {
    paddingRight: 20,
    gap: 20,
    marginBottom: 10,
  },
  categoryItem: {
    alignItems: 'center',
    width: 64,
  },
  categoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  categoryLabel: {
    fontSize: 10,
    color: palette.gray[400],
    textAlign: 'center',
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rangeBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#18181B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  rangeBtnActive: {
    backgroundColor: palette.brand[500] + '33',
    borderColor: palette.brand[500],
  },
  rangeBtnText: {
    color: palette.gray[400],
    fontSize: 12,
  },
  rangeBtnTextActive: {
    color: palette.brand[500],
    fontWeight: 'bold',
  },
  featuredCard: {
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  featuredImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  featuredOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredDetails: {},
  featuredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  featuredAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 8 },
  authorName: { color: '#FFF', fontSize: 12 },
  featuredBottomRow: {
    flexDirection: 'row',
    gap: 16,
  },
  fMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fMetricIcon: { fontSize: 14 },
  fMetricVal: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  fMetricUnit: { color: palette.gray[300], fontSize: 9 },
  
  horizontalScroll: {
    gap: 16,
    marginBottom: 20,
  },
  horizontalCard: {
    width: 260,
    height: 120,
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  hCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  hCardTag: {
    backgroundColor: '#27272A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  hCardTagText: { fontSize: 8, color: '#A1A1AA' },
  hCardTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hCardMetrics: { flexDirection: 'row', gap: 12 },
  hCardMetric: { color: palette.gray[400], fontSize: 10 },
  hCardImageContainer: {
    width: 100,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  hCardImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginRight: -20,
  },
  resultsCount: {
    color: palette.gray[500],
    fontSize: 12,
    marginBottom: 16,
  },
  emptyText: {
    color: palette.gray[500],
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  verticalList: {
    gap: 16,
  },
  verticalCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
  },
  vCardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  vCardImage: { width: '100%', height: '100%' },
  vCardContent: { flex: 1, justifyContent: 'center' },
  vCardTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vCardMetricsRow: { flexDirection: 'row', gap: 12 },
  vCardMetricSmall: { color: palette.gray[400], fontSize: 10 },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  loadMoreText: {
    color: '#D4D4D8',
    fontSize: 18,
    fontWeight: '500',
  },
  loadMoreIcon: {
    color: '#D4D4D8',
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },
});
