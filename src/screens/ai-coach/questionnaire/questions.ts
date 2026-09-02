// Single definition of the AI-coach questionnaire — every section, question and
// option. Both surfaces that edit these answers read THIS file: the onboarding
// wizard (AICoachExtendedSetupScreen) and the per-section settings screen
// (AICoachSettingsScreen). Adding a question here makes it appear in both; a
// second copy would let the two screens disagree about what the coach knows.

import { AICoachProfileData } from '../../../services/ai-coach.service';
import { FormValue, FormValues, asNumber, asStringList, asText } from '@shared';

export type QuestionType = 'single' | 'multi' | 'number' | 'text' | 'slider' | 'bool' | 'longtext' | 'focus_slider' | 'comp_date';

export interface Option { value: string; label: string; icon?: string }
export interface Question {
  // Mostly profile fields, plus the pseudo-questions whose answers are owned by
  // dedicated endpoints rather than the profile DTO: the comp date
  // (/ai-coach/competition) and the offseason toggle (/ai-coach/block-intent).
  id: keyof AICoachProfileData | 'competitionDate' | 'competitionType' | 'blockIntent';
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
  showIf?: (answers: FormValues) => boolean;
}

export interface Section { id: string; title: string; icon: string; subtitle: string; questions: Question[] }

export type TFunction = (key: string) => string;

// Express (beginner) onboarding — the shortest path to a first program. We ask
// only what's needed to build a SAFE general plan; everything else gets a
// beginner default and the coach infers the rest from logged sessions. No
// hypertrophy-vs-strength choice here: beginners get a general get-in-shape
// block (trainingFocus defaults to 'hypertrophy' = moderate reps, volume, never
// tests a max) and we offer to pick a path after a few months of training.
export const EXPRESS_LAYOUT: { sectionId: string; questionIds: string[] }[] = [
  { sectionId: 'constraints', questionIds: ['trainingDays', 'equipmentAccess'] },
  { sectionId: 'recovery', questionIds: ['injuryHistory'] },
];

