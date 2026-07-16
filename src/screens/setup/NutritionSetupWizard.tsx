import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { usersService } from '../../services/users.service';
import { nutritionService } from '../../services/nutrition.service';
import { Button } from '../../components/ui/Button';
import { FitnessGoal } from '@shared';


type Step = 'Intro' | 'Preferences' | 'Allergies' | 'Snacking' | 'Goal' | 'Training' | 'Calories';

const PREFERENCE_OPTIONS = [
  { id: 'None', labelKey: 'nutritionSetup.prefNone', icon: '✕' },
  { id: 'Pescatarian', labelKey: 'nutritionSetup.prefPescatarian', icon: '🐟' },
  { id: 'Vegetarian', labelKey: 'nutritionSetup.prefVegetarian', icon: '🌱' },
  { id: 'Vegan', labelKey: 'nutritionSetup.prefVegan', icon: '🥗' },
  { id: 'Meat', labelKey: 'nutritionSetup.prefMeat', icon: '🥩' },
  { id: 'Wheat', labelKey: 'nutritionSetup.prefWheat', icon: '🌾' },
];

const ALLERGY_OPTIONS = [
  { id: 'Gluten', labelKey: 'nutritionSetup.allergyGluten', icon: '🍞' },
  { id: 'Wheat', labelKey: 'nutritionSetup.allergyWheat', icon: '🌾' },
  { id: 'Lactose', labelKey: 'nutritionSetup.allergyLactose', icon: '💧' },
  { id: 'Milk', labelKey: 'nutritionSetup.allergyMilk', icon: '🥛' },
  { id: 'Egg', labelKey: 'nutritionSetup.allergyEgg', icon: '🥚' },
  { id: 'Shellfish', labelKey: 'nutritionSetup.allergyShellfish', icon: '🍤' },
  { id: 'Other', labelKey: 'nutritionSetup.allergyOther', icon: '⚙️' },
  { id: 'None', labelKey: 'nutritionSetup.allergyNone', icon: '✕' },
];

const SNACK_FREQUENCY_KEYS = [
  'nutritionSetup.snackOne',
  'nutritionSetup.snackTwo',
  'nutritionSetup.snackThree',
  'nutritionSetup.snackFour',
  'nutritionSetup.snackFive',
];

const GOAL_OPTIONS: { id: FitnessGoal; labelKey: string; descKey: string; icon: string }[] = [
  { id: FitnessGoal.CUT, labelKey: 'nutritionSetup.goalCut', descKey: 'nutritionSetup.goalCutDesc', icon: '🔥' },
  { id: FitnessGoal.MAINGAIN, labelKey: 'nutritionSetup.goalMaintain', descKey: 'nutritionSetup.goalMaintainDesc', icon: '⚖️' },
  { id: FitnessGoal.BULK, labelKey: 'nutritionSetup.goalBulk', descKey: 'nutritionSetup.goalBulkDesc', icon: '💪' },
];

