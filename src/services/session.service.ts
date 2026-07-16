import { api } from './api';

export interface PRResult {
  type: string;
  label: string;
  value: number;
  previous: number | null;
  // 'pr' = crossed your estimated 1RM; 'mini' = rep-count record only.
  tier: 'pr' | 'mini';
  e1rm?: number;
  prevE1rm?: number | null;
}

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseName: string;
  exerciseOrder: number;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetRpe: number | null;
  repsCompleted: number | null;
  weightUsed: number | null;
  rpe: number | null;
  isCompleted: boolean;
  isPR: boolean;
  techniqueNotes: string | null;
  loggedAt: string;
  prs?: PRResult[];
}

export interface WorkoutSession {
  id: string;
  clientId: string;
  status: 'in_progress' | 'completed';
  date: string;
  startedAt: string;
  completedAt: string | null;
  bodyweight: number | null;
  sleepHours: number | null;
  energyLevel: number | null;
  mood: string | null;
  notes: string | null;
  durationMinutes: number | null;
  sessionType: 'strength' | 'cardio';
  cardioType: string | null;
  cardioCaloriesBurned: number | null;
  cardioDistanceKm: number | null;
  cardioAvgHeartRate: number | null;
  sets: SessionSet[];
}

export interface LogCardioInput {
  date: string;
  cardioType: string;
  durationMinutes: number;
  cardioCaloriesBurned?: number;
  cardioDistanceKm?: number;
  cardioAvgHeartRate?: number;
  cardioSpeedKmh?: number;
  cardioInclinePercent?: number;
  notes?: string;
}

export interface CreateSessionInput {
  date: string;
  bodyweight?: number;
  sleepHours?: number;
  energyLevel?: number;
  mood?: string;
}

export interface AddSetInput {
  exerciseName: string;
  exerciseOrder: number;
  setNumber: number;
  targetReps?: number;
  targetWeight?: number;
  targetRpe?: number;
  repsCompleted?: number;
  weightUsed?: number;
  rpe?: number;
  isCompleted?: boolean;
  techniqueNotes?: string;
}

export interface ExerciseSummary {
  name: string;
  bestWeight: number;
  bestReps: number;
  previousBestWeight: number | null;
  previousDate: string | null;
  deltaKg: number | null;
  isPR: boolean;
  order: number;
}

export interface TodaySummary {
  date: string;
  strength: {
    sessionCount: number;
    totalVolumeKg: number;
    totalSets: number;
    durationMinutes: number | null;
    prsCount: number;
    mood: string | null;
    energyLevel: number | null;
    exercises: ExerciseSummary[];
  } | null;
  cardio: {
    cardioType: string;
    durationMinutes: number | null;
    distanceKm: number | null;
    caloriesBurned: number | null;
    avgHeartRate: number | null;
  }[];
}

export interface MainLiftData {
  est1RM: number;
  weight: number;
  reps: number;
  achievedAt: string | null;
}

export interface MuscleGroup {
  name: string;
  volumeKg: number;
  sets: number;
  percentage: number;
}

export interface TopExercise {
  name: string;
  totalSets: number;
  totalVolume: number;
  bestWeight: number;
  best1RM: number;
  muscleGroup: string;
}

export interface ExerciseProgression {
  name: string;
  points: { date: string; estimated1RM: number }[];
}

export interface WeeklyVolume {
  label: string;
  volumeKg: number;
  sessions: number;
}

export interface MuscleLandmark {
  name: string;
  weeklySets: number;
  mev: number;
  mav: number;
  mrv: number;
  status: 'under' | 'optimal' | 'high' | 'overreaching';
}

export interface PRTimelineEntry {
  exerciseName: string;
  muscleGroup: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
  tier: 'pr' | 'mini';
}

export interface RepMaxRecord {
  exerciseName: string;
  muscleGroup: string;
  maxes: { reps: number; weight: number; e1rm: number }[];
}

export interface StrengthLift {
  e1RM: number;
  ratio: number;
  level: string;
  nextLevel: string | null;
  progressToNext: number;
}

export interface StrengthStandards {
  available: boolean;
  bodyweightKg: number | null;
  gender: 'male' | 'female';
  lifts: { squat?: StrengthLift | null; benchPress?: StrengthLift | null; deadlift?: StrengthLift | null };
  total: number | null;
  totalRatio?: number;
  dots: number | null;
}

export interface BodyCompositionPoint {
  date: string;
  bodyFatPercentage: number | null;
  muscleMassKg: number | null;
  leanMassKg: number | null;
  visceralFatLevel: number | null;
}

export interface MilestoneLadder {
  value: number;
  achievedCount: number;
  next: number | null;
}

