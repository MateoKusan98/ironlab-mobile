import { api } from './api';

export interface ExerciseCue {
  id: string;
  exerciseName: string;
  exerciseKey: string;
  text: string;
  createdAt: string;
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