export const NutritionSetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<number>(0);
  const [dietaryPreference, setDietaryPreference] = useState('None');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [snackingFrequency, setSnackingFrequency] = useState(2); // Index for "Three Times"
  const [goal, setGoal] = useState<FitnessGoal>(FitnessGoal.MAINGAIN);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(3);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(2000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targets, setTargets] = useState<{
    tdee: number;
    bmr: number;
    activityLevel: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [isFetchingTdee, setIsFetchingTdee] = useState(false);
  const introFade = useRef(new Animated.Value(0)).current;
  const introSlide = useRef(new Animated.Value(30)).current;

  const steps: Step[] = ['Intro', 'Preferences', 'Allergies', 'Snacking', 'Goal', 'Training', 'Calories'];
  const progress = (step + 1) / steps.length;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(introSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  // Prefill training frequency from any existing AI-coach data so a user who
  // already set it (e.g. in AI Coach setup) confirms rather than silently resets it.
  useEffect(() => {
    nutritionService
      .getTDEE()
      .then((r) => {
        const existing = r?.breakdown?.trainingDaysPerWeek;
        if (typeof existing === 'number') setTrainingDaysPerWeek(existing);
      })
      .catch(() => {});
  }, []);

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // Compute + persist calories and macros from the chosen goal and the (possibly
      // hand-tuned) calorie figure, then save the dietary preferences and mark setup done.
      await nutritionService.computeTargets({ goal, trainingDaysPerWeek, calorieOverride: dailyCalorieTarget });
      const updatedUser = await usersService.updateProfile({
        dietaryPreference,
        allergies,
        snackingFrequency,
        isNutritionSetupComplete: true,
      });
      await setUser(updatedUser);
      onComplete();
    } catch {
      Alert.alert(t('common.error'), t('nutritionSetup.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAllergy = (id: string) => {
    if (id === 'None') {
      setAllergies(['None']);
      return;
    }
    const newAllergies = allergies.filter((a) => a !== 'None');
    if (newAllergies.includes(id)) {
      setAllergies(newAllergies.filter((a) => a !== id));
    } else {
      setAllergies([...newAllergies, id]);
    }
  };

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
    </View>
  );

  const renderIntro = () => (
    <View style={styles.introStep}>
      <View style={styles.introHero}>
        <View style={styles.introGlowRing} />
        <Text style={styles.introHeroEmoji}>🍽️</Text>
      </View>
      <Animated.View
        style={[styles.introBottom, { opacity: introFade, transform: [{ translateY: introSlide }] }]}
      >
        <Text style={styles.introHeading}>
          {t('nutritionSetup.introGreeting', { name: user?.name?.split(' ')[0] || 'there' })}
        </Text>
        <TouchableOpacity style={styles.introYesBtn} onPress={nextStep} activeOpacity={0.85}>
          <Text style={styles.introYesBtnText}>{t('nutritionSetup.yesStart')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.introNoBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.introNoBtnText}>{t('common.no')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentTop}>
        <Text style={styles.stepTitle}>{t('nutritionSetup.foodPreferences')}</Text>
        <ScrollView style={styles.optionsList}>
          {PREFERENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionItem,
                dietaryPreference === opt.id && styles.optionItemActive,
              ]}
              onPress={() => setDietaryPreference(opt.id)}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <Text style={styles.optionLabel}>{t(opt.labelKey)}</Text>
              </View>
              <View style={[styles.radio, dietaryPreference === opt.id && styles.radioActive]}>
                {dietaryPreference === opt.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.contentBottom}>
        <Button label={t('setup.continueBtn')} onPress={nextStep} style={styles.primaryBtn} />
      </View>
    </View>
  );

  const renderAllergies = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentTop}>
        <Text style={styles.stepTitle}>{t('nutritionSetup.allergies')}</Text>
        <View style={styles.chipsContainer}>
          {ALLERGY_OPTIONS.map((opt) => {
            const isSelected = allergies.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  isSelected && opt.id !== 'None' && { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                ]}
                onPress={() => toggleAllergy(opt.id)}
              >
                <Text style={styles.chipIcon}>{opt.icon}</Text>
                <Text style={[styles.chipLabel, isSelected && { color: opt.id === 'None' ? palette.brand[500] : '#60A5FA' }]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>ⓘ</Text>
          <Text style={styles.infoText}>{t('nutritionSetup.multipleOptions')}</Text>
        </View>
      </View>
      <View style={styles.contentBottom}>
        <Button label={t('setup.continueBtn')} onPress={nextStep} style={styles.primaryBtn} />
      </View>
    </View>
  );

  const renderSnacking = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentTop}>
        <Text style={styles.stepTitle}>{t('nutritionSetup.snacking')}</Text>
        <View style={styles.pickerContainer}>
          {SNACK_FREQUENCY_KEYS.map((freqKey, idx) => {
            const isSelected = snackingFrequency === idx;
            return (
              <TouchableOpacity
                key={freqKey}
                onPress={() => setSnackingFrequency(idx)}
                style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                  {t(freqKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.contentBottom}>
        <Button label={t('setup.continueBtn')} onPress={nextStep} style={styles.primaryBtn} />
      </View>
    </View>
  );

  const renderGoal = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentTop}>
        <Text style={styles.stepTitle}>{t('nutritionSetup.goalTitle')}</Text>
        <View style={styles.goalList}>
          {GOAL_OPTIONS.map((opt) => {
            const isSelected = goal === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.goalItem, isSelected && styles.optionItemActive]}
                onPress={() => setGoal(opt.id)}
              >
                <Text style={styles.goalIcon}>{opt.icon}</Text>
                <View style={styles.goalText}>
                  <Text style={styles.optionLabel}>{t(opt.labelKey)}</Text>
                  <Text style={styles.goalDesc}>{t(opt.descKey)}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.contentBottom}>
        <Button label={t('setup.continueBtn')} onPress={nextStep} style={styles.primaryBtn} />
      </View>
    </View>
  );

  const activityHint = (days: number) => {
    if (days === 0) return t('nutritionSetup.activitySedentary');
    if (days <= 2) return t('nutritionSetup.activityLight');
    if (days <= 4) return t('nutritionSetup.activityModerate');
    if (days <= 6) return t('nutritionSetup.activityVery');
    return t('nutritionSetup.activityExtra');
  };

  const renderTraining = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentTop}>
        <Text style={styles.stepTitle}>{t('nutritionSetup.trainingTitle')}</Text>
        <View style={styles.caloriesInputContainer}>
          <Text style={styles.caloriesUnit}>{t('nutritionSetup.daysPerWeek')}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setTrainingDaysPerWeek(Math.max(0, trainingDaysPerWeek - 1))}>
              <Text style={styles.stepBtnText}>⊖</Text>
            </TouchableOpacity>
            <Text style={styles.caloriesValue}>{trainingDaysPerWeek}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setTrainingDaysPerWeek(Math.min(7, trainingDaysPerWeek + 1))}>
              <Text style={styles.stepBtnText}>⊕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.adaptNote}>{activityHint(trainingDaysPerWeek)}</Text>
        </View>
      </View>
      <View style={styles.contentBottom}>
        <Button label={t('setup.continueBtn')} onPress={nextStep} style={styles.primaryBtn} />
      </View>
    </View>
  );

  const handleCalculateTDEE = async () => {
    setIsFetchingTdee(true);
    try {
      const result = await nutritionService.computeTargets({ goal, trainingDaysPerWeek });
      setTargets(result);
      setDailyCalorieTarget(result.calories);
    } catch {
      Alert.alert(t('common.error'), t('nutritionSetup.calcError'));
    } finally {
      setIsFetchingTdee(false);
    }
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: t('nutritionSetup.activitySedentary'),
    lightly_active: t('nutritionSetup.activityLight'),
    moderately_active: t('nutritionSetup.activityModerate'),
    very_active: t('nutritionSetup.activityVery'),
    extra_active: t('nutritionSetup.activityExtra'),
  };

  // Macro preview: when targets came from the server use them, otherwise estimate
  // locally from the current calorie figure so the preview tracks manual edits.
  const macroPreview = (() => {
    if (targets && targets.calories === dailyCalorieTarget) {
      return { protein: targets.protein, carbs: targets.carbs, fat: targets.fat };
    }
    const fat = Math.round((dailyCalorieTarget * 0.25) / 9);
    const protein = targets?.protein ?? Math.round((dailyCalorieTarget * 0.3) / 4);
    const carbs = Math.max(0, Math.round((dailyCalorieTarget - protein * 4 - fat * 9) / 4));
    return { protein, carbs, fat };
  })();

  const renderMacroPreview = () => (
    <View style={styles.macroPreviewRow}>
      <View style={styles.macroPreviewItem}>
        <Text style={[styles.macroPreviewValue, { color: palette.brand[500] }]}>{macroPreview.protein}g</Text>
        <Text style={styles.macroPreviewLabel}>P</Text>
      </View>
      <View style={styles.macroPreviewItem}>
        <Text style={[styles.macroPreviewValue, { color: '#F59E0B' }]}>{macroPreview.carbs}g</Text>
        <Text style={styles.macroPreviewLabel}>C</Text>
      </View>
      <View style={styles.macroPreviewItem}>
        <Text style={[styles.macroPreviewValue, { color: '#3B82F6' }]}>{macroPreview.fat}g</Text>
        <Text style={styles.macroPreviewLabel}>F</Text>
      </View>
    </View>
  );

  const renderCalories = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentTop}>
        <Text style={styles.stepTitle}>{t('nutritionSetup.dailyCalories')}</Text>

        {!targets ? (
          <View style={styles.caloriesInputContainer}>
            <TouchableOpacity
              style={styles.calculateBtn}
              onPress={handleCalculateTDEE}
              disabled={isFetchingTdee}
            >
              {isFetchingTdee ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.calculateBtnIcon}>⚡</Text>
                  <Text style={styles.calculateBtnText}>{t('nutritionSetup.calculateForMe')}</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.orText}>{t('nutritionSetup.orSetManually')}</Text>
            <Text style={styles.caloriesUnit}>{t('nutritionSetup.dailyIntake')}</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDailyCalorieTarget(Math.max(1000, dailyCalorieTarget - 50))}>
                <Text style={styles.stepBtnText}>⊖</Text>
              </TouchableOpacity>
              <Text style={styles.caloriesValue}>{dailyCalorieTarget.toLocaleString()}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDailyCalorieTarget(dailyCalorieTarget + 50)}>
                <Text style={styles.stepBtnText}>⊕</Text>
              </TouchableOpacity>
            </View>
            {renderMacroPreview()}
          </View>
        ) : (
          <View style={styles.caloriesInputContainer}>
            <View style={styles.tdeeCard}>
              <Text style={styles.tdeeLabel}>{t('nutritionSetup.estimatedTdee')}</Text>
              <Text style={styles.tdeeValue}>{t('nutritionSetup.perDay', { value: targets.tdee.toLocaleString() })}</Text>
              <Text style={styles.tdeeSub}>{t('nutritionSetup.bmrLabel', { value: targets.bmr.toLocaleString() })}</Text>
              <Text style={styles.tdeeSub}>{ACTIVITY_LABELS[targets.activityLevel] ?? targets.activityLevel}</Text>
              <TouchableOpacity onPress={() => setTargets(null)} style={styles.tdeeRecalcBtn}>
                <Text style={styles.tdeeRecalcText}>{t('nutritionSetup.enterManually')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.caloriesUnit}>{t('nutritionSetup.fineTune')}</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDailyCalorieTarget(Math.max(1000, dailyCalorieTarget - 50))}>
                <Text style={styles.stepBtnText}>⊖</Text>
              </TouchableOpacity>
              <Text style={styles.caloriesValue}>{dailyCalorieTarget.toLocaleString()}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDailyCalorieTarget(dailyCalorieTarget + 50)}>
                <Text style={styles.stepBtnText}>⊕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.macroPreviewTitle}>{t('nutritionSetup.macroTargets')}</Text>
            {renderMacroPreview()}
            <Text style={styles.adaptNote}>
              {t('nutritionSetup.adaptNote')}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.contentBottom}>
        <Button
          label={isSubmitting ? t('nutritionSetup.saving') : t('setup.continueBtn')}
          onPress={nextStep}
          style={styles.primaryBtn}
          disabled={isSubmitting}
        />
      </View>
    </View>
  );

  const CurrentStep = () => {
    switch (steps[step]) {
      case 'Intro': return renderIntro();
      case 'Preferences': return renderPreferences();
      case 'Allergies': return renderAllergies();
      case 'Snacking': return renderSnacking();
      case 'Goal': return renderGoal();
      case 'Training': return renderTraining();
      case 'Calories': return renderCalories();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderProgress()}
      <CurrentStep />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.backgroundTertiary,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: palette.brand[500],
  },
  introStep: {
    flex: 1,
  },
  introHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introGlowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.brand[500],
    opacity: 0.08,
  },
  introHeroEmoji: {
    fontSize: 96,
  },
  introBottom: {
    padding: 28,
    paddingBottom: 40,
  },
  introHeading: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 32,
  },
  introYesBtn: {
    backgroundColor: palette.brand[500],
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introYesBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  introNoBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introNoBtnText: {
    color: palette.gray[500],
    fontSize: 15,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  contentTop: {
    flex: 1,
  },
  contentBottom: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.xl,
  },
  primaryBtn: {
    backgroundColor: palette.brand[500],
    height: 58,
    borderRadius: 16,
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionItemActive: {
    borderColor: palette.brand[600],
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  optionIcon: {
    fontSize: 20,
    color: palette.brand[500],
  },
  optionLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: palette.brand[600],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.brand[500],
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: theme.spacing.xs,
  },
  chipActive: {
    borderColor: palette.brand[600],
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl * 2,
    gap: theme.spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItem: {
    paddingVertical: theme.spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  pickerItemActive: {
    borderWidth: 1,
    borderColor: palette.brand[600],
    borderRadius: 12,
    backgroundColor: 'rgba(234, 88, 12, 0.05)',
  },
  pickerText: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  pickerTextActive: {
    fontSize: 22,
    color: palette.brand[500],
    fontWeight: theme.fontWeight.bold,
  },
  caloriesInputContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesUnit: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: palette.brand[500],
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.xl * 2,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  caloriesValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFF',
  },
  caloriesSummary: {
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  boldText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  calculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: palette.brand[500],
    borderRadius: 16,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  calculateBtnIcon: {
    fontSize: 20,
    color: '#000',
  },
  calculateBtnText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold as any,
    color: '#000',
  },
  orText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  tdeeCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.brand[700],
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tdeeLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tdeeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: palette.brand[500],
  },
  tdeeSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  tdeeRecalcBtn: {
    marginTop: theme.spacing.sm,
  },
  tdeeRecalcText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  adaptNote: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    lineHeight: 18,
  },
  goalList: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalIcon: {
    fontSize: 26,
  },
  goalText: {
    flex: 1,
  },
  goalDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  macroPreviewTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  macroPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl,
  },
  macroPreviewItem: {
    alignItems: 'center',
  },
  macroPreviewValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  macroPreviewLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
});
