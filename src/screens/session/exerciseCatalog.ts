/**
 * The exercise catalogue the workout screen offers: the add/substitute lists, which
 * lifts count as key lifts for today, substitution suggestions, and tutorial search.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
import { Alert, Linking } from 'react-native';

export const COMMON_EXERCISES = [
  // Big compounds
  'Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Front Squat', 'Sumo Deadlift', 'Rack Pull', 'Trap Bar Deadlift', 'Romanian Deadlift',
  'Good Morning', 'Close-Grip Bench Press', 'Incline Bench Press', 'Decline Bench Press',

  // Chest
  'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Decline Dumbbell Press',
  'Cable Fly', 'Incline Cable Fly', 'Pec Deck', 'Push-up', 'Dip',

  // Back
  'Pull-up', 'Chin-up', 'Lat Pulldown', 'Close-Grip Lat Pulldown',
  'Seated Cable Row', 'Cable Row', 'Single-Arm Dumbbell Row', 'T-Bar Row',
  'Chest-Supported Row', 'Meadows Row', 'Pendlay Row', 'Straight-Arm Pulldown',
  'Face Pull', 'Shrug', 'Barbell Shrug',

  // Shoulders
  'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Dumbbell Lateral Raise',
  'Cable Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Rear Delt Cable Fly',
  'Upright Row', 'Cable Upright Row',

  // Arms — Biceps
  'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl',
  'Concentration Curl', 'Cable Curl', 'EZ-Bar Curl', 'Incline Dumbbell Curl',
  'Spider Curl', 'Reverse Curl',

  // Arms — Triceps
  'Tricep Pushdown', 'Overhead Tricep Extension', 'Skull Crusher',
  'Cable Overhead Tricep Extension', 'Tricep Kickback', 'Diamond Push-up',
  'JM Press',

  // Legs
  'Leg Press', 'Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat',
  'Leg Extension', 'Leg Curl', 'Seated Leg Curl', 'Hip Thrust',
  'Glute Bridge', 'Single-Leg Hip Thrust', 'Step Up', 'Lunges',
  'Walking Lunges', 'Reverse Lunge', 'Calf Raise', 'Seated Calf Raise',
  'Leg Press Calf Raise', 'Nordic Curl',

  // Core
  'Plank', 'Side Plank', 'Ab Rollout', 'Cable Crunch', 'Hanging Leg Raise',
  'Hanging Knee Raise', 'Russian Twist', 'Dead Bug', 'Pallof Press',
  'Sit-up', 'Crunch', 'Dragon Flag', 'L-Sit', 'Landmine Rotation',

  // Olympic / Athletic
  'Power Clean', 'Hang Clean', 'Clean and Press', 'Snatch',
  'Push Press', 'Push Jerk',

  // Machines
  'Chest Press Machine', 'Shoulder Press Machine', 'Seated Row Machine',
  'Leg Press Machine', 'Smith Machine Squat', 'Smith Machine Bench',
  'Cable Crossover', 'Assisted Pull-up', 'Assisted Dip',
];

export const KEY_EXERCISE_PATTERN = /\bsquat\b|\bbench\b|\bdeadlift\b/i;

const SUBSTITUTE_MAP: Record<string, string[]> = {
  squat: ['Hack Squat', 'Leg Press', 'Bulgarian Split Squat', 'Goblet Squat', 'Smith Machine Squat'],
  bench: ['Dumbbell Bench Press', 'Incline Bench Press', 'Cable Fly', 'Dip', 'Machine Chest Press'],
  deadlift: ['Romanian Deadlift', 'Rack Pull', 'Trap Bar Deadlift', 'Good Morning', 'Leg Press'],
  ohp: ['Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Arnold Press', 'Landmine Press', 'Cable Lateral Raise'],
  row: ['Seated Cable Row', 'Dumbbell Row', 'Machine Row', 'T-Bar Row', 'Chest-Supported Row'],
  pulldown: ['Pull-up', 'Assisted Pull-up', 'Cable Pullover', 'Straight-Arm Pulldown'],
  curl: ['Hammer Curl', 'Cable Curl', 'Preacher Curl', 'Concentration Curl', 'Incline Dumbbell Curl'],
  tricep: ['Skull Crusher', 'Close-Grip Bench', 'Cable Pushdown', 'Overhead Tricep Extension', 'Dip'],
  lunge: ['Bulgarian Split Squat', 'Step Up', 'Reverse Lunge', 'Walking Lunge', 'Leg Press'],
  rdl: ['Good Morning', 'Leg Curl', 'Hip Thrust', 'Glute Bridge', 'Stiff-Leg Deadlift'],
};

export function getSubstitutes(exerciseName: string): string[] {
  const n = exerciseName.toLowerCase();
  for (const [key, subs] of Object.entries(SUBSTITUTE_MAP)) {
    if (n.includes(key)) return subs.filter(s => s.toLowerCase() !== n);
  }
  return COMMON_EXERCISES.filter(e => e.toLowerCase() !== n).slice(0, 5);
}

// Curated search queries — targeted to reliable channels so the first YouTube result
// is consistently a high-quality, technique-focused tutorial.
const TUTORIAL_QUERIES: Record<string, string> = {
  'squat':              'squat university back squat tutorial',
  'bench press':        'jeff nippard bench press tutorial',
  'deadlift':           'alan thrall how to deadlift',
  'overhead press':     'jeff nippard overhead press tutorial',
  'ohp':                'jeff nippard overhead press tutorial',
  'shoulder press':     'jeff nippard overhead press tutorial',
  'romanian deadlift':  'jeff nippard romanian deadlift form',
  'rdl':                'jeff nippard romanian deadlift form',
  'pull-up':            'jeff nippard pull up tutorial',
  'chin-up':            'athlean x chin up vs pull up',
  'barbell row':        'jeff nippard barbell row tutorial',
  'cable row':          'jeff nippard seated cable row',
  'seated cable row':   'jeff nippard seated cable row',
  'dumbbell row':       'jeff nippard dumbbell row tutorial',
  'lat pulldown':       'jeff nippard lat pulldown tutorial',
  't-bar row':          'jeff nippard t bar row tutorial',
  'incline bench':      'jeff nippard incline bench press',
  'dip':                'athlean x dips chest vs tricep',
  'leg press':          'jeff nippard leg press tutorial',
  'lunge':              'squat university lunge tutorial',
  'bulgarian split squat': 'jeff nippard bulgarian split squat',
  'hip thrust':         'bret contreras hip thrust tutorial',
  'glute bridge':       'bret contreras glute bridge tutorial',
  'leg curl':           'jeff nippard leg curl tutorial',
  'leg extension':      'jeff nippard leg extension tutorial',
  'hack squat':         'jeff nippard hack squat tutorial',
  'goblet squat':       'squat university goblet squat',
  'calf raise':         'athlean x calf raises tutorial',
  'face pull':          'jeff nippard face pull tutorial',
  'lateral raise':      'jeff nippard lateral raise tutorial',
  'front raise':        'athlean x front raise',
  'upright row':        'jeff nippard upright row tutorial',
  'curl':               'jeff nippard bicep curl tutorial',
  'hammer curl':        'jeff nippard hammer curl',
  'preacher curl':      'jeff nippard preacher curl',
  'cable curl':         'athlean x cable curl tutorial',
  'tricep pushdown':    'jeff nippard tricep pushdown',
  'skull crusher':      'jeff nippard skull crusher',
  'close grip bench':   'jeff nippard close grip bench press',
  'overhead tricep':    'athlean x overhead tricep extension',
  'cable fly':          'jeff nippard cable fly chest',
  'chest fly':          'jeff nippard chest fly tutorial',
  'incline dumbbell':   'jeff nippard incline dumbbell press',
  'good morning':       'alan thrall good morning tutorial',
  'rack pull':          'alan thrall rack pull tutorial',
  'trap bar deadlift':  'alan thrall trap bar deadlift',
  'sumo deadlift':      'alan thrall sumo deadlift',
  'arnold press':       'jeff nippard arnold press',
  'plank':              'athlean x plank tutorial',
  'ab wheel':           'athlean x ab wheel rollout',
  'hanging leg raise':  'athlean x hanging leg raise',
};

export function openTutorial(exerciseName: string): void {
  const n = exerciseName.toLowerCase();
  let query = '';

  for (const [key, q] of Object.entries(TUTORIAL_QUERIES)) {
    if (n.includes(key)) { query = q; break; }
  }

  if (!query) {
    query = `${exerciseName} proper form tutorial`;
  }

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('Could not open YouTube', 'Make sure you have a browser or YouTube installed.')
  );
}
