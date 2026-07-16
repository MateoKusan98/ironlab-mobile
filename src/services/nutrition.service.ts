import { api } from './api';
import { ApiResponse, FoodLogResponse } from '@shared';

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
    const params: any = { tag, page, limit, search };
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

  searchIngredients: async (query: string, page: number = 1): Promise<any[]> => {
    const { data } = await api.get<ApiResponse<any[]>>('/nutrition/ingredients/search', {
      params: { query, page },
    });
    return data.data;
  },
  
  getSummary: async (period?: string): Promise<any> => {
    const { data } = await api.get<ApiResponse<any>>('/nutrition/summary', {
      params: { period },
    });
    return data.data;
  },

  getCalendar: async (): Promise<any[]> => {
    const { data } = await api.get<ApiResponse<any[]>>('/nutrition/calendar');
    return data.data;
  },

  getMyMeals: async (): Promise<any[]> => {
    const { data } = await api.get<ApiResponse<any[]>>('/nutrition/my-meals');
    return data.data;
  },

  quickLogMeal: async (mealId: string, mealType: string, date?: string): Promise<any> => {
    const { data } = await api.post<ApiResponse<any>>(`/nutrition/my-meals/${mealId}/log`, { mealType, date });
    return data.data;
  },

  deleteMyMeal: async (mealId: string): Promise<void> => {
    await api.delete(`/nutrition/my-meals/${mealId}`);
  },

  parseIngredients: async (text: string): Promise<{
    mealName: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    ingredients: { name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[];
  }> => {
    const { data } = await api.post<ApiResponse<any>>('/nutrition/parse-ingredients', { text });
    return data.data;
  },

  getTDEE: async (): Promise<{ tdee: number; bmr: number; activityLevel: string; breakdown: Record<string, any> }> => {
    const { data } = await api.get<ApiResponse<any>>('/nutrition/tdee');
    return data.data;
  },

  computeTargets: async (opts: { goal?: string; calorieOverride?: number; trainingDaysPerWeek?: number } = {}): Promise<{
    tdee: number;
    bmr: number;
    activityLevel: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: string;
  }> => {
    const { data } = await api.post<ApiResponse<any>>('/nutrition/targets', opts);
    return data.data;
  },

  logWeight: async (weight: number, options?: { unit?: string; date?: string; notes?: string }): Promise<any> => {
    const { data } = await api.post<ApiResponse<any>>('/nutrition/weight-log', { weight, ...options });
    return data.data;
  },

  getWeightLogs: async (days?: number): Promise<any[]> => {
    const { data } = await api.get<ApiResponse<any[]>>('/nutrition/weight-logs', { params: { days } });
    return data.data;
  },

  getCalorieAdaptation: async (): Promise<{
    currentTarget: number;
    tdeeEstimate: number | null;
    lastAdjustedAt: string | null;
    history: { date: string; fromCalories: number; toCalories: number; reason: string; weightTrendKgPerWeek: number }[];
  }> => {
    const { data } = await api.get<ApiResponse<any>>('/nutrition/calorie-adaptation');
    return data.data;
  },
};
