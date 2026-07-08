export enum UserRole {
  ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN',
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_COACH = 'ROLE_COACH',
  ROLE_TRAINEE = 'ROLE_TRAINEE',
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export enum Mood {
  GREAT = 'GREAT',
  GOOD = 'GOOD',
  OKAY = 'OKAY',
  BAD = 'BAD',
  TERRIBLE = 'TERRIBLE',
}

export enum BadgeKey {
  // Strength — Bench
  BENCH_80 = 'BENCH_80',
  BENCH_100 = 'BENCH_100',
  BENCH_120 = 'BENCH_120',
  // Strength — Squat
  SQUAT_100 = 'SQUAT_100',
  SQUAT_140 = 'SQUAT_140',
  SQUAT_180 = 'SQUAT_180',
  // Strength — Deadlift
  DEADLIFT_100 = 'DEADLIFT_100',
  DEADLIFT_180 = 'DEADLIFT_180',
  DEADLIFT_220 = 'DEADLIFT_220',
  // Strength — Combo
  POWERFUL_LAD = 'POWERFUL_LAD',
  // Grind — Sessions
  SESSIONS_1 = 'SESSIONS_1',
  SESSIONS_10 = 'SESSIONS_10',
  SESSIONS_50 = 'SESSIONS_50',
  SESSIONS_100 = 'SESSIONS_100',
  // Grind — Streaks
  WEEK_3 = 'WEEK_3',
  STREAK_30_MONTH = 'STREAK_30_MONTH',
  // Grind — PRs
  PR_FIRST = 'PR_FIRST',
  PR_10 = 'PR_10',
  PR_25 = 'PR_25',
  PR_50 = 'PR_50',
  // Detail
  RPE_5 = 'RPE_5',
  NOTES_10 = 'NOTES_10',
  BODYWEIGHT_20 = 'BODYWEIGHT_20',
  // Nutrition
  MEAL_FIRST = 'MEAL_FIRST',
  MEAL_MAXDAY = 'MEAL_MAXDAY',
  MEAL_STREAK_7 = 'MEAL_STREAK_7',
  MEAL_100 = 'MEAL_100',
  // Chaos
  SPITE_PR = 'SPITE_PR',
  FUMES_PR = 'FUMES_PR',
  LIVES_HERE = 'LIVES_HERE',
  EFFICIENT = 'EFFICIENT',
  FULL_SEND = 'FULL_SEND',
  NO_LIFE = 'NO_LIFE',
  // Dedication — Points milestones
  LOCKED_IN = 'LOCKED_IN',
  LOCKED_IN_2 = 'LOCKED_IN_2',
  LOCKED_IN_3 = 'LOCKED_IN_3',
  // Community
  IDEA_THANKED = 'IDEA_THANKED',
  // Physique — body scans
  SCAN_FIRST = 'SCAN_FIRST',
  SCAN_5 = 'SCAN_5',
  LEANER = 'LEANER',
  // Technique — form checks
  FORM_FIRST = 'FORM_FIRST',
  FORM_10 = 'FORM_10',
  // Knowledge — quiz
  QUIZ_FIRST = 'QUIZ_FIRST',
  QUIZ_PERFECT = 'QUIZ_PERFECT',
  QUIZ_MARATHON = 'QUIZ_MARATHON',
  // Knowledge — chess-style quiz rating milestones (thresholds mirror the
  // ratingTitle bands in data/fitnessQuiz.ts: Enthusiast/Athlete/Coach/Expert/Master)
  QUIZ_RATING_1100 = 'QUIZ_RATING_1100',
  QUIZ_RATING_1400 = 'QUIZ_RATING_1400',
  QUIZ_RATING_1700 = 'QUIZ_RATING_1700',
  QUIZ_RATING_2000 = 'QUIZ_RATING_2000',
  QUIZ_RATING_2200 = 'QUIZ_RATING_2200',
}
