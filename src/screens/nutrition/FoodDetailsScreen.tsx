import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useCreateFoodLog } from '../../hooks/useNutrition';

import { theme, palette } from '../../theme';
const { width } = Dimensions.get('window');

export const FoodDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FoodDetails'>>();
  const createFoodLog = useCreateFoodLog();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Recipe'>('Overview');
  
  // Use data from route with strict fallbacks
  const food = route.params?.food;
  
  const displayData = {
    name: food?.mealName || 'Grilled Steak With Avocado Salsa',
    category: (food?.tags && food.tags[0]) || 'Breakfast',
    calories: food?.calories || 648,
    protein: food?.protein || 64,
    carbs: food?.carbs || 135,
    fat: food?.fat || 12,
    prepTime: food?.prepTime?.toString() || '25',
    rating: food?.rating || 4.6,
    servings: food?.servings || '1 plate',
    description: food?.notes && food.notes !== 'Structured Recipe' ? food.notes : 'Indulge in the rich, smoky flavors of perfectly grilled steak, topped with a refreshing and creamy avocado salsa.',
    imageUrl: food?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    benefits: food?.benefits || [
      'High in protein for muscle growth',
      'Healthy fats from avocado',
      'Rich in vitamins and antioxidants',
    ],
    tags: food?.tags || ['Healthy', 'Diet'],
    ingredients: food?.ingredients || [],
    instructions: (food?.fullInstructions && food.fullInstructions.length > 0) ? food.fullInstructions : [
      { step: 'Prepare', text: 'Wash and prepare all ingredients for the meal.' },
      { step: 'Cook', text: 'Follow standard cooking procedure or enjoy fresh!' },
      { step: 'Enjoy', text: 'Serve warm and enjoy your healthy meal!' }
    ]
  };

  const handleLogMeal = async () => {
    try {
      const formData = new FormData();
      formData.append('mealName', displayData.name);
      formData.append('calories', displayData.calories.toString());
      formData.append('protein', displayData.protein.toString());
      formData.append('carbs', displayData.carbs.toString());
      formData.append('fat', displayData.fat.toString());
      formData.append('imageUrl', displayData.imageUrl);
      formData.append('mealType', displayData.category.toUpperCase().includes('SNACK') ? 'SNACK' : 
                                  displayData.category.toUpperCase().includes('BREAKFAST') ? 'BREAKFAST' : 
                                  displayData.category.toUpperCase().includes('DINNER') ? 'DINNER' : 'LUNCH');
      formData.append('date', new Date().toISOString().split('T')[0]);
      
      createFoodLog.mutate(formData, {
        onSuccess: () => {
          // Navigating instantly without "ugly" success message per user request
          navigation.navigate('ClientApp');
        },
        onError: (error) => {
          console.error('Error logging meal:', error);
          Alert.alert(t('common.error'), t('foodDetails.logError'));
        }
      });
    } catch {
       Alert.alert(t('common.error'), t('foodDetails.logErrorGeneral'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Photo Header */}
        <View style={styles.photoHeader}>
          <Image source={{ uri: displayData.imageUrl }} style={styles.mainImage} />
          <View style={styles.headerTop}>
             <View style={{ width: 44 }} />
             <View style={styles.titleWrapper}>
                <Text style={styles.headerTitle}>{t('foodDetails.title')}</Text>
             </View>
             <TouchableOpacity style={styles.saveBtn} accessible={false}>
                <Text style={styles.saveIcon}>🔖</Text>
             </TouchableOpacity>
          </View>
          
          <View style={styles.photoOverlay}>
            <View style={styles.floatingCard}>
                <View style={[styles.badge, { backgroundColor: 'rgba(234, 88, 12, 0.2)' }]}>
                    <Text style={styles.badgeText}>🔥 {displayData.category}</Text>
                </View>
                <Text style={styles.title}>{displayData.name}</Text>
                <Text style={styles.subTitle}>Tender, healthy, and juicy — all the same time for a better life.</Text>
                
                <View style={styles.quickStatsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statMain}>{displayData.prepTime}</Text>
                        <Text style={styles.statLabel}>🕒 {t('foodDetails.minutes')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statMain}>{displayData.rating.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>⭐ {t('foodDetails.rating')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statMain}>{displayData.calories}</Text>
                        <Text style={styles.statLabel}>🔥 kcal</Text>
                    </View>
                </View>
            </View>
          </View>
        </View>

        <View style={styles.tabContentWrapper}>
            {/* Custom Tabs */}
            <View style={styles.tabsBackground}>
                {(['Overview', 'Recipe'] as const).map((tabKey) => (
                    <TouchableOpacity
                        accessibilityRole="button"
                        key={tabKey}
                        style={[styles.tab, activeTab === tabKey && styles.activeTab]}
                        onPress={() => setActiveTab(tabKey)}
                    >
                        <Text style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>
                            {tabKey === 'Overview' ? t('foodDetails.overview') : t('foodDetails.recipe')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'Overview' ? (
            <>
                <Text style={styles.sectionTitle}>{t('foodDetails.description')}</Text>
                <Text style={styles.descriptionText}>{displayData.description}</Text>

                <Text style={styles.sectionTitle}>{t('foodDetails.benefits')}</Text>
                <View style={styles.benefitsList}>
                {displayData.benefits.map((benefit: string, i: number) => (
                    <View key={i} style={styles.benefitItem}>
                        <View style={styles.checkIconWrapper}>
                            <Text style={styles.checkText}>✓</Text>
                        </View>
                        <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                ))}
                </View>

                <Text style={styles.sectionTitle}>{t('foodDetails.tags')}</Text>
                <View style={styles.tagsContainer}>
                {displayData.tags.map((tag: string, i: number) => (
                    <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}># {tag}</Text>
                    </View>
                ))}
                </View>

                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>{t('foodDetails.galleries')}</Text>
                    <TouchableOpacity accessible={false}><Text style={styles.seeAllText}>{t('foodDetails.seeAll')}</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                    {[1, 2, 3, 4].map((i) => (
                    <Image 
                        key={i} 
                        source={{ uri: `${displayData.imageUrl}&sig=${i}` }} 
                        style={styles.galleryImg} 
                    />
                    ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>{t('foodDetails.prepTime')}</Text>
                <View style={styles.gaugeCard}>
                    <View style={styles.gaugeTrack}>
                        <View style={styles.gaugeBackgroundSemi} />
                        <View style={[styles.gaugeFillSemi, { transform: [{ rotate: `${Math.min(180, (parseInt(displayData.prepTime) / 90) * 180) - 180}deg` }] }]} />
                        <View style={[styles.gaugePointerContainer, { transform: [{ rotate: `${Math.min(180, (parseInt(displayData.prepTime) / 90) * 180) - 90}deg` }] }]}>
                            <View style={styles.gaugePointer} />
                        </View>
                    </View>
                    <View style={styles.gaugeContent}>
                        <Text style={styles.gaugeMainValue}>{displayData.prepTime}</Text>
                        <Text style={styles.gaugeMainLabel}>{t('foodDetails.totalMinutes')}</Text>
                        <Text style={styles.gaugeSublabel}>
                            {parseInt(displayData.prepTime) < 20 ? 'Fast & Easy' : parseInt(displayData.prepTime) < 45 ? 'Moderate cooking time' : 'Slow & Delicious'}
                        </Text>
                    </View>
                    <View style={styles.gaugeMarkers}>
                        <Text style={styles.gaugeMarkerText}>0</Text>
                        <Text style={styles.gaugeMarkerText}>90</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>{t('foodDetails.nutritionLevel')}</Text>
                <View style={styles.nutritionLevelCard}>
                    <View style={styles.levelLeft}>
                        <View style={styles.levelHeader}>
                            <Text style={styles.levelIcon}>👍</Text>
                            <Text style={styles.levelValue}>87.2</Text>
                        </View>
                        <Text style={styles.levelStatus}>Good for diet</Text>
                        <Text style={styles.levelInfo}>This meal is good for metabolism and diet.</Text>
                    </View>
                    <Image 
                        source={{ uri: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2' }} 
                        style={styles.levelAppleImage} 
                    />
                </View>

                <Text style={styles.sectionTitle}>{t('foodDetails.instructions')}</Text>
                <View style={styles.instructionsTimeline}>
                    {displayData.instructions.map((step: { step: string; text: string }, i: number) => (
                        <View key={i} style={styles.timelineItem}>
                            <View style={styles.timelineMarker}>
                                <View style={styles.markerDotInner}>
                                   <View style={styles.markerDotCore} />
                                </View>
                                {i < displayData.instructions.length - 1 && <View style={styles.markerLine} />}
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineItemTitle}>{step.step}</Text>
                                <Text style={styles.timelineItemText}>{step.text}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>{t('foodDetails.youMightLike')}</Text>
                    <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('BrowseMeals')}>
                        <Text style={styles.seeAllText}>{t('foodDetails.seeAll')}</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recScroll}>
                    {[
                        { name: 'Mushroom Rice Bowl', cals: 300, time: 30, img: 'https://images.unsplash.com/photo-1546793665-c74683f339c1' },
                        { name: 'Berry Smoothie', cals: 180, time: 5, img: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888' },
                        { name: 'Chicken Salad', cals: 420, time: 15, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd' }
                    ].map((item, i) => (
                        <TouchableOpacity
                            accessibilityRole="button" 
                            key={i} 
                            style={styles.recCard}
                            onPress={() => {
                                // Pushing a new instance of FoodDetails with the selected recommendation
                                navigation.push('FoodDetails', { 
                                    food: { 
                                        mealName: item.name, 
                                        calories: item.cals, 
                                        prepTime: item.time, 
                                        imageUrl: item.img,
                                        tags: ['Recommended'],
                                        notes: 'A delicious and healthy choice recommended by our nutrition experts.'
                                    }
                                });
                            }}
                        >
                            <View style={styles.recBadge}><Text style={styles.recBadgeText}>Recommended</Text></View>
                            <Text style={styles.recTitle}>{item.name}</Text>
                            <View style={styles.recStats}>
                                <Text style={styles.recStat}>🕒 {item.time} min</Text>
                                <Text style={styles.recStat}>🔥 {item.cals} kcal</Text>
                            </View>
                            <Image 
                                source={{ uri: item.img }} 
                                style={styles.recImage} 
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </>
            ) : (
            <View style={styles.recipeView}>
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>{t('foodDetails.ingredients')}</Text>
                    <TouchableOpacity accessible={false}><Text style={styles.seeAllText}>{t('foodDetails.seeAll')}</Text></TouchableOpacity>
                </View>
                <View style={styles.ingredientsList}>
                    {displayData.ingredients.map((ing: { name: string; amount?: string; unit?: string }, i: number) => (
                        <View key={i} style={styles.ingredientRow}>
                            <Text style={styles.ingPrimary}>{ing.amount} {ing.unit || ''}</Text>
                            <Text style={styles.ingSecondary}>{ing.name}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>{t('foodDetails.macroBreakdown')}</Text>
                <View style={styles.macroCardsRow}>
                    <View style={[styles.macroCard, { borderLeftColor: palette.brand[500] }]}>
                        <Text style={styles.macroVal}>{displayData.carbs}g</Text>
                        <Text style={styles.macroLab}>Carbs</Text>
                    </View>
                    <View style={[styles.macroCard, { borderLeftColor: palette.info[500] }]}>
                        <Text style={styles.macroVal}>{displayData.protein}g</Text>
                        <Text style={styles.macroLab}>Protein</Text>
                    </View>
                    <View style={[styles.macroCard, { borderLeftColor: palette.emerald[500] }]}>
                        <Text style={styles.macroVal}>{displayData.fat}g</Text>
                        <Text style={styles.macroLab}>Fat</Text>
                    </View>
                </View>
            </View>
            )}
        </View>
      </ScrollView>

      {/* Footer sticky buttons */}
      <View style={styles.footerButtons}>
          <TouchableOpacity
            accessibilityRole="button" 
            style={[styles.addMealBtn, createFoodLog.isPending && { opacity: 0.7 }]}
            onPress={handleLogMeal}
            disabled={createFoodLog.isPending}
          >
              {createFoodLog.isPending ? (
                  <ActivityIndicator color={palette.white} />
              ) : (
                  <Text style={styles.addMealBtnText}>{t('foodDetails.addMeal')}</Text>
              )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiCoachBtn} accessible={false}>
              <Text style={styles.aiCoachBtnText}>{t('foodDetails.consultCoach')}</Text>
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.black,
  },
  scrollContent: {
    paddingBottom: 220,
  },
  photoHeader: {
    height: 600,
    width: '100%',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerTop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  titleWrapper: { flex: 1, alignItems: 'center' },
  headerTitle: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIcon: { fontSize: 20 },
  photoOverlay: {
    position: 'absolute',
    bottom: -80,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  floatingCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  badgeText: { color: palette.brand[500], fontSize: 12, fontWeight: 'bold' },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: palette.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 14,
    color: palette.zinc[400],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statMain: { fontSize: 20, fontWeight: 'bold', color: palette.white, marginBottom: 4 },
  statLabel: { fontSize: 12, color: palette.zinc[500] },
  statDivider: { width: 1, height: 30, backgroundColor: theme.colors.cardElevated },
  tabContentWrapper: {
    marginTop: 100,
    paddingHorizontal: 24,
  },
  tabsBackground: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 6,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: theme.colors.cardElevated,
  },
  tabText: { color: palette.zinc[500], fontWeight: 'bold', fontSize: 14 },
  activeTabText: { color: palette.white },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.white,
    marginBottom: 16,
    marginTop: 32,
  },
  descriptionText: {
    fontSize: 15,
    color: palette.zinc[400],
    lineHeight: 24,
  },
  benefitsList: { gap: 16 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: palette.black, fontSize: 14, fontWeight: 'bold' },
  benefitText: { color: palette.white, fontSize: 15 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
  },
  tagText: { color: palette.zinc[400], fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAllText: { color: palette.brand[500], fontSize: 14, fontWeight: 'bold' },
  galleryScroll: { marginTop: 12 },
  galleryImg: { width: 140, height: 140, borderRadius: 24, marginRight: 16 },
  gaugeCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
  },
  gaugeTrack: {
    width: width * 0.7,
    height: width * 0.35,
    overflow: 'hidden',
    alignItems: 'center',
  },
  gaugeBackgroundSemi: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 18,
    borderColor: theme.colors.cardElevated,
  },
  gaugeFillSemi: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 18,
    borderColor: palette.brand[500],
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  gaugePointer: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.brand[500],
    borderWidth: 3,
    borderColor: palette.white,
    top: width * 0.28,
    left: width * 0.5,
  },
  gaugeContent: {
    alignItems: 'center',
    marginTop: -40,
  },
  gaugeMainValue: { fontSize: 48, fontWeight: 'bold', color: palette.white, letterSpacing: -1 },
  gaugeMainLabel: { fontSize: 16, color: palette.white, fontWeight: 'bold' },
  gaugeSublabel: { fontSize: 13, color: palette.zinc[500], marginTop: 6 },
  gaugeMarkers: {
      flexDirection: 'row',
      width: width * 0.7,
      justifyContent: 'space-between',
      marginTop: 20,
  },
  gaugeMarkerText: { color: palette.zinc[500], fontSize: 14 },
  nutritionLevelCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelLeft: { flex: 1 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelIcon: { fontSize: 28 },
  levelValue: { fontSize: 32, fontWeight: 'bold', color: palette.white },
  levelStatus: { fontSize: 18, fontWeight: 'bold', color: palette.white, marginBottom: 8 },
  levelInfo: { fontSize: 14, color: palette.zinc[500], lineHeight: 20 },
  levelAppleImage: { width: 120, height: 120, borderRadius: 20 },
  instructionsTimeline: { marginTop: 8 },
  timelineItem: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  timelineMarker: { alignItems: 'center', width: 24 },
  markerDotInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: palette.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.black,
  },
  markerDotCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.brand[500] },
  markerLine: { width: 3, flex: 1, backgroundColor: theme.colors.cardElevated, marginTop: 12 },
  timelineContent: { flex: 1, backgroundColor: theme.colors.card, padding: 20, borderRadius: 24 },
  timelineItemTitle: { fontSize: 17, fontWeight: 'bold', color: palette.white, marginBottom: 10 },
  timelineItemText: { fontSize: 14, color: palette.zinc[400], lineHeight: 22 },
  recScroll: { marginTop: 12 },
  recCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 16,
    width: width * 0.65,
    marginRight: 16,
    flexDirection: 'column',
  },
  recBadge: {
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recBadgeText: { color: palette.zinc[400], fontSize: 11 },
  recTitle: { fontSize: 16, fontWeight: 'bold', color: palette.white, marginBottom: 8 },
  recStats: { flexDirection: 'row', gap: 12 },
  recStat: { fontSize: 12, color: palette.zinc[500] },
  recImage: { width: '100%', height: 120, borderRadius: 16, marginTop: 12 },
  recipeView: { marginTop: 16 },
  ingredientsList: { gap: 12 },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.card,
  },
  ingPrimary: { color: palette.white, fontWeight: 'bold', fontSize: 15 },
  ingSecondary: { color: palette.zinc[500], fontSize: 15 },
  macroCardsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  macroCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    borderLeftWidth: 4,
  },
  macroVal: { fontSize: 18, fontWeight: 'bold', color: palette.white, marginBottom: 4 },
  macroLab: { fontSize: 12, color: palette.zinc[500] },
  footerButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardElevated,
    gap: 16,
  },
  gaugePointerContainer: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8, // Adjust to put dot on the track
  },
  addMealBtn: {
    backgroundColor: palette.brand[500],
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMealBtnText: { color: palette.white, fontWeight: 'bold', fontSize: 18 },
  aiCoachBtn: {
    height: 60,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCoachBtnText: { color: palette.white, fontWeight: 'bold', fontSize: 16 },
});