export const getSections = (t: TFunction): Section[] => [
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
      {
        id: 'competitionDate', label: t('aiCoachExtendedSetup.questionCompDate'),
        subtitle: t('aiCoachExtendedSetup.questionCompDateSubtitle'),
        type: 'comp_date', optional: true,
      },
      {
        id: 'blockIntent', label: t('aiCoachExtendedSetup.questionOffseason'),
        subtitle: t('aiCoachExtendedSetup.questionOffseasonSubtitle'),
        type: 'bool', optional: true,
        trueLabel: t('aiCoachExtendedSetup.optionOffseasonOn'),
        falseLabel: t('aiCoachExtendedSetup.optionOffseasonOff'),
      },
    ],
  },
  {
    id: 'history', title: t('aiCoachExtendedSetup.sectionHistoryTitle'), icon: '📚',
    subtitle: t('aiCoachExtendedSetup.sectionHistorySubtitle'),
    questions: [
      {
        id: 'experienceLevel', label: t('aiCoachExtendedSetup.questionExperienceLevel'),
        subtitle: t('aiCoachExtendedSetup.questionExperienceLevelSubtitle'), type: 'single',
        options: [
          { value: 'novice', label: t('aiCoachExtendedSetup.optionExperienceNovice'), icon: '🌱' },
          { value: 'beginner', label: t('aiCoachExtendedSetup.optionExperienceBeginner'), icon: '📗' },
          { value: 'intermediate', label: t('aiCoachExtendedSetup.optionExperienceIntermediate'), icon: '📘' },
          { value: 'advanced', label: t('aiCoachExtendedSetup.optionExperienceAdvanced'), icon: '🏆' },
        ],
      },
      {
        id: 'yearsTraining', label: t('aiCoachExtendedSetup.questionYearsTraining'), type: 'number',
        min: 0, max: 40, unit: 'years', placeholder: '3',
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
        id: 'minPlateKg', label: t('aiCoachExtendedSetup.questionMinPlate'),
        subtitle: t('aiCoachExtendedSetup.questionMinPlateSubtitle'), type: 'single',
        options: [
          { value: '0.25', label: t('aiCoachExtendedSetup.optionPlate025'), icon: '🟢' },
          { value: '0.5',  label: t('aiCoachExtendedSetup.optionPlate05'),  icon: '🔵' },
          { value: '1',    label: t('aiCoachExtendedSetup.optionPlate1'),   icon: '🟡' },
          { value: '1.25', label: t('aiCoachExtendedSetup.optionPlate125'), icon: '🟠' },
          { value: '2.5',  label: t('aiCoachExtendedSetup.optionPlate25'),  icon: '🔴' },
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

// ─── Shared answer helpers ───────────────────────────────────────────────────

/**
 * "I don't know" sentinel. Stored as a real answer so the form can tell
 * "deliberately unsure" apart from "not answered yet", but stripped before save —
 * a guess is worse than no value (see CLAUDE.md: say nothing rather than something thin).
 */
export const DONT_KNOW = '__unknown__';

/**
 * Pseudo-questions whose answers are NOT profile columns: the competition/PR date is
 * owned by the dedicated /ai-coach/competition endpoint (it re-anchors the periodization
 * block clock) and the profile DTO rejects both keys. They are asked here because that
 * is where the athlete expects to set a target date — they just save elsewhere.
 */
export const COMPETITION_KEYS = ['competitionDate', 'competitionType'];

/**
 * Every pseudo-question above — asked on the profile screens, saved through a dedicated
 * endpoint. buildProfilePatch filters these out because POST /ai-coach/profile rejects
 * them; each edit surface is responsible for routing its own.
 */
export const DEDICATED_ENDPOINT_KEYS = [...COMPETITION_KEYS, 'blockIntent'];

/**
 * Answers that must reach the DTO as numbers rather than the strings a TextInput
 * (or the getProfile projection) hands back. Shared so the wizard and the settings
 * screen coerce identically — a field sent as '2' by one screen and 2 by the other
 * is the same fact arriving in two shapes.
 */
export const NUMERIC_PROFILE_FIELDS = [
  'yearsTraining', 'squatMax', 'benchMax', 'deadliftMax',
  'avgSleepHours', 'jobStressLevel', 'weeklyCardioSessions', 'trainingDaysPerWeek',
  'sessionDurationMinutes', 'dailyProteinTarget', 'meetExperience',
  'squatFrequencyPerWeek', 'benchFrequencyPerWeek', 'deadliftFrequencyPerWeek', 'minPlateKg',
];

/**
 * Every field id the questionnaire owns, built once with an identity translator: a
 * question's id is the same in every language, so this Set is stable for the life of
 * the app. Anything that keys off "which fields does this form own" (the prefill
 * filter, the save whitelist) must use THIS rather than deriving a fresh Set from
 * getSections(t) — a Set rebuilt on every render silently re-fires any effect that
 * depends on it.
 */
export const QUESTION_KEYS: Set<string> = new Set(
  getSections((key) => key).flatMap((section) => section.questions.map((q) => String(q.id))),
);

/** Questions whose `showIf` gate is currently open. */
export const visibleQuestions = (questions: Question[], answers: FormValues): Question[] =>
  questions.filter((question) => !question.showIf || question.showIf(answers));

/** Has this question got a usable answer? ("I don't know" counts — it was answered.) */
export const isAnswered = (value: FormValue): boolean => {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
};

const FOCUS_TICK_KEYS: Record<string, string> = {
  hypertrophy: 'aiCoachSettings.focusTickHypertrophy',
  hypertrophy_leaning: 'aiCoachSettings.focusTickHypertrophyLeaning',
  powerbuilding: 'aiCoachSettings.focusTickPowerbuilding',
  strength_leaning: 'aiCoachSettings.focusTickStrengthLeaning',
  strength: 'aiCoachSettings.focusTickStrength',
};

/**
 * The saved answer rendered as the athlete would read it back — option labels, not
 * stored codes ('commercial_gym' means nothing on a settings row). Returns null when
 * there is nothing to show, so the caller renders "not set" rather than an empty string.
 */
export const summarizeAnswer = (question: Question, answers: FormValues, t: TFunction): string | null => {
  const value = answers[question.id];
  if (question.type === 'comp_date') {
    const date = answers.competitionDate;
    if (!date) return null;
    const typeLabel = answers.competitionType === 'pr_test'
      ? t('aiCoach.competition.prTest')
      : t('aiCoach.competition.meet');
    return `${typeLabel} · ${asText(date)}`;
  }
  if (value === DONT_KNOW) return t('aiCoachExtendedSetup.notSureYet');
  if (!isAnswered(value)) return null;

  const labelFor = (v: string) => question.options?.find((o) => o.value === v)?.label ?? v;

  switch (question.type) {
    case 'single':
      return labelFor(asText(value));
    case 'multi':
      return asStringList(value).map(labelFor).join(', ');
    case 'bool':
      return value === true
        ? (question.trueLabel ?? t('common.yes'))
        : (question.falseLabel ?? t('common.no'));
    case 'number':
      return question.unit ? `${asText(value)} ${question.unit}` : asText(value);
    case 'slider':
      return `${asText(value)} / ${question.max ?? 5}`;
    case 'focus_slider': {
      const key = FOCUS_TICK_KEYS[asText(value)];
      return key ? t(key) : asText(value);
    }
    default: {
      // Free text — one line only; the full answer is still there when the row opens.
      const text = asText(value).replace(/\s+/g, ' ').trim();
      return text.length > 60 ? `${text.slice(0, 60)}…` : text;
    }
  }
};

/**
 * A saved profile turned back into form answers. Both edit surfaces load through
 * here so a stored value is interpreted identically wherever it is shown.
 *
 * `competition` comes from the plan payload rather than the profile: the
 * competition/PR date is owned by the dedicated /ai-coach/competition endpoint
 * (it re-anchors the periodization block clock) and the profile DTO rejects it.
 */
export const hydrateAnswers = (
  profile: FormValues | null,
  competition: { competitionDate?: string | null; competitionType?: string | null; blockIntent?: string | null } | null,
  editableKeys: Set<string>,
): FormValues => {
  const loaded: FormValues = {};
  Object.entries(profile ?? {}).forEach(([key, value]) => {
    if (!editableKeys.has(key)) return; // skip id/userId/timestamps/internal columns
    if (value !== null && value !== undefined && value !== '') loaded[key] = value as FormValue;
  });
  // minPlateKg is a single-select whose option values are canonical strings
  // ('0.5', '1', '2.5'). The backend stores it as a DECIMAL, which reads back
  // padded ('0.50', '1.00', '2.50'), so normalise through Number → String to
  // match an option and highlight the saved choice on the edit screen.
  if (loaded.minPlateKg != null) loaded.minPlateKg = String(Number(loaded.minPlateKg));
  if (competition?.competitionDate) {
    loaded.competitionDate = String(competition.competitionDate).split('T')[0];
    loaded.competitionType = competition.competitionType === 'pr_test' ? 'pr_test' : 'meet';
  }
  // Set whenever the plan payload arrived at all: this is a bool, and leaving it
  // absent renders the toggle as unset rather than as the OFF state it actually is.
  // Omitted when the payload is missing (the getPlan call failed) — guessing OFF there
  // would show an offseason athlete the wrong switch position.
  if (competition) loaded.blockIntent = competition.blockIntent === 'offseason';
  return loaded;
};

/**
 * Are these two stored values the same fact? Deliberately loose about shape, because
 * the same answer legitimately arrives in two forms: the profile projection serialises
 * every number as a string ('3'), while a slider or number field writes a real number.
 * A strict compare would mark an untouched question as edited.
 */
export const isSameAnswer = (key: string, a: FormValue, b: FormValue): boolean => {
  const canon = (v: FormValue): FormValue => {
    if (!isAnswered(v)) return null; // '' / [] / null / undefined are all "no answer"
    if (NUMERIC_PROFILE_FIELDS.includes(key)) return asNumber(v) ?? v;
    return v;
  };
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
};

/** Keys whose answer differs from what the server last gave us. */
export const changedKeys = (saved: FormValues, current: FormValues): string[] =>
  [...new Set([...Object.keys(saved), ...Object.keys(current)])]
    .filter((key) => !isSameAnswer(key, saved[key], current[key]));

/**
 * The profile payload for a partial save: ONLY what changed.
 *
 * POST /ai-coach/profile Object.assign's the DTO onto the existing row, so an absent
 * key keeps its stored value — which is what makes editing one setting safe, and also
 * why a cleared answer must be sent as an explicit `null` rather than omitted. A
 * withdrawn answer ("I don't know") clears too: leaving the old value would let the
 * coach keep programming off a fact the athlete just retracted.
 *
 * DEDICATED_ENDPOINT_KEYS are excluded — they belong to /ai-coach/competition and
 * /ai-coach/block-intent, and the profile DTO rejects them.
 */
export const buildProfilePatch = (
  keys: string[],
  answers: FormValues,
  editableKeys: Set<string>,
): FormValues => {
  const patch: FormValues = {};
  keys
    .filter((key) => editableKeys.has(key) && !DEDICATED_ENDPOINT_KEYS.includes(key))
    .forEach((key) => {
      const value = answers[key];
      if (!isAnswered(value) || value === DONT_KNOW) {
        patch[key] = null;
        return;
      }
      patch[key] = NUMERIC_PROFILE_FIELDS.includes(key)
        ? (typeof value === 'number' ? value : asNumber(value) ?? null)
        : value;
    });
  return patch;
};
