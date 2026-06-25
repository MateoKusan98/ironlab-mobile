import { api } from './api';

export type BadgeKey =
  | 'BENCH_80' | 'BENCH_100' | 'BENCH_120'
  | 'SQUAT_100' | 'SQUAT_140' | 'SQUAT_180'
  | 'DEADLIFT_100' | 'DEADLIFT_180' | 'DEADLIFT_220'
  | 'POWERFUL_LAD'
  | 'SESSIONS_1' | 'SESSIONS_10' | 'SESSIONS_50' | 'SESSIONS_100'
  | 'WEEK_3' | 'STREAK_30_MONTH'
  | 'PR_FIRST' | 'PR_10' | 'PR_25' | 'PR_50'
  | 'RPE_5' | 'NOTES_10' | 'BODYWEIGHT_20'
  | 'MEAL_FIRST' | 'MEAL_MAXDAY' | 'MEAL_STREAK_7' | 'MEAL_100'
  | 'SPITE_PR' | 'FUMES_PR' | 'LIVES_HERE' | 'EFFICIENT' | 'FULL_SEND' | 'NO_LIFE'
  | 'LOCKED_IN' | 'LOCKED_IN_2' | 'LOCKED_IN_3';

export type BadgeGroup = 'strength' | 'grind' | 'detail' | 'nutrition' | 'chaos' | 'dedication';

export interface BadgeMeta {
  key: BadgeKey;
  name: string;
  description: string;
  icon: string;
  group: BadgeGroup;
  points: number; // bonus points awarded when unlocked
}

export interface BadgesResponse {
  unlockedBadges: BadgeKey[];
  achievementPoints: number;
}

export const BADGE_CATALOG: BadgeMeta[] = [
  // ── Strength ──────────────────────────────────────────────────────────────
  { key: 'BENCH_80',       name: 'Almost There Bro',         description: 'Bench press 1RM ≥ 80 kg',          icon: '🏋️', group: 'strength',   points: 25 },
  { key: 'BENCH_100',      name: 'Century Bench',            description: 'Bench press 1RM ≥ 100 kg',         icon: '💯', group: 'strength',   points: 50 },
  { key: 'BENCH_120',      name: 'Pec Deck Champion',        description: 'Bench press 1RM ≥ 120 kg',         icon: '🔥', group: 'strength',   points: 100 },
  { key: 'SQUAT_100',      name: 'Plate on Each Side',       description: 'Squat 1RM ≥ 100 kg',               icon: '🦵', group: 'strength',   points: 25 },
  { key: 'SQUAT_140',      name: 'Leg Day Legend',           description: 'Squat 1RM ≥ 140 kg',               icon: '🏆', group: 'strength',   points: 50 },
  { key: 'SQUAT_180',      name: 'Steel Knees',              description: 'Squat 1RM ≥ 180 kg',               icon: '⚙️', group: 'strength',   points: 100 },
  { key: 'DEADLIFT_100',   name: 'Off The Floor',            description: 'Deadlift 1RM ≥ 100 kg',            icon: '💪', group: 'strength',   points: 25 },
  { key: 'DEADLIFT_180',   name: 'Iron Floor',               description: 'Deadlift 1RM ≥ 180 kg',            icon: '⚡', group: 'strength',   points: 50 },
  { key: 'DEADLIFT_220',   name: 'Human Forklift',           description: 'Deadlift 1RM ≥ 220 kg',            icon: '🦾', group: 'strength',   points: 100 },
  { key: 'POWERFUL_LAD',   name: 'Powerful Lad',             description: 'Hit the century bench, 140 squat & 180 deadlift', icon: '👑', group: 'strength', points: 200 },

  // ── Grind ─────────────────────────────────────────────────────────────────
  { key: 'SESSIONS_1',     name: 'It Begins',                description: 'Complete your first session',      icon: '🌱', group: 'grind',      points: 10 },
  { key: 'SESSIONS_10',    name: 'Double Digits',            description: 'Complete 10 sessions',             icon: '🔢', group: 'grind',      points: 50 },
  { key: 'SESSIONS_50',    name: 'Fifty And Still Lifting',  description: 'Complete 50 sessions',             icon: '🎯', group: 'grind',      points: 100 },
  { key: 'SESSIONS_100',   name: 'The Century',              description: 'Complete 100 sessions',            icon: '💎', group: 'grind',      points: 200 },
  { key: 'WEEK_3',         name: 'Three Times A Week Kid',   description: '3 sessions in one week',           icon: '📅', group: 'grind',      points: 30 },
  { key: 'STREAK_30_MONTH',name: 'Institutionalized',        description: '30 sessions in a calendar month',  icon: '🏛️', group: 'grind',      points: 200 },
  { key: 'PR_FIRST',       name: 'First Blood',              description: 'Hit your first PR',                icon: '🩸', group: 'grind',      points: 15 },
  { key: 'PR_10',          name: "Plateau? Never Heard",     description: 'Hit 10 PRs',                       icon: '📈', group: 'grind',      points: 50 },
  { key: 'PR_25',          name: 'Always Improving',         description: 'Hit 25 PRs',                       icon: '🚀', group: 'grind',      points: 100 },
  { key: 'PR_50',          name: 'The Machine',              description: 'Hit 50 PRs',                       icon: '🤖', group: 'grind',      points: 200 },

  // ── Detail ────────────────────────────────────────────────────────────────
  { key: 'RPE_5',          name: 'Borg Scale Believer',      description: 'Full RPE on all sets in 5 sessions', icon: '🧮', group: 'detail',   points: 75 },
  { key: 'NOTES_10',       name: 'Film Student',             description: 'Technique notes in 10 sessions',  icon: '🎬', group: 'detail',     points: 50 },
  { key: 'BODYWEIGHT_20',  name: 'Weigh-In Warrior',         description: 'Log bodyweight in 20 sessions',   icon: '⚖️', group: 'detail',     points: 25 },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  { key: 'MEAL_FIRST',     name: 'Macros Go Brrr',           description: 'Log your first meal',              icon: '🥗', group: 'nutrition',  points: 10 },
  { key: 'MEAL_MAXDAY',    name: 'Six Meal Soldier',         description: 'Log 6 meals in one day',           icon: '🍽️', group: 'nutrition',  points: 25 },
  { key: 'MEAL_STREAK_7',  name: 'Meal Prep Psycho',         description: 'Log meals 7 days in a row',        icon: '🥡', group: 'nutrition',  points: 75 },
  { key: 'MEAL_100',       name: 'Hundred Meals Deep',       description: 'Log 100 total meals',              icon: '📊', group: 'nutrition',  points: 100 },

  // ── Chaos ─────────────────────────────────────────────────────────────────
  { key: 'SPITE_PR',       name: 'Spite PR',                 description: 'Hit a PR while in a bad mood',     icon: '😤', group: 'chaos',      points: 30 },
  { key: 'FUMES_PR',       name: 'Running On Fumes',         description: 'Hit a PR with energy level ≤ 2',  icon: '🫠', group: 'chaos',      points: 30 },
  { key: 'LIVES_HERE',     name: 'Do You Live Here',         description: 'Session over 2 hours',             icon: '🏠', group: 'chaos',      points: 15 },
  { key: 'EFFICIENT',      name: 'In And Out',               description: '10+ sets in under 30 minutes',    icon: '⏱️', group: 'chaos',      points: 25 },
  { key: 'FULL_SEND',      name: 'Full Send Day',            description: 'Session + 6 meals in one day',    icon: '🚀', group: 'chaos',      points: 50 },
  { key: 'NO_LIFE',        name: 'No Life Just Gains',       description: '30 days with a session and a meal', icon: '💀', group: 'chaos',    points: 150 },

  // ── Dedication ────────────────────────────────────────────────────────────
  { key: 'LOCKED_IN',      name: 'Locked In',                description: 'Reach 1000 achievement points',   icon: '🔒', group: 'dedication', points: 0 },
  { key: 'LOCKED_IN_2',    name: 'Deep In The Sauce',        description: 'Reach 2500 achievement points',   icon: '🧪', group: 'dedication', points: 0 },
  { key: 'LOCKED_IN_3',    name: 'This Is Your Life Now',    description: 'Reach 5000 achievement points',   icon: '🌀', group: 'dedication', points: 0 },
];

