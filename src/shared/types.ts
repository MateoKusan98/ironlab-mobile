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
