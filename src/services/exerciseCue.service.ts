import { api } from './api';

/**
 * Where a cue came from. 'form-check' cues are DERIVED server-side from the
 * athlete's most recent AI form check on that movement — they have no row behind
 * them, so they must never be offered a delete (the server would 404) and they
 * age out of the verdict window on their own.
 */
export type ExerciseCueSource = 'manual' | 'form-check';

export interface ExerciseCue {
  id: string;
  exerciseName: string;
  exerciseKey: string;
  text: string;
  createdAt: string;
  source: ExerciseCueSource;
  /** Set only on form-check cues. */
  formCheckId?: string;
}

// Must mirror exerciseCueKey() on the backend so a workout's exercises resolve
// to the same saved cues regardless of capitalization/whitespace.
export const exerciseCueKey = (name: string): string => name.trim().toLowerCase();

export const exerciseCueService = {
  getCues: async (): Promise<ExerciseCue[]> => {
    const { data } = await api.get<{ data: ExerciseCue[] }>('/exercise-cues');
    return data.data;
  },

  addCue: async (input: { exerciseName: string; text: string }): Promise<ExerciseCue> => {
    const { data } = await api.post<{ data: ExerciseCue }>('/exercise-cues', input);
    return data.data;
  },

  deleteCue: async (id: string): Promise<void> => {
    await api.delete(`/exercise-cues/${id}`);
  },
};
