/**
 * What the "Substitute" sheet suggests when the athlete swaps a movement mid-workout.
 *
 * 2026-10-12, Mateo: swapping Face Pull — the last exercise of the session — offered
 * Squat, Bench Press, Deadlift, Overhead Press and Barbell Row. Any name the old keyword
 * map did not know fell through to the first five entries of the catalogue, which are the
 * big compounds. And a secondary bench day (Spoto Press) was offered Cable Fly and Dip,
 * when the slot wants another bench variation.
 *
 * The coaching rule: a substitute fills the SAME SLOT it replaces.
 *   - The competition lift or one of its variations → other variations of that same lift
 *     (Spoto → Paused / Tempo / Close-Grip Bench). The comp lift itself comes last.
 *   - An accessory → the same muscle first, then easy, low-setup accessories. The end of a
 *     session is never the place to start a heavy barbell lift.
 *   - An unknown name is treated as an accessory: suggesting an easy movement is harmless,
 *     suggesting a deadlift is not. The search box covers everything else.
 */

/** Enough to choose from without pushing the list past the search box on a phone. */
const MAX_SUGGESTIONS = 8;

/**
 * Low-setup accessories that fit at the end of any session — the "skip it, do some cable
 * crunches instead" swap. Appended after the same-muscle options for every accessory.
 */
const EASY_FILLERS = [
  'Cable Crunch', 'Tricep Pushdown', 'Farmer Carry', 'Face Pull', 'Dumbbell Curl', 'Cable Lateral Raise',
];

interface SlotFamily {
  match: (name: string) => boolean;
  options: string[];
  /** Competition-lift families never get the easy fillers: that slot is the main work. */
  isCompLift?: boolean;
}

