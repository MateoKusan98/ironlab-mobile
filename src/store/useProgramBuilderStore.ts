import { create } from 'zustand';

// Types exactly mirroring the structure needed for the backend
export type SetType = 'NORMAL' | 'WARMUP' | 'DROP_SET' | 'FAILURE' | 'FATIGUE';

export interface DraftSet {
  id: string; // purely for local key tracking
  setNumber: number;
  setType: SetType;
  targetReps: number | null;
  targetRepsRange: string | null;
  targetRpe: number | null;
  targetWeightPerc: number | null;
  restDurationSeconds: number | null;
}

export interface DraftExercise {
  id: string; // purely for local key tracking
  exerciseId: string;
  exerciseName: string; // Stored locally just for display purposes
  orderIndex: number;
  supersetGroupId: string | null;
  notes: string | null;
  sets: DraftSet[];
}

export interface DraftDay {
  id: string; // purely for local key tracking
  dayNumber: number; // 1-7 relative
  suggestedDayOfWeek: string | null; // e.g. MONDAY
  isRestDay: boolean;
  title: string | null;
  notes: string | null;
  exercises: DraftExercise[];
}

export interface DraftWeek {
  id: string;
  orderIndex: number;
  name: string | null;
  days: DraftDay[];
}

export interface DraftBlock {
  id: string;
  name: string;
  orderIndex: number;
  durationWeeks: number;
  weeks: DraftWeek[];
}

export interface DraftProgram {
  title: string;
  description: string | null;
  goal: string | null;
  difficulty: string | null;
  durationWeeks: number;
  isPublic: boolean;
  blocks: DraftBlock[];
}

const initialProgramState: DraftProgram = {
  title: '',
  description: '',
  goal: 'HYPERTROPHY',
  difficulty: 'INTERMEDIATE',
  durationWeeks: 4, // Default to 4 weeks
  isPublic: false,
  blocks: [],
};

// Zustand Store
interface ProgramBuilderState {
  draft: DraftProgram;
  setOverview: (data: Partial<DraftProgram>) => void;
  generateBlocks: (blockConfig: { name: string; weeks: number }[]) => void;
  updateDay: (blockIndex: number, weekIndex: number, dayIndex: number, data: Partial<DraftDay>) => void;
  addExerciseToDay: (blockIndex: number, weekIndex: number, dayIndex: number, exercise: DraftExercise) => void;
  removeExerciseFromDay: (blockIndex: number, weekIndex: number, dayIndex: number, exerciseId: string) => void;
  addSetToExercise: (blockIndex: number, weekIndex: number, dayIndex: number, exerciseId: string, set: DraftSet) => void;
  copyWeek: (fromBlockIdx: number, fromWeekIdx: number, toBlockIdx: number, toWeekIdx: number) => void;
  resetDraft: () => void;
}

export const useProgramBuilderStore = create<ProgramBuilderState>((set, get) => ({
  draft: { ...initialProgramState },
  
  setOverview: (data) => set((state) => ({ draft: { ...state.draft, ...data } })),

  // Takes a config of blocks and automatically scaffolds out the Weeks and Days hierarchy 
  generateBlocks: (blockConfig) => set((state) => {
    const blocks: DraftBlock[] = blockConfig.map((conf, bIdx) => {
        const weeks: DraftWeek[] = Array.from({ length: conf.weeks }).map((_, wIdx) => {
            const days: DraftDay[] = Array.from({ length: 7 }).map((_, dIdx) => ({
                id: `d_${bIdx}_${wIdx}_${dIdx}`,
                dayNumber: dIdx + 1,
                suggestedDayOfWeek: null,
                isRestDay: false,
                title: `Day ${dIdx + 1}`,
                notes: null,
                exercises: []
            }));
            
            return {
                id: `w_${bIdx}_${wIdx}`,
                orderIndex: wIdx + 1,
                name: `Week ${wIdx + 1}`,
                days
            };
        });
        
        return {
            id: `b_${bIdx}`,
            name: conf.name,
            orderIndex: bIdx + 1,
            durationWeeks: conf.weeks,
            weeks
        };
    });

    return { draft: { ...state.draft, blocks } };
  }),

  updateDay: (bIdx, wIdx, dIdx, data) => set((state) => {
      const newBlocks = [...state.draft.blocks];
      const targetDay = newBlocks[bIdx].weeks[wIdx].days[dIdx];
      newBlocks[bIdx].weeks[wIdx].days[dIdx] = { ...targetDay, ...data };
      return { draft: { ...state.draft, blocks: newBlocks } };
  }),

  addExerciseToDay: (bIdx, wIdx, dIdx, exercise) => set((state) => {
      const newBlocks = [...state.draft.blocks];
      newBlocks[bIdx].weeks[wIdx].days[dIdx].exercises.push(exercise);
      return { draft: { ...state.draft, blocks: newBlocks } };
  }),

  removeExerciseFromDay: (bIdx, wIdx, dIdx, exId) => set((state) => {
    const newBlocks = [...state.draft.blocks];
    newBlocks[bIdx].weeks[wIdx].days[dIdx].exercises = newBlocks[bIdx].weeks[wIdx].days[dIdx].exercises.filter(e => e.id !== exId);
    return { draft: { ...state.draft, blocks: newBlocks } };
  }),

  addSetToExercise: (bIdx, wIdx, dIdx, exId, setObj) => set((state) => {
      const newBlocks = [...state.draft.blocks];
      const exercise = newBlocks[bIdx].weeks[wIdx].days[dIdx].exercises.find(e => e.id === exId);
      if (exercise) {
          exercise.sets.push(setObj);
      }
      return { draft: { ...state.draft, blocks: newBlocks } };
  }),

  copyWeek: (fBIdx, fWIdx, tBIdx, tWIdx) => set((state) => {
      const draft = state.draft;
      const sourceWeek = draft.blocks[fBIdx].weeks[fWIdx];
      const newBlocks = [...draft.blocks];
      
      // Deep clone the days from the source week, but assign them new tracking IDs
      const copiedDays = sourceWeek.days.map(day => ({
          ...day,
          id: `new_${Math.random()}`,
          exercises: day.exercises.map(ex => ({
              ...ex,
              id: `new_${Math.random()}`,
              sets: ex.sets.map(set => ({
                  ...set,
                  id: `new_${Math.random()}`
              }))
          }))
      }));

      newBlocks[tBIdx].weeks[tWIdx].days = copiedDays;
      return { draft: { ...draft, blocks: newBlocks } };
  }),

  resetDraft: () => set({ draft: { ...initialProgramState } }),
}));