// ─── Session activity points ─────────────────────────────────────────────────
// Mirrors the backend (BadgesService.onSessionComplete). The server remains the
// source of truth for the banked total; this lets the summary screen show what a
// completed session is worth and *why*, so users see points come from training —
// not only from badges.
export const SESSION_POINTS = {
  base: 20,       // every completed session
  readiness: 5,   // any of bodyweight / energy / sleep logged
  rpe: 10,        // ≥ 50% of completed sets carry an RPE
  technique: 5,   // any completed set has a technique note
} as const;

export interface SessionPointsBreakdown {
  total: number;
  lines: Array<{ label: string; points: number; earned: boolean }>;
}

export function projectSessionPoints(session: {
  bodyweight: number | null;
  energyLevel: number | null;
  sleepHours: number | null;
  sets: Array<{ isCompleted: boolean; rpe: number | null; techniqueNotes: string | null }>;
}): SessionPointsBreakdown {
  const completed = session.sets.filter((s) => s.isCompleted);
  const rpeCount = completed.filter((s) => s.rpe !== null && s.rpe !== undefined).length;
  const hasReadiness = !!(session.bodyweight || session.energyLevel || session.sleepHours);
  const hasRpe = completed.length > 0 && rpeCount / completed.length >= 0.5;
  const hasNotes = completed.some((s) => !!s.techniqueNotes?.trim());

  const lines = [
    { label: 'Session completed', points: SESSION_POINTS.base, earned: true },
    { label: 'Readiness logged', points: SESSION_POINTS.readiness, earned: hasReadiness },
    { label: 'RPE on your sets', points: SESSION_POINTS.rpe, earned: hasRpe },
    { label: 'Technique notes', points: SESSION_POINTS.technique, earned: hasNotes },
  ];
  const total = lines.reduce((sum, l) => sum + (l.earned ? l.points : 0), 0);
  return { total, lines };
}

export const BADGE_GROUPS: Array<{ key: BadgeGroup; label: string }> = [
  { key: 'strength',   label: 'STRENGTH' },
  { key: 'grind',      label: 'GRIND' },
  { key: 'detail',     label: 'DETAILS' },
  { key: 'nutrition',  label: 'NUTRITION' },
  { key: 'chaos',      label: 'CHAOS' },
  { key: 'dedication', label: 'DEDICATION' },
];

export const badgesService = {
  getMyBadges: async (): Promise<BadgesResponse> => {
    const res = await api.get('/badges');
    return res.data.data;
  },
  syncBadges: async (): Promise<{ newBadges: BadgeKey[] }> => {
    const res = await api.post('/badges/sync');
    return res.data.data;
  },
};
