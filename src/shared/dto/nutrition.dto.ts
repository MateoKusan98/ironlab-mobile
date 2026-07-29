import { MealType } from '../enums';

export interface CreateFoodLogDto {
  mealType: MealType;
  calories?: number;
  notes?: string;
  date: string;
}

// ── API response shapes ──────────────────────────────────────────────────────
// These mirror what the backend actually returns for each nutrition endpoint.
// They replace the `any` the service layer used to hand back, which meant a
// typo in a field name (`summary.macroSpilt`) compiled cleanly and rendered
// `undefined` at runtime.

/** A saved meal the athlete can re-log in one tap. */
export interface MyMeal {
  id: string;
  name: string;
  image: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
}

/** One ingredient parsed out of pasted free text by the LLM. */
export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ParseIngredientsResult {
  mealName: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  ingredients: ParsedIngredient[];
}

/** A calories + macros tuple, used for both today's totals and the targets. */
export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Aggregated intake over a period, for the nutrition dashboard. */
export interface NutritionSummary {
  today?: MacroTotals;
  targets?: MacroTotals;
  /** Calories eaten minus target; positive is a surplus. */
  netBalance?: number;
  /** 0–100 adherence score shown on the dashboard. */
  score?: number;
  /** One-line coaching note generated from the period's logs. */
  insight?: string;
  /** Calories burned by cardio sessions logged today (backend sums them in). */
  cardioCaloriesBurned?: number;
  avgCalories?: number;
  avgProtein?: number;
  bestCalories?: number;
  bestProtein?: number;
  loggedDays?: number;
  /** Share of logged days that hit the protein target, 0–1. */
  proteinHitRate?: number;
  macroSplit?: { protein: number; carbs: number; fat: number };
  mealTypeBreakdown?: Record<string, number>;
  streak?: number;
}

/** One day in the logging calendar. */
export interface CalendarDay {
  date: string;
  calories?: number;
  logged?: boolean;
  /** True when the day's intake landed inside the target band. */
  isGoalMet?: boolean;
}

/**
 * A hit from the USDA food-database search. Field names are the USDA's own
 * (`fdcId`, `description`) — the backend passes them through unchanged.
 */
export interface IngredientSearchResult {
  fdcId: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  brand?: string;
}

/**
 * Energy expenditure. `breakdown` carries the inputs the estimate was derived
 * from (weight, height, age, trainingDaysPerWeek …) and stays loosely typed
 * because the backend evolves it independently — `unknown` forces callers to
 * check a value before using it, which is what the one consumer already does.
 */
export interface TdeeResult {
  tdee: number;
  bmr: number;
  activityLevel: string;
  breakdown: Record<string, unknown>;
}

/** What `POST /nutrition/targets` returns: the TDEE plus the resolved plan. */
export interface ComputedTargets {
  tdee: number;
  bmr: number;
  activityLevel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
}

export interface WeightLogEntry {
  id: string;
  weight: number;
  unit?: string;
  date: string;
  notes?: string;
}

/** One recorded change to the athlete's calorie target. */
export interface CalorieAdjustment {
  date: string;
  fromCalories: number;
  toCalories: number;
  reason: string;
  weightTrendKgPerWeek: number;
}

/** Rolling calorie-target adaptation driven by the observed weight trend. */
export interface CalorieAdaptation {
  currentTarget: number;
  tdeeEstimate: number | null;
  lastAdjustedAt: string | null;
  history: CalorieAdjustment[];
}