export interface AthleteStats {
  overview: {
    totalSessions: number;
    totalVolumeKg: number;
    totalReps: number;
    totalSets: number;
    currentWeekStreak: number;
    longestWeekStreak: number;
    prsThisMonth: number;
    truePrsThisMonth: number;
    miniPrsThisMonth: number;
    avgSessionDurationMinutes: number | null;
    firstSessionDate: string | null;
    sessionsLast30Days: number;
    sessionsLast7Days: number;
  };
  mainLifts: {
    squat: MainLiftData | null;
    benchPress: MainLiftData | null;
    deadlift: MainLiftData | null;
  };
  weeklyVolume: WeeklyVolume[];
  muscleGroups: MuscleGroup[];
  muscleLandmarks: MuscleLandmark[];
  topExercises: TopExercise[];
  exerciseProgression: ExerciseProgression[];
  records: {
    truePrCount: number;
    miniPrCount: number;
    recentPRs: PRTimelineEntry[];
    repMaxRecords: RepMaxRecord[];
  };
  consistency: {
    heatmap: { date: string; sessions: number; volumeKg: number }[];
    longestWeekStreak: number;
    totalTrainingDays: number;
    dayOfWeekCounts: number[];
    avgSessionsPerWeek: number;
  };
  intensity: {
    avgRpe: number | null;
    trend: { label: string; avgRpe: number | null; avgIntensityPct: number | null }[];
  };
  density: {
    avgRestSeconds: number | null;
    avgDensityKgPerMin: number | null;
    avgSetsPerSession: number;
  };
  strengthStandards: StrengthStandards;
  bodyComposition: {
    series: BodyCompositionPoint[];
    first: BodyCompositionPoint | null;
    latest: BodyCompositionPoint | null;
  };
  cardio: {
    totalSessions: number;
    totalMinutes: number;
    totalDistanceKm: number;
    totalCalories: number;
    avgHeartRate: number | null;
    recent: { date: string; type: string | null; minutes: number | null; distanceKm: number | null; calories: number | null; avgHeartRate: number | null }[];
  };
  milestones: {
    volume: MilestoneLadder;
    sessions: MilestoneLadder;
    reps: MilestoneLadder;
    sets: MilestoneLadder;
    prs: MilestoneLadder;
  };
  wellbeing: {
    avgEnergyLevel: number | null;
    avgSleepHours: number | null;
    moodDistribution: Record<string, number>;
    sessionsLast30Days: number;
    sessionsLast7Days: number;
  };
  bodyweight: { date: string; weight: number }[];
}

export const sessionService = {
  createSession: async (input: CreateSessionInput): Promise<WorkoutSession> => {
    const { data } = await api.post<{ data: WorkoutSession }>('/sessions', input);
    return data.data;
  },

  getLastReadiness: async (): Promise<{ lastBodyweight: number | null; avgSleepHours: number | null }> => {
    const { data } = await api.get<{ data: { lastBodyweight: number | null; avgSleepHours: number | null } }>('/sessions/last-readiness');
    return data.data;
  },

  getSessions: async (limit = 20): Promise<WorkoutSession[]> => {
    const { data } = await api.get<{ data: WorkoutSession[] }>(`/sessions?limit=${limit}`);
    return data.data;
  },

  getSession: async (id: string): Promise<WorkoutSession> => {
    const { data } = await api.get<{ data: WorkoutSession }>(`/sessions/${id}`);
    return data.data;
  },

  getActiveSession: async (): Promise<WorkoutSession | null> => {
    const { data } = await api.get<{ data: WorkoutSession | null }>('/sessions/active');
    return data.data;
  },

  addSet: async (sessionId: string, input: AddSetInput): Promise<SessionSet> => {
    const { data } = await api.post<{ data: SessionSet }>(`/sessions/${sessionId}/sets`, input);
    return data.data;
  },

  updateSet: async (setId: string, input: Partial<AddSetInput>): Promise<SessionSet> => {
    const { data } = await api.patch<{ data: SessionSet }>(`/sessions/sets/${setId}`, input);
    return data.data;
  },

  deleteSet: async (setId: string): Promise<void> => {
    await api.delete(`/sessions/sets/${setId}`);
  },

  completeSession: async (
    sessionId: string,
    input: { notes?: string; mood?: string; energyLevel?: number; durationMinutes?: number },
  ): Promise<WorkoutSession & { pointsEarned: number }> => {
    const { data } = await api.patch<{ data: WorkoutSession & { pointsEarned: number } }>(
      `/sessions/${sessionId}/complete`,
      input,
    );
    return data.data;
  },

  getPRs: async (): Promise<{ repPRs: any[] }> => {
    const { data } = await api.get<{ data: { repPRs: any[] } }>('/sessions/prs');
    return data.data;
  },

  cancelSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}`);
  },

  getStats: async (): Promise<AthleteStats> => {
    const { data } = await api.get<{ data: AthleteStats }>('/sessions/stats');
    return data.data;
  },

  logCardio: async (input: LogCardioInput): Promise<WorkoutSession> => {
    const { data } = await api.post<{ data: WorkoutSession }>('/sessions/cardio', input);
    return data.data;
  },

  getCardioSessions: async (limit = 20): Promise<WorkoutSession[]> => {
    const { data } = await api.get<{ data: WorkoutSession[] }>(`/sessions/cardio?limit=${limit}`);
    return data.data;
  },

  getTodaySummary: async (date: string): Promise<TodaySummary> => {
    const { data } = await api.get<{ data: TodaySummary }>(`/sessions/today-summary?date=${date}`);
    return data.data;
  },
};
