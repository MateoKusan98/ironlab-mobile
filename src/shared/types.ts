export enum FitnessGoal {
  CUT = 'CUT',
  BULK = 'BULK',
  MAINGAIN = 'MAINGAIN',
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: TokenPair;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  dob: string | null;
  gender: string | null;
  weight: number | null;
  weightUnit: string | null;
  height: number | null;
  heightUnit: string | null;
  fitnessLevel: number | null;
  isSetupComplete: boolean;
  isNutritionSetupComplete: boolean;
  isAICoachSetupComplete: boolean;
  dietaryPreference: string | null;
  allergies: string[];
  snackingFrequency: number | null;
  dailyCalorieTarget: number | null;
  bodyFatPercentage: number | null;
  fitnessGoal: FitnessGoal | null;
  preferredLanguage: string | null;
  showRankBadge: boolean;
  createdAt: string;
  deletionScheduledAt: string | null;
}

export interface UpdateProfilePayload {
  name?: string;
  avatar?: string;
  dob?: string;
  gender?: string;
  weight?: number;
  weightUnit?: string;
  height?: number;
  heightUnit?: string;
  fitnessLevel?: number;
  isSetupComplete?: boolean;
  isNutritionSetupComplete?: boolean;
  dietaryPreference?: string;
  allergies?: string[];
  snackingFrequency?: number;
  dailyCalorieTarget?: number;
  bodyFatPercentage?: number;
  fitnessGoal?: FitnessGoal;
  preferredLanguage?: string;
  showRankBadge?: boolean;
}

export interface FoodLogResponse {
  id: string;
  userId: string;
  imageUrl: string | null;
  screenshotUrl: string | null;
  mealName: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  prepTime?: number;
  tags?: string[];
  ingredients?: { name: string; amount: string; unit?: string }[];
  fullInstructions?: { step: string; text: string }[];
  benefits?: string[];
  rating?: number;
  servings?: string;
  mealType: string;
  notes: string | null;
  date: string;
  createdAt: string;
}

export interface WorkoutPlanResponse {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  scheduledDate: string;
  exercises: WorkoutExerciseResponse[];
  createdAt: string;
}

export interface WorkoutExerciseResponse {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  order: number;
}

export interface WorkoutLogResponse {
  id: string;
  workoutPlanId: string;
  clientId: string;
  actualWeight: number | null;
  repsCompleted: number | null;
  techniqueRating: number | null;
  notes: string | null;
  mood: string | null;
  submittedAt: string;
}

export interface CoachNoteResponse {
  id: string;
  coachId: string;
  clientId: string;
  content: string;
  createdAt: string;
}

export interface ProgressPhotoResponse {
  id: string;
  userId: string;
  imageUrl: string;
  date: string;
  notes: string | null;
  createdAt: string;
  // body scan fields — present when photo was taken via body scanner
  bodyFatPercentage?: number | null;
  bodyWaterPercentage?: number | null;
  muscleMassKg?: number | null;
  leanMassKg?: number | null;
  bmr?: number | null;
  metabolicAge?: number | null;
  visceralFatLevel?: number | null;
}


/**
 * A value in a dynamically-built form (the AI-coach setup questionnaire and the
 * admin profile editor both render their fields from a config array, so the
 * state is keyed by string rather than a fixed shape).
 *
 * This is deliberately a closed union rather than `any`: it still allows any of
 * the shapes those forms actually hold, but a typo like `form[k].lenght` no
 * longer compiles.
 */
export type FormValue = string | number | boolean | string[] | null | undefined;

/** Bag of dynamic form values, keyed by field id. */
export type FormValues = Record<string, FormValue>;

/**
 * Narrowing helpers for `FormValue`.
 *
 * The dynamic forms read the same key as a string in one branch and a list in
 * another. `Array.isArray(form[k]) && form[k].includes(x)` does NOT narrow the
 * second read (it's a fresh index expression), so these pull the value out once
 * and hand back a concrete type.
 */
export const asStringList = (v: FormValue): string[] => (Array.isArray(v) ? v : []);

export const asText = (v: FormValue): string =>
  v == null || Array.isArray(v) ? '' : String(v);

export const asNumber = (v: FormValue): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

/** Tri-state boolean answer: true / false / null for "not answered". */
export const asTriState = (v: FormValue): boolean | null =>
  typeof v === 'boolean' ? v : null;

/** Text value, or null when unanswered (distinct from an empty answer). */
export const asOptionalText = (v: FormValue): string | null =>
  typeof v === 'string' ? v : null;

/**
 * Metadata attached to a community post. Which fields are present depends on
 * `postType` — a form-check post carries `exerciseName`, a workout post carries
 * volume/duration, a PR post carries the lift and weight.
 */
export interface PostMetadata {
  /** Form-check: the lift being reviewed. */
  exerciseName?: string;
  /** Workout share: free-text list of what was trained ("Squat, Bench"). */
  exercises?: string | null;
  /** Total tonnage in kg. */
  volume?: number | null;
  /** Session length in minutes. */
  duration?: number | null;
  prs?: number | null;
  /** PR share: the lift and what it beat. */
  weight?: number | null;
  previous?: number | null;
  /** Form-check: whether the attachment is a still or a clip. */
  mediaType?: 'image' | 'video';
  /** Form-check: every uploaded frame/clip (the post itself shows the first). */
  mediaUrls?: string[];
}

/** Body-composition estimate returned by the body-scan analyser. */
export interface BodyScanAnalysis {
  bodyFatPercentage?: number;
  leanMassKg?: number;
  fatMassKg?: number;
  muscleMassKg?: number;
  boneMassKg?: number;
  bodyWaterPercentage?: number;
  visceralFatLevel?: number;
  metabolicAge?: number;
  bmr?: number;
  calories?: number;
  macros?: { protein?: number; carbs?: number; fat?: number };
  goal?: string;
  leverages?: string;
  waterRetention?: string;
  explanation?: string;
}

/** A rep-count record: the heaviest weight moved for a given rep total. */
export interface RepPR {
  exerciseName: string;
  reps: string;
  maxWeight: string;
  achievedAt: string;
}

/** An exercise from the catalogue, used by the program builder's search. */
export interface ExerciseCatalogItem {
  id: string;
  name: string;
  targetMuscleGroup?: string;
  equipmentNeeded?: string | null;
}

/** Arbitrary structured context attached to a client error log. */
export type LogContext = Record<string, unknown>;
