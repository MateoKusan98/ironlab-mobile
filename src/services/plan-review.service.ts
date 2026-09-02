import { api } from './api';
import { NextSession } from './ai-coach.service';

export type PlanReviewStatus = 'pending' | 'approved' | 'auto_approved' | 'rejected' | 'superseded';

/** A row in the coach's queue — enough to triage, not enough to judge. */
export interface PlanReviewSummary {
  id: string;
  athleteId: string;
  athleteName: string | null;
  status: PlanReviewStatus;
  targetDate: string;
  focus: string | null;
  exerciseCount: number;
  /** True once the coach has changed the session the AI drafted. */
  edited: boolean;
  autoApproveAt: string | null;
  createdAt: string;
}

/** What the athlete reported for the day this session was drafted from. */
export interface PlanReviewCheckIn {
  date: string;
  submitted: boolean;
  sleepHours: number | null;
  sleepQuality: number | null;
  energyLevel: number | null;
  mood: string | null;
  sorenessLevel: number | null;
  sorenessAreas: string[] | null;
  stressLevel: number | null;
  note: string | null;
  totals: { calories: number; protein: number; carbs: number; fat: number } | null;
  meals: { id: string; mealName: string | null; calories: number | null }[];
}

export interface PlanReviewDetail {
  id: string;
  status: PlanReviewStatus;
  targetDate: string;
  athlete: { id: string; name: string; email: string } | null;
  /** What ships if approved now — the coach's edit if there is one, else the AI draft. */
  session: { plan: string; json: NextSession | null; loadBasis: unknown };
  /** The untouched AI draft, present only once an edit exists, so the two can be compared. */
  original: { plan: string; json: NextSession | null } | null;
  coachNote: string | null;
  checkIn: PlanReviewCheckIn | null;
  autoApproveAt: string | null;
  reviewedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface EditExercisePayload {
  name: string;
  sets: number;
  reps: number;
  /** 0 means bodyweight. */
  weight: number;
  rpe?: number;
  cue?: string;
}

export const planReviewService = {
  list: async (status: PlanReviewStatus = 'pending'): Promise<PlanReviewSummary[]> => {
    const { data } = await api.get<{ data: PlanReviewSummary[] }>('/coach/plan-reviews', { params: { status } });
    return data.data;
  },

  detail: async (id: string): Promise<PlanReviewDetail> => {
    const { data } = await api.get<{ data: PlanReviewDetail }>(`/coach/plan-reviews/${id}`);
    return data.data;
  },

  /**
   * Saves the coach's version of the session. Sends the FULL exercise list, not a patch —
   * the server treats what it receives as the whole session and re-derives the plan text
   * from it, so anything omitted here is genuinely removed.
   *
   * `violations` come back as advisory warnings, not errors: the save has already
   * happened when they arrive.
   */
  edit: async (
    id: string,
    body: { focus?: string; exercises: EditExercisePayload[]; coachsCall?: string },
  ): Promise<{ violations: string[]; republished: boolean }> => {
    const { data } = await api.patch<{ data: { violations: string[]; republished: boolean } }>(
      `/coach/plan-reviews/${id}`, body,
    );
    return data.data;
  },

  approve: async (id: string, coachNote?: string): Promise<void> => {
    await api.post(`/coach/plan-reviews/${id}/approve`, coachNote ? { coachNote } : {});
  },

  /** The reason is required and becomes the instruction for the replacement draft. */
  reject: async (id: string, reason: string): Promise<{ replacementId: string | null }> => {
    const { data } = await api.post<{ data: { replacementId: string | null } }>(
      `/coach/plan-reviews/${id}/reject`, { reason },
    );
    return data.data;
  },
};
