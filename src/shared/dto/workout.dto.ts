import { Mood } from '../enums';

export interface CreateWorkoutPlanDto {
  clientId: string;
  title: string;
  scheduledDate: string;
  exercises: CreateWorkoutExerciseDto[];
}

export interface CreateWorkoutExerciseDto {
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight?: number;
  order: number;
}

export interface UpdateWorkoutPlanDto {
  title?: string;
  scheduledDate?: string;
  exercises?: CreateWorkoutExerciseDto[];
}

export interface SubmitWorkoutLogDto {
  workoutPlanId: string;
  actualWeight?: number;
  repsCompleted?: number;
  techniqueRating?: number;
  notes?: string;
  mood?: Mood;
}
