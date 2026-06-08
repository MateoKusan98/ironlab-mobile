import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Animated, Dimensions, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import { palette } from '../../theme';
import { aiCoachService, AICoachProfileData, CoachPreferences } from '../../services/ai-coach.service';
import { useAuthStore } from '../../stores/auth.store';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachExtendedSetup'>;
  route: RouteProp<RootStackParamList, 'AICoachExtendedSetup'>;
};

// ─── Section / Question definitions ─────────────────────────────────────────

type QuestionType = 'single' | 'multi' | 'number' | 'text' | 'slider' | 'bool' | 'longtext' | 'focus_slider';

interface Option { value: string; label: string; icon?: string }
interface Question {
  id: keyof AICoachProfileData;
  label: string;
  subtitle?: string;
  type: QuestionType;
  options?: Option[];
  min?: number; max?: number; unit?: string;
  placeholder?: string;
  optional?: boolean;
  allowDontKnow?: boolean; // shows "Not sure yet" escape hatch; stores '__unknown__', skipped on save
  trueLabel?: string;
  falseLabel?: string;
  showIf?: (answers: Record<string, any>) => boolean;
}

interface Section { id: string; title: string; icon: string; subtitle: string; questions: Question[] }

type TFunction = (key: string) => string;

const getSections = (t: TFunction): Section[] => [
  {
    id: 'goal', title: t('aiCoachExtendedSetup.sectionGoalTitle'), icon: '🎯',
    subtitle: t('aiCoachExtendedSetup.sectionGoalSubtitle'),
    questions: [
      {
        id: 'trainingFocus',
        label: t('aiCoachExtendedSetup.questionTrainingFocus'),
        subtitle: t('aiCoachExtendedSetup.questionTrainingFocusSubtitle'),
        type: 'focus_slider',
      },
      {
        id: 'specificGoal', label: t('aiCoachExtendedSetup.questionSpecificGoal'), type: 'text',
        placeholder: t('aiCoachExtendedSetup.questionSpecificGoalPlaceholder'),
        subtitle: t('aiCoachExtendedSetup.questionSpecificGoalSubtitle'),
      },
      {
        id: 'timeline', label: t('aiCoachExtendedSetup.questionTimeline'), type: 'single',
        options: [
          { value: '4-6 weeks', label: t('aiCoachExtendedSetup.optionTimeline4to6Weeks') },
          { value: '3 months', label: t('aiCoachExtendedSetup.optionTimeline3Months') },
          { value: '6 months', label: t('aiCoachExtendedSetup.optionTimeline6Months') },
          { value: '12 months', label: t('aiCoachExtendedSetup.optionTimeline12Months') },
          { value: 'ongoing', label: t('aiCoachExtendedSetup.optionTimelineOngoing') },
        ],
      },
    ],
  },
  {
    id: 'history', title: t('aiCoachExtendedSetup.sectionHistoryTitle'), icon: '📚',
    subtitle: t('aiCoachExtendedSetup.sectionHistorySubtitle'),
    questions: [
      {
        id: 'yearsTraining', label: t('aiCoachExtendedSetup.questionYearsTraining'), type: 'number',
        min: 0, max: 40, unit: 'years', placeholder: '3',
      },
      {
        id: 'bestSystems', label: t('aiCoachExtendedSetup.questionBestSystems'), type: 'multi',
        options: [
          { value: 'high_volume', label: t('aiCoachExtendedSetup.optionHighVolume') },
          { value: 'high_intensity', label: t('aiCoachExtendedSetup.optionHighIntensity') },
          { value: 'high_frequency', label: t('aiCoachExtendedSetup.optionHighFrequency') },
          { value: 'linear_progression', label: t('aiCoachExtendedSetup.optionLinearProgression') },
          { value: 'conjugate', label: t('aiCoachExtendedSetup.optionConjugate') },
          { value: 'block_periodization', label: t('aiCoachExtendedSetup.optionBlockPeriodization') },
        ],
      },
      {
        id: 'adaptationSpeed', label: t('aiCoachExtendedSetup.questionAdaptationSpeed'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'slow', label: t('aiCoachExtendedSetup.optionSlow'), icon: '🐢' },
          { value: 'moderate', label: t('aiCoachExtendedSetup.optionModerate'), icon: '🚶' },
          { value: 'fast', label: t('aiCoachExtendedSetup.optionFast'), icon: '⚡' },
        ],
      },
      {
        id: 'prTrend', label: t('aiCoachExtendedSetup.questionPrTrend'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'improving', label: t('aiCoachExtendedSetup.optionImproving') },
          { value: 'stagnant', label: t('aiCoachExtendedSetup.optionStagnant') },
          { value: 'declining', label: t('aiCoachExtendedSetup.optionDeclining') },
        ],
      },
      {
        id: 'historicalWorkoutData',
        label: t('aiCoachExtendedSetup.questionHistoricalWorkoutData'),
        subtitle: t('aiCoachExtendedSetup.questionHistoricalWorkoutDataSubtitle'),
        type: 'longtext',
        placeholder: t('aiCoachExtendedSetup.questionHistoricalWorkoutDataPlaceholder'),
        optional: true,
      },
    ],
  },
  {
    id: 'maxes', title: t('aiCoachExtendedSetup.sectionMaxesTitle'), icon: '⚖️',
    subtitle: t('aiCoachExtendedSetup.sectionMaxesSubtitle'),
    questions: [
      { id: 'squatMax', label: t('aiCoachExtendedSetup.questionSquatMax'), type: 'number', min: 0, max: 500, unit: 'kg', placeholder: '140', optional: true },
      { id: 'benchMax', label: t('aiCoachExtendedSetup.questionBenchMax'), type: 'number', min: 0, max: 400, unit: 'kg', placeholder: '100', optional: true },
      { id: 'deadliftMax', label: t('aiCoachExtendedSetup.questionDeadliftMax'), type: 'number', min: 0, max: 600, unit: 'kg', placeholder: '180', optional: true },
      { id: 'ohpMax', label: t('aiCoachExtendedSetup.questionOhpMax'), type: 'number', min: 0, max: 250, unit: 'kg', placeholder: '70', optional: true },
    ],
  },
  {
    id: 'technical', title: t('aiCoachExtendedSetup.sectionTechnicalTitle'), icon: '🔬',
    subtitle: t('aiCoachExtendedSetup.sectionTechnicalSubtitle'),
    questions: [
      {
        id: 'squatWeakPoint', label: t('aiCoachExtendedSetup.questionSquatWeakPoint'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'none', label: t('aiCoachExtendedSetup.optionNoWeakness') },
          { value: 'off_floor', label: t('aiCoachExtendedSetup.optionOutOfHole') },
          { value: 'mid_range', label: t('aiCoachExtendedSetup.optionMidRange') },
          { value: 'lockout', label: t('aiCoachExtendedSetup.optionLockout') },
        ],
      },
      {
        id: 'benchWeakPoint', label: t('aiCoachExtendedSetup.questionBenchWeakPoint'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'none', label: t('aiCoachExtendedSetup.optionNoWeakness') },
          { value: 'off_chest', label: t('aiCoachExtendedSetup.optionOffChest') },
          { value: 'mid_range', label: t('aiCoachExtendedSetup.optionMidRange') },
          { value: 'lockout', label: t('aiCoachExtendedSetup.optionLockout') },
        ],
      },
      {
        id: 'deadliftWeakPoint', label: t('aiCoachExtendedSetup.questionDeadliftWeakPoint'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'none', label: t('aiCoachExtendedSetup.optionNoWeakness') },
          { value: 'off_floor', label: t('aiCoachExtendedSetup.optionOffFloor') },
          { value: 'mid_range', label: t('aiCoachExtendedSetup.optionKneePassing') },
          { value: 'lockout', label: t('aiCoachExtendedSetup.optionLockoutHip') },
        ],
      },
      {
        id: 'mobilityLimitations', label: t('aiCoachExtendedSetup.questionMobilityLimitations'), type: 'multi', optional: true,
        options: [
          { value: 'hip_flexors', label: t('aiCoachExtendedSetup.optionHipFlexors') },
          { value: 'ankles', label: t('aiCoachExtendedSetup.optionAnkles') },
          { value: 'thoracic', label: t('aiCoachExtendedSetup.optionThoracicSpine') },
          { value: 'shoulders', label: t('aiCoachExtendedSetup.optionShoulders') },
          { value: 'hamstrings', label: t('aiCoachExtendedSetup.optionHamstrings') },
          { value: 'none', label: t('aiCoachExtendedSetup.optionNoneSignificant') },
        ],
      },
      {
        id: 'preferredSquatStance', label: t('aiCoachExtendedSetup.questionSquatStance'), type: 'single', optional: true,
        allowDontKnow: true,
        options: [
          { value: 'narrow', label: t('aiCoachExtendedSetup.optionNarrow') },
          { value: 'medium', label: t('aiCoachExtendedSetup.optionMedium') },
          { value: 'wide', label: t('aiCoachExtendedSetup.optionWide') },
        ],
      },
    ],
  },
  {
    id: 'recovery', title: t('aiCoachExtendedSetup.sectionRecoveryTitle'), icon: '😴',
    subtitle: t('aiCoachExtendedSetup.sectionRecoverySubtitle'),
    questions: [
      { id: 'avgSleepHours', label: t('aiCoachExtendedSetup.questionAvgSleepHours'), type: 'number', min: 3, max: 12, unit: 'hours', placeholder: '7' },
      {
        id: 'sleepQuality', label: t('aiCoachExtendedSetup.questionSleepQuality'), type: 'single',
        options: [
          { value: 'poor', label: t('aiCoachExtendedSetup.optionPoorSleep'), icon: '😫' },
          { value: 'average', label: t('aiCoachExtendedSetup.optionAverageSleep'), icon: '😐' },
          { value: 'good', label: t('aiCoachExtendedSetup.optionGoodSleep'), icon: '😊' },
        ],
      },
      {
        id: 'jobStressLevel', label: t('aiCoachExtendedSetup.questionJobStressLevel'), type: 'slider', min: 1, max: 5,
      },
      {
        id: 'physicalLabor', label: t('aiCoachExtendedSetup.questionPhysicalLabor'), type: 'bool',
      },
      {
        id: 'weeklyCardioSessions', label: t('aiCoachExtendedSetup.questionWeeklyCardioSessions'), type: 'number',
        min: 0, max: 14, unit: 'sessions', placeholder: '2',
      },
      {
        id: 'otherSports',
        label: t('aiCoachExtendedSetup.questionOtherSports'),
        subtitle: t('aiCoachExtendedSetup.questionOtherSportsSubtitle'),
        type: 'multi',
        optional: true,
        options: [
          { value: 'boxing', label: t('aiCoachExtendedSetup.optionBoxing'), icon: '🥊' },
          { value: 'football', label: t('aiCoachExtendedSetup.optionFootball'), icon: '⚽' },
          { value: 'basketball', label: t('aiCoachExtendedSetup.optionBasketball'), icon: '🏀' },
          { value: 'tennis', label: t('aiCoachExtendedSetup.optionTennis'), icon: '🎾' },
          { value: 'cycling', label: t('aiCoachExtendedSetup.optionCycling'), icon: '🚴' },
          { value: 'swimming', label: t('aiCoachExtendedSetup.optionSwimming'), icon: '🏊' },
          { value: 'martial_arts', label: t('aiCoachExtendedSetup.optionMartialArts'), icon: '🥋' },
          { value: 'volleyball', label: t('aiCoachExtendedSetup.optionVolleyball'), icon: '🏐' },
          { value: 'other', label: t('aiCoachExtendedSetup.optionOther'), icon: '🏃' },
        ],
      },
      {
        id: 'otherSportsFrequency',
        label: t('aiCoachExtendedSetup.questionOtherSportsFrequency'),
        type: 'single',
        optional: true,
        showIf: (a) => Array.isArray(a.otherSports) && a.otherSports.length > 0,
        options: [
          { value: '1-2x_week', label: t('aiCoachExtendedSetup.option1to2xWeek') },
          { value: '3-4x_week', label: t('aiCoachExtendedSetup.option3to4xWeek') },
          { value: '5plus_week', label: t('aiCoachExtendedSetup.option5plusWeek') },
        ],
      },
      {
        id: 'recoverySpeed', label: t('aiCoachExtendedSetup.questionRecoverySpeed'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'slow', label: t('aiCoachExtendedSetup.optionSlowRecovery') },
          { value: 'moderate', label: t('aiCoachExtendedSetup.optionModerateRecovery') },
          { value: 'fast', label: t('aiCoachExtendedSetup.optionFastRecovery') },
        ],
      },
      {
        id: 'injuryHistory', label: t('aiCoachExtendedSetup.questionInjuryHistory'), type: 'text', optional: true,
        placeholder: t('aiCoachExtendedSetup.questionInjuryHistoryPlaceholder'),
      },
    ],
  },
  {
    id: 'constraints', title: t('aiCoachExtendedSetup.sectionConstraintsTitle'), icon: '📅',
    subtitle: t('aiCoachExtendedSetup.sectionConstraintsSubtitle'),
    questions: [
      {
        id: 'trainingDays', label: t('aiCoachExtendedSetup.questionTrainingDays'), type: 'multi',
        subtitle: t('aiCoachExtendedSetup.questionTrainingDaysSubtitle'),
        options: [
          { value: 'monday',    label: t('aiCoachExtendedSetup.optionMonday') },
          { value: 'tuesday',   label: t('aiCoachExtendedSetup.optionTuesday') },
          { value: 'wednesday', label: t('aiCoachExtendedSetup.optionWednesday') },
          { value: 'thursday',  label: t('aiCoachExtendedSetup.optionThursday') },
          { value: 'friday',    label: t('aiCoachExtendedSetup.optionFriday') },
          { value: 'saturday',  label: t('aiCoachExtendedSetup.optionSaturday') },
          { value: 'sunday',    label: t('aiCoachExtendedSetup.optionSunday') },
        ],
      },
      {
        id: 'equipmentAccess', label: t('aiCoachExtendedSetup.questionEquipmentAccess'), type: 'single',
        options: [
          { value: 'home_basic', label: t('aiCoachExtendedSetup.optionHomeBasic'), icon: '🏠' },
          { value: 'home_full', label: t('aiCoachExtendedSetup.optionHomeFull'), icon: '🏠' },
          { value: 'commercial_gym', label: t('aiCoachExtendedSetup.optionCommercialGym'), icon: '🏋️' },
          { value: 'powerlifting_gym', label: t('aiCoachExtendedSetup.optionPowerliftingGym'), icon: '🏆' },
        ],
      },
      {
        id: 'squatFrequencyPerWeek',
        label: t('aiCoachExtendedSetup.questionSquatFrequency'),
        subtitle: t('aiCoachExtendedSetup.questionSquatFrequencySubtitle'),
        type: 'number', min: 1, max: 5, unit: 'x / week', placeholder: '2',
        optional: true,
      },
      {
        id: 'benchFrequencyPerWeek',
        label: t('aiCoachExtendedSetup.questionBenchFrequency'),
        subtitle: t('aiCoachExtendedSetup.questionBenchFrequencySubtitle'),
        type: 'number', min: 1, max: 5, unit: 'x / week', placeholder: '2',
        optional: true,
      },
      {
        id: 'deadliftFrequencyPerWeek',
        label: t('aiCoachExtendedSetup.questionDeadliftFrequency'),
        subtitle: t('aiCoachExtendedSetup.questionDeadliftFrequencySubtitle'),
        type: 'number', min: 1, max: 3, unit: 'x / week', placeholder: '1',
        optional: true,
      },
    ],
  },
  {
    id: 'response', title: t('aiCoachExtendedSetup.sectionResponseTitle'), icon: '💪',
    subtitle: t('aiCoachExtendedSetup.sectionResponseSubtitle'),
    questions: [
      {
        id: 'responseType', label: t('aiCoachExtendedSetup.questionResponseType'), type: 'single',
        subtitle: t('aiCoachExtendedSetup.questionResponseTypeSubtitle'),
        allowDontKnow: true,
        options: [
          { value: 'volume', label: t('aiCoachExtendedSetup.optionVolume') },
          { value: 'intensity', label: t('aiCoachExtendedSetup.optionIntensity') },
          { value: 'frequency', label: t('aiCoachExtendedSetup.optionFrequency') },
          { value: 'variation', label: t('aiCoachExtendedSetup.optionVariation') },
        ],
      },
      {
        id: 'deadliftRecoveryCost', label: t('aiCoachExtendedSetup.questionDeadliftRecoveryCost'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'low', label: t('aiCoachExtendedSetup.optionLowRecoveryCost') },
          { value: 'medium', label: t('aiCoachExtendedSetup.optionMediumRecoveryCost') },
          { value: 'high', label: t('aiCoachExtendedSetup.optionHighRecoveryCost') },
        ],
      },
      {
        id: 'painfulExercises', label: t('aiCoachExtendedSetup.questionPainfulExercises'), type: 'text', optional: true,
        placeholder: t('aiCoachExtendedSetup.questionPainfulExercisesPlaceholder'),
      },
      {
        id: 'preferredExercises', label: t('aiCoachExtendedSetup.questionPreferredExercises'), type: 'text', optional: true,
        placeholder: t('aiCoachExtendedSetup.questionPreferredExercisesPlaceholder'),
      },
    ],
  },
  {
    id: 'nutrition', title: t('aiCoachExtendedSetup.sectionNutritionTitle'), icon: '🥩',
    subtitle: t('aiCoachExtendedSetup.sectionNutritionSubtitle'),
    questions: [
      {
        id: 'nutritionTrackingEnabled',
        label: t('aiCoachExtendedSetup.questionNutritionTracking'),
        subtitle: t('aiCoachExtendedSetup.questionNutritionTrackingSubtitle'),
        type: 'bool',
        trueLabel: t('aiCoachExtendedSetup.optionYesFuseIt'),
        falseLabel: t('aiCoachExtendedSetup.optionKeepSeparate'),
      },
      {
        id: 'currentPhase', label: t('aiCoachExtendedSetup.questionCurrentPhase'), type: 'single',
        options: [
          { value: 'cut', label: t('aiCoachExtendedSetup.optionCut'), icon: '📉' },
          { value: 'maintain', label: t('aiCoachExtendedSetup.optionMaintain'), icon: '➡️' },
          { value: 'bulk', label: t('aiCoachExtendedSetup.optionBulk'), icon: '📈' },
        ],
      },
      {
        id: 'dailyProteinTarget', label: t('aiCoachExtendedSetup.questionDailyProteinTarget'), type: 'number',
        min: 50, max: 400, unit: 'g', placeholder: '180', optional: true,
      },
      {
        id: 'weightClassTarget', label: t('aiCoachExtendedSetup.questionWeightClassTarget'), type: 'text', optional: true,
        placeholder: t('aiCoachExtendedSetup.questionWeightClassTargetPlaceholder'),
      },
    ],
  },
  {
    id: 'psychology', title: t('aiCoachExtendedSetup.sectionPsychologyTitle'), icon: '🧠',
    subtitle: t('aiCoachExtendedSetup.sectionPsychologySubtitle'),
    questions: [
      {
        id: 'prefersStructure', label: t('aiCoachExtendedSetup.questionPrefersStructure'), type: 'bool',
        // true = structure, false = flexible
      },
      {
        id: 'missedLiftResponse', label: t('aiCoachExtendedSetup.questionMissedLiftResponse'), type: 'single',
        allowDontKnow: true,
        options: [
          { value: 'persists', label: t('aiCoachExtendedSetup.optionPersists') },
          { value: 'adjusts', label: t('aiCoachExtendedSetup.optionAdjusts') },
          { value: 'spirals', label: t('aiCoachExtendedSetup.optionSpirals') },
        ],
      },
      {
        id: 'overshootsEffort', label: t('aiCoachExtendedSetup.questionOvershootsEffort'), type: 'bool',
        allowDontKnow: true,
      },
      {
        id: 'motivationConsistency', label: t('aiCoachExtendedSetup.questionMotivationConsistency'), type: 'single',
        options: [
          { value: 'low', label: t('aiCoachExtendedSetup.optionLowMotivation'), icon: '😔' },
          { value: 'medium', label: t('aiCoachExtendedSetup.optionMediumMotivation'), icon: '😐' },
          { value: 'high', label: t('aiCoachExtendedSetup.optionHighMotivation'), icon: '🔥' },
        ],
      },
    ],
  },
  {
    id: 'tracking', title: t('aiCoachExtendedSetup.sectionTrackingTitle'), icon: '📊',
    subtitle: t('aiCoachExtendedSetup.sectionTrackingSubtitle'),
    questions: [
      {
        id: 'trackingHabits', label: t('aiCoachExtendedSetup.questionTrackingHabits'), type: 'multi',
        options: [
          { value: 'rpe', label: t('aiCoachExtendedSetup.optionRpe') },
          { value: 'bodyweight', label: t('aiCoachExtendedSetup.optionBodyweight') },
          { value: 'sleep', label: t('aiCoachExtendedSetup.optionSleep') },
          { value: 'session_notes', label: t('aiCoachExtendedSetup.optionSessionNotes') },
          { value: 'video', label: t('aiCoachExtendedSetup.optionVideoReview') },
          { value: 'velocity', label: t('aiCoachExtendedSetup.optionVelocity') },
          { value: 'stress', label: t('aiCoachExtendedSetup.optionStressHrv') },
          { value: 'nothing', label: t('aiCoachExtendedSetup.optionNothingYet') },
        ],
      },
    ],
  },
];

