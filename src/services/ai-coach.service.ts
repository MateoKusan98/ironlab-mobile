import { api } from './api';

// LLM session generation runs a reasoning model server-side and routinely takes
// far longer than the api client's default 15s timeout — without this override
// the mobile client aborts with a timeout error while the backend completes and
// saves the plan (the user then sees an error on a session that did generate).
const PLAN_GEN_TIMEOUT_MS = 120000;

export interface NextSessionExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rpe?: number;
  weightPerc?: number;
  cue?: string;
}

export interface NextSession {
  focus: string;
  exercises: NextSessionExercise[];
  /** 3-sentence coach rationale: key insight, why this load/focus, what to watch. */
  coachsCall?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachPreferences {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  duration: number;
  intensity: number;
}

export type PathTier = 'novice' | 'beginner' | 'intermediate' | 'advanced';
export type PathBranchId = 'muscle' | 'powerbuilding' | 'strength';
export type PathNodeState = 'completed' | 'current' | 'available' | 'locked';

export interface PathTierNode {
  tier: PathTier;
  label: string;
  state: PathNodeState;
}

export interface PathBranch {
  id: PathBranchId;
  label: string;
  icon: string;
  isCurrent: boolean;
  tiers: PathTierNode[];
}

export interface PathMilestone {
  id: string;
  label: string;
  description: string;
  icon: string;
  kind: 'consistency' | 'strength';
  achieved: boolean;
  progress: number;
  current: number;
  target: number;
  unit: string;
}

export interface PathTree {
  currentBranchId: PathBranchId;
  currentTier: PathTier;
  foundation: PathNodeState;
  branches: PathBranch[];
  milestones: PathMilestone[];
  nextMilestones: PathMilestone[];
}

export interface AICoachProfileData {
  primaryGoal?: string;
  specificGoal?: string;
  timeline?: string;
  priorityHierarchy?: string;
  successMetrics?: string;
  yearsTraining?: number;
  experienceLevel?: 'novice' | 'beginner' | 'intermediate' | 'advanced';
  bestSystems?: string[];
  failedSystems?: string[];
  adaptationSpeed?: string;
  squatMax?: number;
  benchMax?: number;
  deadliftMax?: number;
  squatERM?: number;
  benchERM?: number;
  deadliftERM?: number;
  prTrend?: string;
  squatWeakPoint?: string;
  benchWeakPoint?: string;
  deadliftWeakPoint?: string;
  mobilityLimitations?: string[];
  preferredSquatStance?: string;
  avgSleepHours?: number;
  sleepQuality?: string;
  jobStressLevel?: number;
  physicalLabor?: boolean;
  weeklyCardioSessions?: number;
  otherSports?: string[];
  otherSportsFrequency?: string;
  injuryHistory?: string;
  recoverySpeed?: string;
  trainingDaysPerWeek?: number;
  trainingDays?: string[];
  sessionDurationMinutes?: number;
  equipmentAccess?: string;
  minPlateKg?: number; // smallest plate per side (kg): 0.25 | 0.5 | 1 | 1.25 | 2.5
  responseType?: string;
  deadliftRecoveryCost?: string;
  painfulExercises?: string;
  preferredExercises?: string;
  currentPhase?: string;
  dailyProteinTarget?: number;
  weightClassTarget?: string;
  prefersStructure?: boolean;
  missedLiftResponse?: string;
  overshootsEffort?: boolean;
  motivationConsistency?: string;
  trackingHabits?: string[];
  preferredPeakingStyle?: string;
  meetExperience?: number;
  deloadResponse?: string;
  taperSensitivity?: string;
  historicalWorkoutData?: string;
  squatFrequencyPerWeek?: number;
  benchFrequencyPerWeek?: number;
  deadliftFrequencyPerWeek?: number;
  nutritionTrackingEnabled?: boolean;
  trainingFocus?: string; // 'hypertrophy' | 'powerbuilding' | 'strength'
  preferredIntensity?: number; // 1=Easy 2=Light 3=Moderate 4=Hard 5=Max
}

export interface RecoveryWeekStatus {
  mode: 'recovery' | 'vacation';
  until: string; // YYYY-MM-DD — the day hard training resumes
  resumeWeek: number | null; // phase week that replays on return (null in comp prep)
}

export const aiCoachService = {
  chat: async (
    message: string,
    history: ChatMessage[],
    preferences?: CoachPreferences,
  ): Promise<string> => {
    const { data } = await api.post<{ data: { reply: string } }>('/ai-coach/chat', {
      message,
      history,
      preferences,
    });
    return data.data.reply;
  },

  saveProfile: async (profileData: AICoachProfileData): Promise<void> => {
    await api.post('/ai-coach/profile', profileData);
  },

  getProfile: async (): Promise<AICoachProfileData | null> => {
    const { data } = await api.get<{ data: AICoachProfileData | null }>('/ai-coach/profile');
    return data.data;
  },

  generatePlan: async (readiness?: { mood?: string; energyLevel?: number; sleepHours?: number }, note?: string, makeUp?: boolean, skipNext?: boolean, fatigueDecision?: 'accept' | 'dismiss'): Promise<string> => {
    const { data } = await api.post<{ data: { plan: string } }>('/ai-coach/generate-plan', { ...readiness ?? {}, ...(note ? { note } : {}), ...(makeUp ? { makeUp: true } : {}), ...(skipNext ? { skipNext: true } : {}), ...(fatigueDecision ? { fatigueDecision } : {}) }, { timeout: PLAN_GEN_TIMEOUT_MS });
    return data.data.plan;
  },

  /**
   * Cheap, LLM-free readiness gate. Call after the readiness check and before
   * generatePlan: if `requiresAck`, surface `reasons` and let the athlete choose
   * recovery ('accept') or "I feel fine" ('dismiss'), then pass that into generatePlan.
   */
  fatigueCheck: async (): Promise<{ requiresAck: boolean; level: 'none' | 'mild' | 'elevated' | 'high'; reasons: string[] }> => {
    const { data } = await api.get<{ data: { requiresAck: boolean; level: 'none' | 'mild' | 'elevated' | 'high'; reasons: string[] } }>('/ai-coach/fatigue-check');
    return data.data;
  },

  /** Fire-and-forget: runs full intelligence analysis then generates next plan */
  postSession: async (sessionId: string): Promise<void> => {
    await api.post(`/ai-coach/post-session/${sessionId}`);
  },

  // `language` is the English name of the target language (e.g. "Bosnian"),
  // matching LANGUAGES[].aiName so the backend can instruct the model directly.
  generateShareCaption: async (
    sessionId: string,
    language: string,
    overrides?: { notes?: string; mood?: string },
  ): Promise<{ hype: string; clean: string; funny: string }> => {
    const { data } = await api.post<{ data: { hype: string; clean: string; funny: string } }>(
      `/ai-coach/share-caption/${sessionId}`,
      { language, ...overrides },
    );
    return data.data;
  },

  getDebugPrompt: async (): Promise<{ systemPrompt: string; userMessage: string; layers: Record<string, string | null> }> => {
    const { data } = await api.get<{ data: { systemPrompt: string; userMessage: string; layers: Record<string, string | null> } }>('/ai-coach/debug-prompt');
    return data.data;
  },

  getPlan: async (): Promise<{
    plan: string | null;
    generatedAt: string | null;
    nextSessionJson: NextSession | null;
    trainingDays: string[] | null;
    competitionDate: string | null;
    competitionType: string | null;
    injuryHandling: string | null;
    activeInjuries: Array<{ id: string; exerciseName: string | null; description: string }>;
    trainingWeek: number | null;
    sessionInWeek: number | null;
    sessionsPerCycle: number | null;
    missedSession: { day: string; lifts: string[] } | null;
    catchUpRecommendation: 'make_up' | 'skip' | null;
    nextScheduledDay: string | null;
    skipAheadDay: string | null;
    completedToday: boolean;
    recoveryWeek: RecoveryWeekStatus | null;
  }> => {
    const { data } = await api.get<{ data: {
      plan: string | null;
      generatedAt: string | null;
      nextSessionJson: NextSession | null;
      trainingDays: string[] | null;
      competitionDate: string | null;
      competitionType: string | null;
      injuryHandling: string | null;
      activeInjuries: Array<{ id: string; exerciseName: string | null; description: string }>;
      trainingWeek: number | null;
      sessionInWeek: number | null;
      sessionsPerCycle: number | null;
      missedSession: { day: string; lifts: string[] } | null;
      catchUpRecommendation: 'make_up' | 'skip' | null;
      nextScheduledDay: string | null;
      skipAheadDay: string | null;
      completedToday: boolean;
      recoveryWeek: RecoveryWeekStatus | null;
    } }>('/ai-coach/plan');
    return data.data;
  },

  /**
   * "Life fell apart" reset. 'recovery' turns the rest of this week into light deload
   * sessions and replays the interrupted phase week from Monday; 'vacation' pauses the
   * plan for `days` days (no logging expected, no make-up debt) and replays on return.
   */
  triggerRecoveryWeek: async (mode: 'recovery' | 'vacation', days?: number): Promise<{
    until: string;
    resumePhase: string;
    resumeWeek: number | null;
    mode: 'recovery' | 'vacation';
    compCountdownContinues: boolean;
  }> => {
    const { data } = await api.post<{ data: { until: string; resumePhase: string; resumeWeek: number | null; mode: 'recovery' | 'vacation'; compCountdownContinues: boolean } }>(
      '/ai-coach/recovery-week',
      { mode, ...(days ? { days } : {}) },
    );
    return data.data;
  },

  cancelRecoveryWeek: async (): Promise<void> => {
    await api.delete('/ai-coach/recovery-week');
  },

  getPathTree: async (): Promise<PathTree> => {
    const { data } = await api.get<{ data: PathTree }>('/ai-coach/path-tree');
    return data.data;
  },

  setInjuryPreference: async (handling: 'replace' | 'remove' | 'reduce'): Promise<void> => {
    await api.post('/ai-coach/injury-preference', { handling });
  },

  getSuggestedConstraints: async (): Promise<{
    trainingDays: string[] | null;
    sessionsPerWeek: number | null;
    avgSessionMinutes: number | null;
    squatFrequencyPerWeek: number | null;
    benchFrequencyPerWeek: number | null;
    deadliftFrequencyPerWeek: number | null;
    sessionCount: number;
  } | null> => {
    try {
      const { data } = await api.get<{ data: any }>('/ai-coach/suggested-constraints');
      return data.data;
    } catch {
      return null;
    }
  },

  saveTrainingDays: async (days: string[]): Promise<void> => {
    await api.post('/ai-coach/profile', { trainingDays: days });
  },

  setCompetitionDate: async (date: string, type: 'meet' | 'pr_test'): Promise<void> => {
    await api.post('/ai-coach/competition', { date, type });
  },

  clearCompetitionDate: async (): Promise<void> => {
    await api.delete('/ai-coach/competition');
  },

  getNutritionAdvice: async (): Promise<{ advice: string; generatedAt: string | null }> => {
    const { data } = await api.get<{ data: { advice: string; generatedAt: string | null } }>('/ai-coach/nutrition-advice');
    return data.data;
  },

  setNutritionTracking: async (enabled: boolean): Promise<void> => {
    await api.post('/ai-coach/profile', { nutritionTrackingEnabled: enabled });
  },
};

// ── Admin Lab API ──────────────────────────────────────────────────────────

export interface AdminUserEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  hasAIProfile: boolean;
  totalSessions: number;
}

