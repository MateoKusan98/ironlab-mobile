import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nutritionService } from '../services/nutrition.service';
import { useBadgeCelebration } from '../contexts/BadgeCelebrationContext';

export const useFoodLogs = (date?: string) => {
  return useQuery({
    queryKey: ['foodLogs', date],
    queryFn: () => nutritionService.getMyFoodLogs(date),
  });
};

export const useBrowseMeals = (
  tag?: string, 
  page: number = 1, 
  limit: number = 10, 
  search?: string,
  minCalories?: number,
  maxCalories?: number
) => {
  return useQuery({
    queryKey: ['browseMeals', tag, page, limit, search, minCalories, maxCalories],
    queryFn: () => nutritionService.browseMeals(tag, page, limit, search, minCalories, maxCalories),
  });
};

export const useIngredientSearch = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: ['ingredientSearch', query, page],
    queryFn: () => nutritionService.searchIngredients(query, page),
    enabled: !!query && query.length >= 3,
    staleTime: 5 * 60 * 1000,
  });
};

export const useNutritionSummary = (period?: string) => {
    return useQuery({
        queryKey: ['nutritionSummary', period],
        queryFn: () => nutritionService.getSummary(period),
    });
};

export const useNutritionCalendar = () => {
    return useQuery({
        queryKey: ['nutritionCalendar'],
        queryFn: () => nutritionService.getCalendar(),
    });
};

export const useClientFoodLogs = (clientId: string, date?: string) => {
  return useQuery({
    queryKey: ['foodLogs', clientId, date],
    queryFn: () => nutritionService.getClientFoodLogs(clientId, date),
    enabled: !!clientId,
  });
};

export const useCreateFoodLog = () => {
  const queryClient = useQueryClient();
  const { refresh: refreshBadges } = useBadgeCelebration();

  return useMutation({
    mutationFn: (formData: FormData) => nutritionService.createFoodLog(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionSummary'] });
      queryClient.invalidateQueries({ queryKey: ['nutritionCalendar'] });
      // Logging a meal can unlock nutrition badges (first meal, streaks, etc.).
      void refreshBadges();
    },
  });
};