// Order is load-bearing: the first family that matches wins. Calf before the squat/leg-press
// families ("Leg Press Calf Raise"), hamstring before biceps ("Leg Curl"), lateral delt
// before rows ("Upright Row"), and the comp-lift families exclude their accessory cousins
// (an RDL is a hinge accessory, a hack squat a quad accessory).
const SLOT_FAMILIES: SlotFamily[] = [
  {
    match: (n) => /calf/.test(n),
    options: ['Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise', 'Single-Leg Calf Raise'],
  },
  {
    isCompLift: true,
    match: (n) =>
      /deadlift|rack pull|block pull|deficit pull/.test(n) &&
      !/romanian|\brdl\b|stiff|single.?leg|dumbbell|\bdb\b/.test(n),
    options: ['Paused Deadlift', 'Deficit Deadlift', 'Block Pull', 'Tempo Deadlift', 'Trap Bar Deadlift', 'Deadlift'],
  },
  {
    isCompLift: true,
    match: (n) =>
      /bench press|spoto|larsen|floor press|board press|pin press|close.?grip bench|paused? bench|tempo bench/.test(n) &&
      !/dumbbell|\bdb\b|incline|decline|machine|smith/.test(n),
    options: [
      'Spoto Press', 'Paused Bench Press', 'Tempo Bench Press', 'Close-Grip Bench Press', 'Larsen Press',
      'Dumbbell Bench Press', 'Bench Press',
    ],
  },
  {
    isCompLift: true,
    match: (n) => /squat/.test(n) && !/hack|goblet|split|bulgarian|smith|belt|sissy|jump/.test(n),
    options: ['Paused Squat', 'Tempo Squat', 'Front Squat', 'Pin Squat', 'Safety Bar Squat', 'Box Squat', 'Squat'],
  },
  {
    match: (n) => /\bclean\b|snatch|jerk|push press/.test(n),
    options: ['Hang Clean', 'Power Clean', 'Push Press', 'Kettlebell Swing', 'Box Jump'],
  },
  {
    match: (n) => /crunch|plank|rollout|ab wheel|leg raise|knee raise|dead bug|pallof|sit.?up|russian twist|dragon flag|l-sit|landmine rotation|woodchop|hollow/.test(n),
    options: ['Cable Crunch', 'Hanging Knee Raise', 'Ab Rollout', 'Plank', 'Dead Bug', 'Pallof Press'],
  },
  {
    match: (n) => /face pull|rear delt|reverse pec|reverse fly|pull.?apart|y.?raise/.test(n),
    options: ['Rear Delt Cable Fly', 'Reverse Pec Deck', 'Band Pull-Apart', 'Dumbbell Rear Delt Fly', 'Cable Y-Raise'],
  },
  {
    match: (n) => /lateral raise|front raise|upright row/.test(n),
    options: ['Cable Lateral Raise', 'Dumbbell Lateral Raise', 'Machine Lateral Raise', 'Cable Upright Row'],
  },
  {
    match: (n) => /leg curl|nordic|hamstring/.test(n),
    options: ['Seated Leg Curl', 'Lying Leg Curl', 'Nordic Curl', 'Back Extension', 'Swiss Ball Leg Curl'],
  },
  {
    match: (n) => /curl/.test(n),
    options: ['Dumbbell Curl', 'Hammer Curl', 'Cable Curl', 'Preacher Curl', 'Incline Dumbbell Curl'],
  },
  {
    match: (n) => /tricep|pushdown|skull|kickback|jm press|french press/.test(n),
    options: [
      'Tricep Pushdown', 'Cable Overhead Tricep Extension', 'Skull Crusher', 'Overhead Tricep Extension', 'Dip',
    ],
  },
  {
    match: (n) => /overhead press|shoulder press|\bohp\b|arnold|military|landmine press/.test(n),
    options: ['Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Landmine Press', 'Arnold Press'],
  },
  {
    match: (n) => /\bfly\b|flye|pec deck|crossover|push.?up|\bdips?\b|incline|decline|dumbbell bench|chest press/.test(n),
    options: ['Incline Dumbbell Press', 'Machine Chest Press', 'Cable Fly', 'Pec Deck', 'Push-up'],
  },
  {
    match: (n) => /pull.?up|chin.?up|pulldown|pullover/.test(n),
    options: ['Lat Pulldown', 'Assisted Pull-up', 'Close-Grip Lat Pulldown', 'Straight-Arm Pulldown', 'Cable Pullover'],
  },
  {
    match: (n) => /\brows?\b/.test(n),
    options: ['Chest-Supported Row', 'Seated Cable Row', 'Single-Arm Dumbbell Row', 'Machine Row', 'T-Bar Row'],
  },
  {
    match: (n) => /shrug|farmer|carry/.test(n),
    options: ['Dumbbell Shrug', 'Farmer Carry', 'Barbell Shrug', 'Suitcase Carry'],
  },
  {
    match: (n) => /romanian|\brdl\b|stiff.?leg|good morning|back extension|hyperextension|reverse hyper|pull.?through|hip thrust|glute|swing/.test(n),
    options: ['Back Extension', 'Romanian Deadlift', 'Hip Thrust', 'Cable Pull-Through', 'Seated Leg Curl'],
  },
  {
    match: (n) => /leg press|hack|goblet|split squat|bulgarian|lunge|step.?up|leg extension|smith|belt squat|sissy/.test(n),
    options: ['Leg Press', 'Hack Squat', 'Leg Extension', 'Bulgarian Split Squat', 'Goblet Squat', 'Walking Lunges'],
  },
];

/**
 * Substitutes for a slot, best first.
 *
 * `slotName` is the PRESCRIBED movement (`exercise.substitutedFor ?? exercise.name`), so a
 * second swap of Face Pull → Cable Crunch still suggests for the face-pull slot.
 * `currentName` is what is on the card now and is never offered back.
 */
export function getSubstitutes(slotName: string, currentName: string = slotName): string[] {
  const family = SLOT_FAMILIES.find((f) => f.match(slotName.toLowerCase()));
  const candidates = family?.isCompLift
    ? family.options
    : [...(family?.options ?? []), ...EASY_FILLERS];

  const excluded = new Set([slotName.toLowerCase(), currentName.toLowerCase()]);
  const unique = candidates.filter(
    (name, i) => !excluded.has(name.toLowerCase()) && candidates.indexOf(name) === i,
  );
  return unique.slice(0, MAX_SUGGESTIONS);
}
