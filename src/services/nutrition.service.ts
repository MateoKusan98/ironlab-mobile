import { api } from './api';
import {
  ApiResponse,
  FoodLogResponse,
  MyMeal,
  ParseIngredientsResult,
  NutritionSummary,
  CalendarDay,
  IngredientSearchResult,
  TdeeResult,
  ComputedTargets,
  WeightLogEntry,
  CalorieAdaptation,
} from '@shared';

export const nutritionService = {
  createFoodLog: async (formData: FormData): Promise<FoodLogResponse> => {
    const { data } = await api.post<ApiResponse<FoodLogResponse>>(
      '/nutrition/food-log',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data.data;
  },

  getMyFoodLogs: async (date?: string): Promise<FoodLogResponse[]> => {
    const params = date ? { date } : {};
    const { data } = await api.get<ApiResponse<FoodLogResponse[]>>('/nutrition/food-logs', {
      params,
    });
    return data.data;
  },

  browseMeals: async (
    tag?: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    minCalories?: number,
    maxCalories?: number,
  ): Promise<{ meals: FoodLogResponse[]; total: number }> => {
    const params: Record<string, string | number | undefined> = { tag, page, limit, search };
    if (minCalories !== undefined) params.minCalories = minCalories;
    if (maxCalories !== undefined) params.maxCalories = maxCalories;
    
    const { data } = await api.get<ApiResponse<{ meals: FoodLogResponse[]; total: number }>>(
      '/nutrition/meals/browse',
      { params },
    );
    return data.data;
  },

  getClientFoodLogs: async (clientId: string, date?: string): Promise<FoodLogResponse[]> => {
    const params = date ? { date } : {};
    const { data } = await api.get<ApiResponse<FoodLogResponse[]>>(
      `/nutrition/food-logs/${clientId}`,
      { params },
    );
    return data.data;
  },

  searchIngredients: async (query: string, page: number = 1): Promise<IngredientSearchResult[]> => {
    const { data } = await api.get<ApiResponse<IngredientSearchResult[]>>('/nutrition/ingredients/search', {
      params: { query, page },
    });
    return data.data;
  },
  
  getSummary: async (period?: string): Promise<NutritionSummary> => {
    const { data } = await api.get<ApiResponse<NutritionSummary>>('/nutrition/summary', {
      params: { period },
    });
    return data.data;
  },

  getCalendar: async (): Promise<CalendarDay[]> => {
    const { data } = await api.get<ApiResponse<CalendarDay[]>>('/nutrition/calendar');
    return data.data;
  },

  getMyMeals: async (): Promise<MyMeal[]> => {
    const { data } = await api.get<ApiResponse<MyMeal[]>>('/nutrition/my-meals');
    return data.data;
  },

  quickLogMeal: async (mealId: string, mealType: string, date?: string): Promise<FoodLogResponse> => {
    const { data } = await api.post<ApiResponse<FoodLogResponse>>(`/nutrition/my-meals/${mealId}/log`, { mealType, date });
    return data.data;
  },

  deleteMyMeal: async (mealId: string): Promise<void> => {
    await api.delete(`/nutrition/my-meals/${mealId}`);
  },

  parseIngredients: async (text: string): Promise<ParseIngredientsResult> => {
    const { data } = await api.post<ApiResponse<ParseIngredientsResult>>('/nutrition/parse-ingredients', { text });
    return data.data;
  },

  getTDEE: async (): Promise<TdeeResult> => {
    const { data } = await api.get<ApiResponse<TdeeResult>>('/nutrition/tdee');
    return data.data;
  },

  computeTargets: async (opts: { goal?: string; calorieOverride?: number; trainingDaysPerWeek?: number } = {}): Promise<ComputedTargets> => {
    const { data } = await api.post<ApiResponse<ComputedTargets>>('/nutrition/targets', opts);
    return data.data;
  },

  logWeight: async (weight: number, options?: { unit?: string; date?: string; notes?: string }): Promise<WeightLogEntry> => {
    const { data } = await api.post<ApiResponse<WeightLogEntry>>('/nutrition/weight-log', { weight, ...options });
    return data.data;
  },

  getWeightLogs: async (days?: number): Promise<WeightLogEntry[]> => {
    const { data } = await api.get<ApiResponse<WeightLogEntry[]>>('/nutrition/weight-logs', { params: { days } });
    return data.data;
  },

  getCalorieAdaptation: async (): Promise<CalorieAdaptation> => {
    const { data } = await api.get<ApiResponse<CalorieAdaptation>>('/nutrition/calorie-adaptation');
    return data.data;
  },
};
