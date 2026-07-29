import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useQueryClient } from '@tanstack/react-query';
import { useFoodLogs, useNutritionSummary, useNutritionCalendar } from '../../hooks/useNutrition';
import { aiCoachService } from '../../services/ai-coach.service';
import { NutritionSetupWizard } from '../setup/NutritionSetupWizard';
import { Leaf, Coins, Robot, Fire, Trophy, Lightning, Flame, ForkKnife } from 'phosphor-react-native';


const timeFilters = ['1d', '1w', '1m', '1y', 'All Time'];

export const NutritionDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('1w');

  const { data: summary, isLoading: summaryLoading } = useNutritionSummary(activeFilter);
  const { data: calendar } = useNutritionCalendar();
  const [nutritionAdvice, setNutritionAdvice] = useState<string | null>(null);

  useEffect(() => {
    aiCoachService.getNutritionAdvice()
      .then((r) => setNutritionAdvice(r.advice))
      .catch(() => {});
  }, []);
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed month
  });
  const { data: foodLogs } = useFoodLogs(selectedDate);

  const getDayStatus = (dateStr: string) => {
    const day = calendar?.find(c => c.date === dateStr);
    return day?.isGoalMet;
  };

  const getCalendarDates = () => {
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
  };

  const shiftCalendarMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const calendarDates = getCalendarDates();

  // Gate the dashboard behind nutrition setup so calorie/macro targets are
  // personalized before any numbers are shown — otherwise the summary endpoint
  // falls back to a generic 2000 kcal / 30-40-30 split for every account.
  const isNutritionSetupDone = user && user.isNutritionSetupComplete === true;
  if (!isNutritionSetupDone) {
    return (
      <NutritionSetupWizard
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['nutritionSummary'] });
          queryClient.invalidateQueries({ queryKey: ['nutritionCalendar'] });
          queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
        }}
      />
    );
  }

  if (summaryLoading) {
    return (
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: palette.white }}>{t('nutritionDashboard.loadingData')}</Text>
        </SafeAreaView>
    );
  }

  const todayTotals = summary?.today || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const targets = summary?.targets || { calories: 2000, protein: 150, carbs: 200, fat: 60 };
  const netBalance = summary?.netBalance || 0;
  const cardioCaloriesBurned: number = summary?.cardioCaloriesBurned ?? 0;

  // Net calories = consumed - cardio burned. Remaining = target - net
  const netCalories = Math.max(0, todayTotals.calories - cardioCaloriesBurned);
  const netRemaining = Math.max(0, Math.round(targets.calories - netCalories));

  // Calculate percentage for circular progress (based on net calories)
  const progressPercent = Math.min(100, (netCalories / targets.calories) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('ClientApp')}>
            <UserAvatar user={user} size={40} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('nav.nutrition')}</Text>
          {/* Spacer keeps the title centered (no live notifications screen yet) */}
          <View style={styles.headerSpacer} />
        </View>

        {/* Nutrition Score Section */}
        <View style={styles.scoreRow}>
            <View style={styles.scoreSection}>
                <Leaf size={32} weight="fill" color={palette.brand[400]} style={{ marginBottom: 10 }} />
                <Text style={styles.scoreValue}>{summary?.score || '0'}</Text>
                <Text style={styles.scoreLabel}>{t('nutrition.score')}</Text>
            </View>

            <View style={styles.scoreDivider} />

            <View style={styles.scoreSection}>
                <Coins size={32} weight="fill" color={palette.brand[400]} style={{ marginBottom: 10 }} />
                <Text style={[
                    styles.scoreValue, 
                    { color: netBalance >= 0 ? palette.brand[500] : palette.brand[500] }
                ]}>
                    {netBalance > 0 ? `+${Math.round(netBalance)}` : Math.round(netBalance)}
                </Text>
                <Text style={styles.scoreLabel}>{t('nutrition.calorieBank')}</Text>
            </View>
        </View>
        
        <Text style={styles.scoreInsight}>{summary?.insight}</Text>

        {/* M-7EO Nutrition Advice */}
        {nutritionAdvice ? (
          <View style={styles.adviceCard}>
            <View style={styles.adviceHeader}>
              <Robot size={16} weight="fill" color={palette.brand[400]} />
              <Text style={styles.adviceLabel}>{t('nutritionDashboard.mEoSays')}</Text>
            </View>
            <Text style={styles.adviceText}>{nutritionAdvice}</Text>
          </View>
        ) : null}

        {/* Time Filter Tabs */}
        <View style={styles.filterContainer}>
            <View style={styles.filterRow}>
                {timeFilters.map((f) => (
                    <TouchableOpacity 
                        key={f} 
                        onPress={() => setActiveFilter(f)}
                        style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
                    >
                        <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {/* Period Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary?.avgCalories ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('nutrition.avgKcal')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary?.avgProtein ?? '—'}g</Text>
            <Text style={styles.statLabel}>{t('nutrition.avgProtein')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary?.loggedDays ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('nutrition.daysLogged')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: (summary?.proteinHitRate ?? 0) >= 70 ? palette.brand[400] : palette.warning[500] }]}>
              {summary?.proteinHitRate ?? '—'}%
            </Text>
            <Text style={styles.statLabel}>{t('nutrition.proteinGoal')}</Text>
          </View>
        </View>

        {/* Macro Split Bar — always shows today's data */}
        {summary?.macroSplit && (summary.macroSplit.protein + summary.macroSplit.carbs + summary.macroSplit.fat) > 0 && (
          <View style={styles.macroSplitCard}>
            <Text style={styles.macroSplitTitle}>{t('nutrition.macroSplit')}</Text>
            <View style={styles.macroSplitBar}>
              <View style={[styles.macroSplitSegment, { flex: summary.macroSplit.protein || 0.01, backgroundColor: palette.brand[500] }]} />
              <View style={[styles.macroSplitSegment, { flex: summary.macroSplit.carbs || 0.01, backgroundColor: palette.warning[500] }]} />
              <View style={[styles.macroSplitSegment, { flex: summary.macroSplit.fat || 0.01, backgroundColor: palette.info[500] }]} />
            </View>
            <View style={styles.macroSplitLegend}>
              <View style={styles.macroSplitLegendItem}>
                <View style={[styles.macroSplitDot, { backgroundColor: palette.brand[500] }]} />
                <Text style={styles.macroSplitLegendText}>P {summary.macroSplit.protein}%</Text>
              </View>
              <View style={styles.macroSplitLegendItem}>
                <View style={[styles.macroSplitDot, { backgroundColor: palette.warning[500] }]} />
                <Text style={styles.macroSplitLegendText}>C {summary.macroSplit.carbs}%</Text>
              </View>
              <View style={styles.macroSplitLegendItem}>
                <View style={[styles.macroSplitDot, { backgroundColor: palette.info[500] }]} />
                <Text style={styles.macroSplitLegendText}>F {summary.macroSplit.fat}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Consistency & Records Row */}
        <View style={styles.consistencyRow}>
          <View style={styles.consistencyCard}>
            <Fire size={22} weight="fill" color={palette.brand[500]} style={{ marginBottom: 6 }} />
            <Text style={styles.consistencyBig}>{summary?.streak ?? 0}</Text>
            <Text style={styles.consistencyLabel}>{t('nutrition.dayStreak')}</Text>
          </View>
          <View style={styles.consistencyCard}>
            <Trophy size={22} weight="fill" color={palette.brand[400]} style={{ marginBottom: 6 }} />
            <Text style={styles.consistencyBig}>{summary?.bestProtein ?? 0}g</Text>
            <Text style={styles.consistencyLabel}>{t('nutrition.bestProtein')}</Text>
          </View>
          <View style={styles.consistencyCard}>
            <Lightning size={22} weight="fill" color={palette.yellow[500]} style={{ marginBottom: 6 }} />
            <Text style={styles.consistencyBig}>{summary?.bestCalories ?? 0}</Text>
            <Text style={styles.consistencyLabel}>{t('nutrition.bestKcal')}</Text>
          </View>
        </View>

        {/* Meal Type Breakdown — always shows today's data */}
        {summary?.mealTypeBreakdown && Object.keys(summary.mealTypeBreakdown).length > 0 && (
          <View style={styles.mealBreakdownCard}>
            <Text style={styles.mealBreakdownTitle}>{t('nutrition.todayByMealType')}</Text>
            {Object.entries(summary.mealTypeBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([type, kcal]) => {
                const total = Object.values(summary.mealTypeBreakdown as Record<string, number>).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round(((kcal as number) / total) * 100) : 0;
                return (
                  <View key={type} style={styles.mealBreakdownRow}>
                    <Text style={styles.mealBreakdownType}>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</Text>
                    <View style={styles.mealBreakdownBarWrap}>
                      <View style={[styles.mealBreakdownBar, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.mealBreakdownKcal}>{Math.round(kcal as number)} kcal</Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Log New Meal Button */}
        <TouchableOpacity
            style={styles.logBtn}
            onPress={() => navigation.navigate('FoodScanOnboarding')}
        >
            <Text style={styles.logBtnText}>{t('nutrition.logNewMeal')} +</Text>
        </TouchableOpacity>

        {/* Browse Meals Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('nutrition.browseMeals')}</Text>
        </View>
        <TouchableOpacity style={styles.mealCard} onPress={() => navigation.navigate('BrowseMeals')}>
            <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }} 
                style={styles.mealCardImage} 
                resizeMode="cover"
            />
            <View style={styles.mealCardOverlay}>
                <Text style={styles.mealCardTitle}>{t('nutritionDashboard.exploreMeals')}</Text>
                <Text style={styles.mealCardLink}>{t('nutrition.browseMeals')}</Text>
            </View>
        </TouchableOpacity>

        {/* Nutrition Insight - Circular Progress */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('nutrition.insight')}</Text>        </View>
        <View style={styles.insightCard}>
            <View style={styles.insightRow}>
                <View style={styles.insightStat}>
                    <Text style={styles.insightStatValue}>{Math.round(todayTotals.calories)}</Text>
                    <Text style={styles.insightStatLabel}>{t('nutrition.consumed')}</Text>
                </View>
                <View style={styles.insightRing}>
                    <View style={[styles.ringFill, { 
                        borderColor: theme.colors.cardElevated,
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0
                    }]} />
                    
                    <View style={[styles.ringFill, { 
                        borderTopColor: palette.brand[500],
                        borderRightColor: progressPercent >= 25 ? palette.brand[500] : 'transparent',
                        borderBottomColor: progressPercent >= 50 ? palette.brand[500] : 'transparent',
                        borderLeftColor: progressPercent >= 75 ? palette.brand[500] : 'transparent',
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0
                    }]} />

                    <View style={styles.ringInner}>
                        <Text style={styles.ringValue}>{netRemaining}</Text>
                        <Text style={styles.ringLabel}>{t('nutrition.remaining')}</Text>
                    </View>
                </View>
                <View style={styles.insightStat}>
                    <Text style={styles.insightStatValue}>{Math.round(targets.calories)}</Text>
                    <Text style={styles.insightStatLabel}>{t('nutrition.target')}</Text>
                </View>
            </View>
            
            {cardioCaloriesBurned > 0 && (
              <View style={styles.cardioBurnRow}>
                <Flame size={14} weight="fill" color={palette.brand[500]} />
                <Text style={styles.cardioBurnText}>
                  -{cardioCaloriesBurned} kcal cardio burn · net {Math.round(netCalories)} consumed
                </Text>
              </View>
            )}

            <View style={styles.macroInsights}>
                <View style={styles.macroInsightItem}>
                    <Text style={styles.macroInsightLabel}>{t('nutrition.protein').replace(' (g)', '')}</Text>
                    <View style={styles.macroBack}><View style={[styles.macroFill, { width: `${Math.min(100, (todayTotals.protein / targets.protein) * 100)}%`, backgroundColor: palette.brand[500] }]} /></View>
                    <Text style={styles.macroInsightValue}>{Math.round(todayTotals.protein)}/{Math.round(targets.protein)}g</Text>
                </View>
                <View style={styles.macroInsightItem}>
                    <Text style={styles.macroInsightLabel}>{t('nutrition.fat').replace(' (g)', '')}</Text>
                    <View style={styles.macroBack}><View style={[styles.macroFill, { width: `${Math.min(100, (todayTotals.fat / targets.fat) * 100)}%`, backgroundColor: palette.info[500] }]} /></View>
                    <Text style={styles.macroInsightValue}>{Math.round(todayTotals.fat)}/{Math.round(targets.fat)}g</Text>
                </View>
                <View style={styles.macroInsightItem}>
                    <Text style={styles.macroInsightLabel}>{t('nutrition.carbs').replace(' (g)', '')}</Text>
                    <View style={styles.macroBack}><View style={[styles.macroFill, { width: `${Math.min(100, (todayTotals.carbs / targets.carbs) * 100)}%`, backgroundColor: palette.warning[500] }]} /></View>
                    <Text style={styles.macroInsightValue}>{Math.round(todayTotals.carbs)}/{Math.round(targets.carbs)}g</Text>
                </View>
            </View>
            
            <Text style={styles.insightConclusion}>
                {summary?.insight}
            </Text>
        </View>

        {/* Nutrition History */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
                {t('nutrition.historyTitle')}{selectedDate !== today ? ` (${new Date(selectedDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})})` : ''}
            </Text>        </View>
        <View style={styles.historyList}>
            {foodLogs && foodLogs.length > 0 ? (
                foodLogs.slice(0, 3).map((log) => (
                    <View key={log.id} style={styles.historyItem}>
                        <View style={styles.historyIcon}>
                            {log.imageUrl ? (
                                <Image source={{ uri: log.imageUrl }} style={{ width: '100%', height: '100%', borderRadius: 24 }} />
                            ) : (
                                <ForkKnife size={20} weight="bold" color={palette.gray[500]} />
                            )}
                        </View>
                        <View style={styles.historyContent}>
                            <Text style={styles.historyMealName}>{log.mealName || 'Untitled Meal'}</Text>
                            <View style={styles.historyMacros}>
                                <View style={[styles.historyMacroBubble, { backgroundColor: palette.success[800] }]}><Text style={styles.historyMacroText}>F {Math.round(log.fat || 0)}g</Text></View>
                                <View style={[styles.historyMacroBubble, { backgroundColor: palette.warning[800] }]}><Text style={styles.historyMacroText}>C {Math.round(log.carbs || 0)}g</Text></View>
                                <View style={[styles.historyMacroBubble, { backgroundColor: palette.error[800] }]}><Text style={styles.historyMacroText}>P {Math.round(log.protein || 0)}g</Text></View>
                            </View>
                        </View>
                        <View style={styles.historyRight}>
                            <Text style={styles.historyCal}>{Math.round(log.calories || 0)}kcal</Text>
                            <Text style={styles.historyDate}>
                                {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.historyItem}>
                    <Text style={{ color: palette.gray[500], textAlign: 'center', width: '100%' }}>
                        {selectedDate === today ? t('nutritionDashboard.noMealsToday') : t('nutritionDashboard.noMealsOnDate')}
                    </Text>
                </View>
            )}
        </View>

        {/* Nutrition Calendar */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('nutritionDashboard.nutritionCalendar')}</Text>        </View>
        <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
                <Text style={styles.calendarMonth}>
                    {new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.calendarNav}>
                    <TouchableOpacity onPress={() => shiftCalendarMonth(-1)}><Text style={styles.calNavText}>‹</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => shiftCalendarMonth(1)}><Text style={styles.calNavText}>›</Text></TouchableOpacity>
                </View>
            </View>
            <View style={styles.calendarGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <Text key={d} style={styles.calDayLabel}>{(d as string)[0]}</Text>
                ))}
                {/* Empty cells to align first day of month */}
                {Array.from({ length: new Date(calendarMonth.year, calendarMonth.month, 1).getDay() }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.calCell} />
                ))}
                {calendarDates.map((dateStr, i) => {
                    const status = getDayStatus(dateStr);
                    const isSelected = selectedDate === dateStr;
                    return (
                        <TouchableOpacity
                            key={dateStr}
                            style={[styles.calCell, isSelected && styles.calCellSelected]}
                            onPress={() => setSelectedDate(dateStr)}
                        >
                            <Text style={[styles.calCellDate, isSelected && styles.calCellDateSelected]}>{i + 1}</Text>
                            {status !== undefined && (
                                <View style={[styles.calDot, { backgroundColor: status ? palette.brand[500] : palette.gray[600] }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={styles.calLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: palette.brand[500] }]} />
                    <Text style={styles.legendText}>{t('nutritionDashboard.goalReached')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: palette.gray[600] }] } />
                    <Text style={styles.legendText}>{t('nutritionDashboard.notReached')}</Text>
                </View>
            </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.black,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.white,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreSection: {
    alignItems: 'center',
    flex: 1,
  },
  scoreDivider: {
    width: 1,
    height: 60,
    backgroundColor: theme.colors.cardElevated,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: palette.white,
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 14,
    color: palette.zinc[500],
    marginTop: 5,
  },
  scoreInsight: {
    fontSize: 14,
    color: palette.zinc[500],
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 16,
  },
  adviceCard: {
    backgroundColor: theme.surfaceTint.info,
    borderWidth: 1,
    borderColor: palette.brand[700],
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 24,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  adviceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.brand[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  adviceText: {
    color: palette.zinc[200],
    fontSize: 14,
    lineHeight: 21,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: palette.zinc[500] },
  filterContainer: {
    marginTop: 20,
    marginBottom: 30,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: theme.colors.cardElevated,
  },
  filterTabText: { color: palette.zinc[500], fontSize: 12 },
  filterTabTextActive: { color: palette.white, fontWeight: 'bold' },
  logBtn: {
    backgroundColor: palette.brand[500],
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.black,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.white,
  },
  mealCard: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
  },
  mealCardOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  mealCardTitle: {
    fontSize: 16,
    color: palette.white,
    lineHeight: 22,
    marginBottom: 10,
  },
  mealCardLink: {
    fontSize: 14,
    color: palette.brand[500],
    fontWeight: 'bold',
  },
  insightCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    marginBottom: 40,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  insightStat: { alignItems: 'center', width: 60 },
  insightStatValue: { fontSize: 18, color: palette.white, fontWeight: 'bold' },
  insightStatLabel: { fontSize: 10, color: palette.zinc[500], marginTop: 4 },
  insightRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    borderWidth: 8,
    borderRadius: 70,
  },
  ringInner: { alignItems: 'center' },
  ringValue: { fontSize: 28, fontWeight: 'bold', color: palette.white },
  ringLabel: { fontSize: 12, color: palette.zinc[500] },
  macroInsights: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  macroInsightItem: { flex: 1, alignItems: 'center' },
  macroInsightLabel: { fontSize: 10, color: palette.zinc[500], marginBottom: 8 },
  macroBack: { height: 4, backgroundColor: theme.colors.cardElevated, width: '80%', borderRadius: 2, marginBottom: 8 },
  macroFill: { height: '100%', borderRadius: 2 },
  macroInsightValue: { fontSize: 12, color: palette.white, fontWeight: 'bold' },
  insightConclusion: {
    fontSize: 14,
    color: palette.zinc[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  cardioBurnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardioBurnText: { color: palette.brand[500], fontSize: 12, fontWeight: '600' },
  historyList: { gap: 12, marginBottom: 40 },
  historyItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: { flex: 1 },
  historyMealName: { fontSize: 15, fontWeight: 'bold', color: palette.white },
  historyMacros: { flexDirection: 'row', gap: 10, marginTop: 6 },
  historyMacroBubble: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  historyMacroText: {
    fontSize: 10,
    color: palette.white,
    fontWeight: 'bold',
  },
  historyRight: { alignItems: 'flex-end' },
  historyCal: { fontSize: 16, fontWeight: 'bold', color: palette.white },
  historyDate: { fontSize: 11, color: palette.zinc[500], marginTop: 4 },
  mealCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calendarCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 40,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarMonth: {
    color: palette.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 15,
  },
  calNavText: {
    color: palette.white,
    fontSize: 20,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayLabel: {
    width: '14.28%',
    textAlign: 'center',
    color: palette.gray[500],
    fontSize: 10,
    marginBottom: 10,
  },
  calCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellSelected: {
    backgroundColor: theme.colors.cardElevated,
    borderRadius: 8,
  },
  calCellDate: {
    color: palette.white,
    fontSize: 12,
    textAlign: 'center',
  },
  calCellDateSelected: {
    fontWeight: 'bold',
    color: palette.brand[500],
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  calLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: palette.white,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: palette.zinc[500],
    marginTop: 4,
    textAlign: 'center',
  },
  macroSplitCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
  },
  macroSplitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.white,
    marginBottom: 12,
  },
  macroSplitBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  macroSplitSegment: {
    height: '100%',
  },
  macroSplitLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  macroSplitLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroSplitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroSplitLegendText: {
    fontSize: 12,
    color: palette.zinc[400],
    fontWeight: '600',
  },
  consistencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  consistencyCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
  },
  consistencyBig: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.white,
    letterSpacing: -0.5,
  },
  consistencyLabel: {
    fontSize: 10,
    color: palette.zinc[500],
    marginTop: 3,
    textAlign: 'center',
  },
  mealBreakdownCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
  },
  mealBreakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.white,
    marginBottom: 14,
  },
  mealBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  mealBreakdownType: {
    width: 72,
    fontSize: 12,
    color: palette.zinc[400],
    fontWeight: '600',
  },
  mealBreakdownBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  mealBreakdownBar: {
    height: '100%',
    backgroundColor: palette.brand[500],
    borderRadius: 3,
  },
  mealBreakdownKcal: {
    width: 64,
    fontSize: 11,
    color: palette.zinc[500],
    textAlign: 'right',
  },
});
