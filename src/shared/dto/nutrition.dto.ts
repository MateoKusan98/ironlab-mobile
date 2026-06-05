import { MealType } from '../enums';

export interface CreateFoodLogDto {
  mealType: MealType;
  calories?: number;
  notes?: string;
  date: string;
}
