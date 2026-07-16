import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../services/workout.service';
import { CreateWorkoutPlanDto, SubmitWorkoutLogDto } from '@shared';

import { DraftProgram } from '../store/useProgramBuilderStore';

export const useWorkoutPlans = () => {
  return useQuery({
    queryKey: ['workoutPlans'],
    queryFn: () => workoutService.getPlans(),
  });
};

export const useCreateWorkoutPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateWorkoutPlanDto) => workoutService.createPlan(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
    },
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: DraftProgram) => workoutService.createProgram(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPrograms'] }); // Assuming we will have a key for this later
    },
  });
};

export const useExercises = (params?: { q?: string; muscle?: string; equipment?: string }) => {
  return useQuery({
    queryKey: ['exercises', params],
    queryFn: () => workoutService.getExercises(params),
    enabled: true, // we want it to search immediately or on first open
  });
};

export const useDeleteWorkoutPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => workoutService.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
    },
  });
};

export const useSubmitWorkoutLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SubmitWorkoutLogDto) => workoutService.submitLog(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
    },
  });
};

export const useWorkoutLogs = () => {
  return useQuery({
    queryKey: ['workoutLogs'],
    queryFn: () => workoutService.getMyLogs(),
  });
};

export const useClientWorkoutLogs = (clientId: string) => {
  return useQuery({
    queryKey: ['workoutLogs', clientId],
    queryFn: () => workoutService.getClientLogs(clientId),
    enabled: !!clientId,
  });
};