export interface AdminUserState {
  userId: string;
  phase: string | null;
  weekInPhase: number;
  totalWeeks: number;
  phaseStartedAt: string | null;
  extensionWeeks: number;
  cycleSlot: number;
  totalSessions: number;
  testCycleSlotOffset: number;
  fatigueOverride: string | null;
  fatigueReal: string;
  fatigueEvidence: string[];
  memoryLength: number;
  memoryArchiveLength: number;
  activeNotesCount: number;
  exerciseIntelCount: number;
  planRateLimitCount: number;
  planRateLimitMax: number;
  trainingDays: string[] | null;
  squatFreq: number | null;
  benchFreq: number | null;
  deadliftFreq: number | null;
  nextSessionJson: any;
  planGeneratedAt: string | null;
}

export const adminAiService = {
  getUsers: async (): Promise<AdminUserEntry[]> => {
    const { data } = await api.get<{ data: AdminUserEntry[] }>('/ai-coach/admin/lab/users');
    return data.data;
  },

  getState: async (userId: string): Promise<AdminUserState> => {
    const { data } = await api.get<{ data: AdminUserState }>(`/ai-coach/admin/lab/${userId}/state`);
    return data.data;
  },

  setPhase: async (userId: string, phase: string, weeksIntoPhase: number): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/set-phase`, { phase, weeksIntoPhase });
  },

  setCycleSlot: async (userId: string, offset: number): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/set-cycle-slot`, { offset });
  },

  setFatigue: async (userId: string, level: string | null): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/set-fatigue`, { level });
  },

  resetRateLimit: async (userId: string): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/reset-rate-limit`, {});
  },

  forceGeneratePlan: async (userId: string): Promise<string> => {
    const { data } = await api.post<{ data: { plan: string } }>(`/ai-coach/admin/lab/${userId}/force-generate-plan`, {}, { timeout: PLAN_GEN_TIMEOUT_MS });
    return data.data.plan;
  },

  clearMemory: async (userId: string, clearNotes: boolean, clearExerciseIntel: boolean): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/clear-memory`, { clearNotes, clearExerciseIntel });
  },
  clearSessions: async (userId: string): Promise<{ deletedSessions: number }> => {
    const { data } = await api.post<{ data: { deletedSessions: number } }>(`/ai-coach/admin/lab/${userId}/clear-sessions`, {});
    return data.data;
  },

  resetProfile: async (userId: string): Promise<{ deletedSessions: number }> => {
    const { data } = await api.post<{ data: { deletedSessions: number } }>(`/ai-coach/admin/lab/${userId}/reset-profile`, {});
    return data.data;
  },

  setErm: async (userId: string, updates: {
    squatERM?: number; benchERM?: number; deadliftERM?: number;
    squatMax?: number; benchMax?: number; deadliftMax?: number;
  }): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/set-erm`, updates);
  },

  getDebugPrompt: async (userId: string): Promise<{ systemPrompt: string; userMessage: string; layers: Record<string, string | null> }> => {
    const { data } = await api.get<{ data: { systemPrompt: string; userMessage: string; layers: Record<string, string | null> } }>(`/ai-coach/admin/lab/${userId}/debug-prompt`);
    return data.data;
  },

  // The editable source profile behind the context message. Numeric columns are
  // returned as strings (see backend getProfile projection), arrays/booleans as-is.
  getProfile: async (userId: string): Promise<Record<string, any> | null> => {
    const { data } = await api.get<{ data: Record<string, any> | null }>(`/ai-coach/admin/lab/${userId}/profile`);
    return data.data;
  },

  saveProfile: async (userId: string, updates: Record<string, any>): Promise<void> => {
    await api.post(`/ai-coach/admin/lab/${userId}/profile`, updates);
  },
};