// ─── Reusable question UI components ────────────────────────────────────────

const SingleChoice = ({ options, value, onChange }: { options: Option[]; value: string; onChange: (v: string) => void }) => (
  <View style={q.optionList}>
    {options.map((opt) => {
      const selected = value === opt.value;
      return (
        <TouchableOpacity key={opt.value} style={[q.optionCard, selected && q.optionSelected]} onPress={() => onChange(opt.value)}>
          <Text style={[q.optionText, selected && q.optionTextSelected]}>
            {opt.icon ? `${opt.icon}  ` : ''}{opt.label}
          </Text>
          <View style={[q.radio, selected && q.radioSelected]}>
            {selected && <View style={q.radioInner} />}
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const MultiChoice = ({ options, value, onChange }: { options: Option[]; value: string[]; onChange: (v: string[]) => void }) => (
  <View style={q.chipWrap}>
    {options.map((opt) => {
      const selected = value.includes(opt.value);
      return (
        <TouchableOpacity
          key={opt.value}
          style={[q.chip, selected && q.chipSelected]}
          onPress={() => {
            if (selected) onChange(value.filter((v) => v !== opt.value));
            else onChange([...value, opt.value]);
          }}
        >
          {opt.icon && <Text style={q.chipIcon}>{opt.icon}</Text>}
          <Text style={[q.chipText, selected && q.chipTextSelected]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const NumberInput = ({ value, onChange, unit, placeholder }: { value: string; onChange: (v: string) => void; unit?: string; placeholder?: string; min?: number; max?: number }) => (
  <View style={q.numberRow}>
    <TextInput
      style={q.numberInput}
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
      placeholder={placeholder ?? '0'}
      placeholderTextColor={palette.gray[600]}
    />
    {unit && <Text style={q.numberUnit}>{unit}</Text>}
  </View>
);

const BoolInput = ({ value, onChange, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean | null; onChange: (v: boolean) => void; trueLabel?: string; falseLabel?: string }) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>
    {[true, false].map((v) => (
      <TouchableOpacity
        key={String(v)}
        style={[q.boolBtn, value === v && q.boolBtnSelected]}
        onPress={() => onChange(v)}
      >
        <Text style={[q.boolText, value === v && q.boolTextSelected]}>{v ? trueLabel : falseLabel}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const SliderInput = ({ value, onChange, min = 1, max = 5 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <View style={q.sliderRow}>
    {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((v) => (
      <TouchableOpacity key={v} style={[q.sliderDot, value >= v && q.sliderDotActive]} onPress={() => onChange(v)}>
        <Text style={[q.sliderDotText, value >= v && q.sliderDotTextActive]}>{v}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const FOCUS_TICKS = [
  'hypertrophy',
  'hypertrophy_leaning',
  'powerbuilding',
  'strength_leaning',
  'strength',
] as const;

const FocusSlider = ({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: TFunction }) => (
  <View style={fs.wrap}>
    {/* Track + dots */}
    <View style={fs.trackRow}>
      <View style={fs.trackBg} />
      <View style={fs.dotsRow}>
        {FOCUS_TICKS.map((tick) => {
          const active = value === tick;
          return (
            <TouchableOpacity key={tick} onPress={() => onChange(tick)} style={fs.dotTouch} activeOpacity={0.7}>
              <View style={[fs.dot, active && fs.dotActive]}>
                {active && <View style={fs.dotInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
    {/* Anchor labels */}
    <View style={fs.labelRow}>
      <Text style={[fs.label, fs.labelLeft, (value === 'hypertrophy' || value === 'hypertrophy_leaning') && fs.labelActive]}>
        {t('aiCoachExtendedSetup.focusHypertrophy')}
      </Text>
      <Text style={[fs.label, fs.labelCenter, value === 'powerbuilding' && fs.labelActive]}>
        {t('aiCoachExtendedSetup.focusPowerbuilding')}
      </Text>
      <Text style={[fs.label, fs.labelRight, (value === 'strength' || value === 'strength_leaning') && fs.labelActive]}>
        {t('aiCoachExtendedSetup.focusStrength')}
      </Text>
    </View>
  </View>
);

const fs = StyleSheet.create({
  wrap: { marginVertical: 4 },
  trackRow: { height: 40, justifyContent: 'center' },
  trackBg: {
    position: 'absolute',
    top: 19,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: palette.gray[700],
    borderRadius: 1,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dotTouch: { padding: 8 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: palette.gray[600],
    backgroundColor: palette.gray[900],
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] },
  dotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  labelRow: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: palette.gray[500] },
  labelLeft: { flex: 1, textAlign: 'left' },
  labelCenter: { flex: 1, textAlign: 'center' },
  labelRight: { flex: 1, textAlign: 'right' },
  labelActive: { color: palette.brand[400] },
});

const q = StyleSheet.create({
  optionList: { gap: 10 },
  optionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.gray[900], borderRadius: 14, padding: 16, borderWidth: 1, borderColor: palette.gray[800] },
  optionSelected: { borderColor: palette.brand[600], backgroundColor: 'rgba(234,88,12,0.08)' },
  optionText: { color: palette.gray[300], fontSize: 14, fontWeight: '600' },
  optionTextSelected: { color: palette.brand[400] },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: palette.gray[600], alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700], flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipSelected: { borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.12)' },
  chipIcon: { fontSize: 14 },
  chipText: { color: palette.gray[400], fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: palette.brand[400] },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberInput: { backgroundColor: palette.gray[900], borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, color: '#FFF', fontSize: 24, fontWeight: '700', borderWidth: 1, borderColor: palette.gray[700], minWidth: 100, textAlign: 'center' },
  numberUnit: { color: palette.gray[400], fontSize: 16 },
  boolBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center' },
  boolBtnSelected: { borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.12)' },
  boolText: { color: palette.gray[400], fontSize: 15, fontWeight: '700' },
  boolTextSelected: { color: palette.brand[400] },
  sliderRow: { flexDirection: 'row', gap: 10 },
  sliderDot: { flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center', justifyContent: 'center' },
  sliderDotActive: { backgroundColor: 'rgba(234,88,12,0.15)', borderColor: palette.brand[500] },
  sliderDotText: { color: palette.gray[500], fontSize: 16, fontWeight: '700' },
  sliderDotTextActive: { color: palette.brand[400] },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const AICoachExtendedSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const SECTIONS = getSections(t);
  const preferences = route.params?.preferences as CoachPreferences | undefined;
  const editMode = route.params?.editMode ?? false;
  const { user, setUser } = useAuthStore();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pre-populate answers from saved profile when opened in edit mode
  useEffect(() => {
    if (!editMode) return;
    aiCoachService.getProfile().then((profile) => {
      if (!profile) return;
      const loaded: Record<string, any> = {};
      (Object.entries(profile) as [string, any][]).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') loaded[k] = v;
      });
      setAnswers(loaded);
    }).catch(() => {});
  }, [editMode]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const CONSTRAINTS_IDX = SECTIONS.findIndex((s) => s.id === 'constraints');
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof aiCoachService.getSuggestedConstraints>>>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const section = SECTIONS[sectionIndex];
  const totalSections = SECTIONS.length;
  const progress = (sectionIndex + 1) / totalSections;

  const get = (id: string, def: any = '') => answers[id] ?? def;

  const set = (id: string, value: any) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
    const startX = direction === 'forward' ? width : -width;
    slideAnim.setValue(startX);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    callback();
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  };

  const visibleQuestions = (questions: Question[]) =>
    questions.filter((q) => !q.showIf || q.showIf(answers));

  // Fetch session-derived suggestions when user reaches the constraints section
  React.useEffect(() => {
    if (sectionIndex !== CONSTRAINTS_IDX || suggestionsDismissed || suggestions !== null) return;
    aiCoachService.getSuggestedConstraints().then((s) => {
      if (s && s.sessionCount >= 3) setSuggestions(s);
    });
  }, [sectionIndex]);

  const applyConstraintSuggestions = () => {
    if (!suggestions) return;
    setAnswers((prev) => {
      const next = { ...prev };
      if (suggestions.trainingDays && !prev.trainingDays?.length) next.trainingDays = suggestions.trainingDays;
      if (suggestions.avgSessionMinutes && !prev.sessionDurationMinutes) next.sessionDurationMinutes = suggestions.avgSessionMinutes;
      if (suggestions.squatFrequencyPerWeek && !prev.squatFrequencyPerWeek) next.squatFrequencyPerWeek = Math.round(suggestions.squatFrequencyPerWeek);
      if (suggestions.benchFrequencyPerWeek && !prev.benchFrequencyPerWeek) next.benchFrequencyPerWeek = Math.round(suggestions.benchFrequencyPerWeek);
      if (suggestions.deadliftFrequencyPerWeek && !prev.deadliftFrequencyPerWeek) next.deadliftFrequencyPerWeek = Math.round(suggestions.deadliftFrequencyPerWeek);
      return next;
    });
    setSuggestionsDismissed(true);
  };

  const getSectionErrors = (): string[] => {
    return visibleQuestions(section.questions)
      .filter((q) => !q.optional)
      .filter((q) => {
        const val = answers[q.id];
        if (val === '__unknown__') return false; // "I don't know" counts as answered
        if (val === undefined || val === null || val === '') return true;
        if (Array.isArray(val) && val.length === 0) return true;
        return false;
      })
      .map((q) => q.label);
  };

  const goNext = () => {
    const errors = getSectionErrors();
    if (errors.length > 0) {
      Alert.alert(
        t('aiCoachExtendedSetup.completeSection'),
        `${t('aiCoachExtendedSetup.stillNeeded', { fields: errors.join('\n• ') })}`,
        [{ text: t('common.ok') }],
      );
      return;
    }
    if (sectionIndex < totalSections - 1) {
      animateTransition('forward', () => setSectionIndex((i) => i + 1));
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (sectionIndex > 0) {
      animateTransition('back', () => setSectionIndex((i) => i - 1));
    } else {
      navigation.goBack();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const numericFields = ['yearsTraining', 'squatMax', 'benchMax', 'deadliftMax', 'ohpMax',
        'avgSleepHours', 'jobStressLevel', 'weeklyCardioSessions', 'trainingDaysPerWeek',
        'sessionDurationMinutes', 'dailyProteinTarget', 'meetExperience',
        'squatFrequencyPerWeek', 'benchFrequencyPerWeek', 'deadliftFrequencyPerWeek'];

      const profileData: AICoachProfileData = {};

      // Merge basic setup preferences (duration, intensity) into profile
      if (preferences?.duration) profileData.sessionDurationMinutes = preferences.duration;
      if (preferences?.intensity) profileData.preferredIntensity = preferences.intensity;

      Object.entries(answers).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && val !== '__unknown__') {
          if (numericFields.includes(key)) {
            (profileData as any)[key] = typeof val === 'number' ? val : parseFloat(val);
          } else {
            (profileData as any)[key] = val;
          }
        }
      });

      await aiCoachService.saveProfile(profileData);
      if (editMode) {
        Alert.alert(t('aiCoachExtendedSetup.savedTitle'), t('aiCoachExtendedSetup.savedMsg'));
        navigation.goBack();
      } else {
        if (user) setUser({ ...user, isAICoachSetupComplete: true });
        navigation.replace('AICoachPlan', undefined);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
      Alert.alert(t('aiCoachExtendedSetup.saveFailedTitle'), String(Array.isArray(msg) ? msg.join('\n') : msg));
    } finally {
      setIsSaving(false);
    }
  };

  const DONT_KNOW = '__unknown__';
  const isDontKnow = (id: string) => answers[id] === DONT_KNOW;

  const renderQuestion = (question: Question) => {
    const { id, type, options = [], min, max, unit, placeholder, allowDontKnow, trueLabel, falseLabel } = question;
    const notSure = isDontKnow(id);

    const input = (() => {
      switch (type) {
        case 'single':
          return <SingleChoice options={options} value={notSure ? '' : get(id)} onChange={(v) => set(id, v)} />;
        case 'multi':
          return <MultiChoice options={options} value={get(id, [])} onChange={(v) => set(id, v)} />;
        case 'number':
          return <NumberInput value={get(id)} onChange={(v) => set(id, v)} unit={unit} placeholder={placeholder} min={min} max={max} />;
        case 'text':
          return (
            <TextInput
              style={s.textArea}
              value={get(id)}
              onChangeText={(v) => set(id, v)}
              placeholder={placeholder}
              placeholderTextColor={palette.gray[600]}
              multiline
              numberOfLines={3}
            />
          );
        case 'longtext':
          return (
            <TextInput
              style={[s.textArea, s.textAreaLarge]}
              value={get(id)}
              onChangeText={(v) => set(id, v)}
              placeholder={placeholder}
              placeholderTextColor={palette.gray[600]}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          );
        case 'bool':
          return (
            <BoolInput
              value={notSure ? null : get(id, null)}
              onChange={(v) => set(id, v)}
              trueLabel={trueLabel ?? (id === 'prefersStructure' ? t('aiCoachExtendedSetup.optionRigidStructure') : t('common.yes'))}
              falseLabel={falseLabel ?? (id === 'prefersStructure' ? t('aiCoachExtendedSetup.optionFlexible') : t('common.no'))}
            />
          );
        case 'slider':
          return <SliderInput value={get(id, min ?? 1)} onChange={(v) => set(id, v)} min={min} max={max} />;
        case 'focus_slider':
          return <FocusSlider value={get(id, '')} onChange={(v) => set(id, v)} t={t} />;
        default:
          return null;
      }
    })();

    return (
      <>
        {input}
        {allowDontKnow && (
          <TouchableOpacity
            style={[s.dontKnowBtn, notSure && s.dontKnowBtnActive]}
            onPress={() => set(id, notSure ? '' : DONT_KNOW)}
          >
            <Text style={[s.dontKnowText, notSure && s.dontKnowTextActive]}>
              {notSure ? t('aiCoachExtendedSetup.notSureYet') : t('aiCoachExtendedSetup.dontKnow')}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <TouchableOpacity onPress={handleFinish} style={s.skipBtn}>
          <Text style={s.skipText}>{t('aiCoachExtendedSetup.skipAll')}</Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.tabs}>
        {SECTIONS.map((sec, i) => (
          <View key={sec.id} style={[s.tab, i === sectionIndex && s.tabActive]}>
            <Text style={s.tabIcon}>{sec.icon}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Section header — fixed, outside scroll */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionIcon}>{section.icon}</Text>
        <Text style={s.sectionTitle}>{section.title}</Text>
        <Text style={s.sectionSubtitle}>{section.subtitle}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView key={sectionIndex} ref={scrollRef} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Constraint suggestions banner */}
            {sectionIndex === CONSTRAINTS_IDX && suggestions && !suggestionsDismissed && (
              <View style={s.suggestionCard}>
                <View style={s.suggestionHeader}>
                  <Text style={s.suggestionTitle}>
                    {t('aiCoachExtendedSetup.detectedFrom', { count: suggestions.sessionCount })}
                  </Text>
                  <TouchableOpacity onPress={() => setSuggestionsDismissed(true)}>
                    <Text style={s.suggestionDismiss}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.suggestionRows}>
                  {suggestions.trainingDays && (
                    <Text style={s.suggestionItem}>
                      📅  Days: {suggestions.trainingDays.map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                    </Text>
                  )}
                  {suggestions.sessionsPerWeek && (
                    <Text style={s.suggestionItem}>
                      🔁  Frequency: ~{suggestions.sessionsPerWeek}x / week
                    </Text>
                  )}
                  {suggestions.avgSessionMinutes && (
                    <Text style={s.suggestionItem}>
                      ⏱  Avg session: {suggestions.avgSessionMinutes} min
                    </Text>
                  )}
                  {suggestions.squatFrequencyPerWeek && (
                    <Text style={s.suggestionItem}>
                      🦵  Squat: ~{suggestions.squatFrequencyPerWeek}x / week
                    </Text>
                  )}
                  {suggestions.benchFrequencyPerWeek && (
                    <Text style={s.suggestionItem}>
                      💪  Bench: ~{suggestions.benchFrequencyPerWeek}x / week
                    </Text>
                  )}
                  {suggestions.deadliftFrequencyPerWeek && (
                    <Text style={s.suggestionItem}>
                      🏋️  Deadlift: ~{suggestions.deadliftFrequencyPerWeek}x / week
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={s.suggestionApplyBtn} onPress={applyConstraintSuggestions}>
                  <Text style={s.suggestionApplyText}>{t('aiCoachExtendedSetup.applyFields')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Questions */}
            {visibleQuestions(section.questions).map((question) => (
              <View key={question.id} style={s.questionBlock}>
                <View style={s.questionLabelRow}>
                  <Text style={s.questionLabel}>{question.label}</Text>
                  {question.optional
                    ? <Text style={s.optional}>{t('aiCoachExtendedSetup.optional')}</Text>
                    : answers[question.id] === '__unknown__'
                      ? <Text style={s.answeredCheck}>✓</Text>
                      : !answers[question.id] && answers[question.id] !== false && answers[question.id] !== 0
                        ? <View style={s.requiredDot} />
                        : <Text style={s.answeredCheck}>✓</Text>
                  }
                </View>
                {question.subtitle && <Text style={s.questionSubtitle}>{question.subtitle}</Text>}
                {renderQuestion(question)}
              </View>
            ))}

            <View style={{ height: 120 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.footerMeta}>
          <Text style={s.footerStep}>{sectionIndex + 1} / {totalSections}</Text>
          <Text style={s.footerSectionName}>{section.title}</Text>
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={goNext} disabled={isSaving}>
          <Text style={s.nextBtnText}>
            {sectionIndex < totalSections - 1 ? t('aiCoachExtendedSetup.nextBtn') : isSaving ? t('aiCoachExtendedSetup.savingBtn') : editMode ? t('aiCoachExtendedSetup.saveChangesBtn') : t('aiCoachExtendedSetup.meetBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 32 },
  backIcon: { color: '#FFF', fontSize: 28 },
  progressTrack: { flex: 1, height: 3, backgroundColor: palette.gray[800], borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.brand[500], borderRadius: 2 },
  skipBtn: {},
  skipText: { color: palette.gray[500], fontSize: 13 },

  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  tab: { width: 36, height: 36, borderRadius: 10, backgroundColor: palette.gray[900], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.gray[800] },
  tabActive: { borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.1)' },
  tabIcon: { fontSize: 16 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  sectionIcon: { fontSize: 32, marginBottom: 6 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: palette.gray[500], lineHeight: 18, fontStyle: 'italic' },

  questionBlock: { marginBottom: 28 },
  questionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  questionLabel: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1 },
  questionSubtitle: { fontSize: 12, color: palette.gray[600], marginBottom: 10, fontStyle: 'italic' },
  optional: { color: palette.gray[600], fontSize: 11, fontStyle: 'italic' },
  requiredDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.brand[500] },
  answeredCheck: { color: palette.brand[400], fontSize: 13, fontWeight: '700' },

  textArea: { backgroundColor: palette.gray[900], borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14, borderWidth: 1, borderColor: palette.gray[700], minHeight: 80, textAlignVertical: 'top' },
  textAreaLarge: { minHeight: 200, fontSize: 13 },

  dontKnowBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.gray[600],
    alignSelf: 'flex-start',
  },
  dontKnowBtnActive: {
    borderColor: palette.brand[500],
    borderStyle: 'solid',
    backgroundColor: 'rgba(234,88,12,0.08)',
  },
  dontKnowText: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },
  dontKnowTextActive: { color: palette.brand[400] },

  footer: { padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: palette.gray[800], gap: 10 },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerStep: { color: palette.brand[500], fontSize: 13, fontWeight: '800' },
  footerSectionName: { color: palette.gray[500], fontSize: 13 },
  nextBtn: { backgroundColor: palette.brand[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  nextBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },

  suggestionCard: {
    backgroundColor: '#0f1a10', borderWidth: 1, borderColor: '#166534',
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  suggestionTitle: { fontSize: 13, fontWeight: '700', color: '#4ade80' },
  suggestionDismiss: { fontSize: 16, color: palette.gray[600] },
  suggestionRows: { gap: 6, marginBottom: 14 },
  suggestionItem: { fontSize: 13, color: palette.gray[300] },
  suggestionApplyBtn: {
    backgroundColor: '#166534', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  suggestionApplyText: { fontSize: 13, fontWeight: '700', color: '#4ade80' },
});
