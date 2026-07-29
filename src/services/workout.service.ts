import { api } from './api';
import { ApiResponse, CreateWorkoutPlanDto, ExerciseCatalogItem, SubmitWorkoutLogDto, WorkoutLogResponse, WorkoutPlanResponse } from '@shared';
import { DraftProgram } from '../store/useProgramBuilderStore';

export const workoutService = {
  getExercises: async (params?: { q?: string; muscle?: string; equipment?: string }): Promise<ExerciseCatalogItem[]> => {
    const { data } = await api.get<ApiResponse<ExerciseCatalogItem[]>>('/workouts/exercises', { params });
    return data.data;
  },

  createProgram: async (dto: DraftProgram): Promise<{ id: string }> => {
    const { data } = await api.post<ApiResponse<{ id: string }>>('/workouts/programs', dto);
    return data.data;
  },

  createPlan: async (dto: CreateWorkoutPlanDto): Promise<WorkoutPlanResponse> => {
    const { data } = await api.post<ApiResponse<WorkoutPlanResponse>>('/workouts/plans', dto);
    return data.data;
  },

  getPlans: async (): Promise<WorkoutPlanResponse[]> => {
    const { data } = await api.get<ApiResponse<WorkoutPlanResponse[]>>('/workouts/plans');
    return data.data;
  },

  deletePlan: async (planId: string): Promise<void> => {
    await api.delete(`/workouts/plans/${planId}`);
  },

  submitLog: async (dto: SubmitWorkoutLogDto): Promise<WorkoutLogResponse> => {
    const { data } = await api.post<ApiResponse<WorkoutLogResponse>>('/workouts/logs', dto);
    return data.data;
  },

  getMyLogs: async (): Promise<WorkoutLogResponse[]> => {
    const { data } = await api.get<ApiResponse<WorkoutLogResponse[]>>('/workouts/logs');
    return data.data;
  },

  getClientLogs: async (clientId: string): Promise<WorkoutLogResponse[]> => {
    const { data } = await api.get<ApiResponse<WorkoutLogResponse[]>>(
      `/workouts/logs/${clientId}`,
    );
    return data.data;
  },
};
