// Exercise name translations keyed by English canonical name.
// English names stay in the database — this is a display-only layer.

const BCS: Record<string, string> = {
  // ── Big compounds ──────────────────────────────────────────────────────────
  'Squat':                        'Čučanj',
  'Bench Press':                  'Potisak s klupe',
  'Deadlift':                     'Mrtvo dizanje',
  'Overhead Press':               'Potisak iznad glave',
  'Barbell Row':                  'Veslanje sa šipkom',
  'Front Squat':                  'Prednji čučanj',
  'Sumo Deadlift':                'Sumo mrtvo dizanje',
  'Rack Pull':                    'Podizanje sa stalka',
  'Trap Bar Deadlift':            'Mrtvo dizanje trap šipkom',
  'Romanian Deadlift':            'Rumunsko mrtvo dizanje',
  'Good Morning':                 'Dobro jutro',
  'Close-Grip Bench Press':       'Potisak uskim hvatom',
  'Incline Bench Press':          'Kosi potisak s klupe',
  'Decline Bench Press':          'Opadajući potisak s klupe',
  'Paused Bench Press':           'Potisak s pauzom',
  'Pause Bench':                  'Potisak s pauzom',
  'Pause Squat':                  'Čučanj s pauzom',
  'Box Squat':                    'Čučanj na kutiji',
  'Deficit Deadlift':             'Mrtvo dizanje s deficitom',
  'Stiff-Leg Deadlift':           'Mrtvo dizanje ravnih nogu',
  'Block Pull':                   'Podizanje s blokova',
  'Belt Squat':                   'Čučanj s pojasem',
  'Safety Bar Squat':             'Čučanj safety šipkom',
  'Spoto Press':                  'Spoto potisak',
  'Board Press':                  'Board potisak',
  'Pin Press':                    'Pin potisak',
  'Larsen Press':                 'Larsen potisak',
  'Floor Press':                  'Potisak s poda',
  'High-Bar Squat':               'Čučanj visokim hvatom',
  'Low-Bar Squat':                'Čučanj niskim hvatom',

  // ── Chest ─────────────────────────────────────────────────────────────────
  'Dumbbell Bench Press':         'Potisak bučicama',
  'Incline Dumbbell Press':       'Kosi potisak bučicama',
  'Decline Dumbbell Press':       'Opadajući potisak bučicama',
  'Cable Fly':                    'Letenje na kablovima',
  'Incline Cable Fly':            'Kosi letenje na kablovima',
  'Pec Deck':                     'Pec dec',
  'Push-up':                      'Sklekovi',
  'Dip':                          'Dips',
  'Cable Crossover':              'Crossover na kablovima',
  'Chest Press Machine':          'Potisak na mašini za grudi',
  'Smith Machine Bench':          'Potisak na Smith mašini',

  // ── Back ──────────────────────────────────────────────────────────────────
  'Pull-up':                      'Zgibovi',
  'Chin-up':                      'Zgibovi uskim hvatom',
  'Lat Pulldown':                 'Spuštanje sa gornjeg kabla',
  'Close-Grip Lat Pulldown':      'Spuštanje uskim hvatom',
  'Seated Cable Row':             'Veslanje sjedeće na kablovima',
  'Cable Row':                    'Veslanje na kablu',
  'Single-Arm Dumbbell Row':      'Jednoručno veslanje bučicom',
  'T-Bar Row':                    'Veslanje T-šipkom',
  'Chest-Supported Row':          'Veslanje s prsima na klupi',
  'Meadows Row':                  'Meadows veslanje',
  'Pendlay Row':                  'Pendlay veslanje',
  'Straight-Arm Pulldown':        'Spuštanje ispruženim rukama',
  'Face Pull':                    'Povlačenje prema licu',
  'Shrug':                        'Uzdizanje ramena',
  'Barbell Shrug':                'Uzdizanje ramena sa šipkom',
  'Seal Row':                     'Veslanje na klupi licem dolje',
  'Assisted Pull-up':             'Asistovani zgibovi',
  'Seated Row Machine':           'Veslanje na mašini',

  // ── Shoulders ─────────────────────────────────────────────────────────────
  'Dumbbell Shoulder Press':      'Potisak bučicama za ramena',
  'Arnold Press':                 'Arnold potisak',
  'Lateral Raise':                'Odručenje u stranu',
  'Dumbbell Lateral Raise':       'Odručenje bučicama',
  'Cable Lateral Raise':          'Odručenje na kablovima',
  'Front Raise':                  'Prednje odručenje',
  'Rear Delt Fly':                'Odručenje zadnjeg delta',
  'Rear Delt Cable Fly':          'Odručenje zadnjeg delta na kablovima',
  'Upright Row':                  'Uspravno veslanje',
  'Cable Upright Row':            'Uspravno veslanje na kablovima',
  'Band Pull-Apart':              'Rastezanje trake',
  'Shoulder Press Machine':       'Potisak na mašini za ramena',

  // ── Biceps ────────────────────────────────────────────────────────────────
  'Barbell Curl':                 'Pregibanje sa šipkom',
  'Dumbbell Curl':                'Pregibanje bučicom',
  'Hammer Curl':                  'Hammer pregibanje',
  'Preacher Curl':                'Pregibanje na preacher klupi',
  'Concentration Curl':           'Koncentraciono pregibanje',
  'Cable Curl':                   'Pregibanje na kablovima',
  'EZ-Bar Curl':                  'Pregibanje EZ šipkom',
  'Incline Dumbbell Curl':        'Pregibanje bučicom na kosom klupi',
  'Spider Curl':                  'Spider pregibanje',
  'Reverse Curl':                 'Pregibanje obrnutim hvatom',

  // ── Triceps ───────────────────────────────────────────────────────────────
  'Tricep Pushdown':              'Potiskivanje tricepsa na kablovima',
  'Overhead Tricep Extension':    'Ekstenzija tricepsa iznad glave',
  'Skull Crusher':                'Skull crusher',
  'Cable Overhead Tricep Extension': 'Ekstenzija tricepsa na kablovima',
  'Tricep Kickback':              'Kickback za triceps',
  'Diamond Push-up':              'Dijamantni sklekovi',
  'JM Press':                     'JM potisak',
  'Tate Press':                   'Tate potisak',

  // ── Legs ──────────────────────────────────────────────────────────────────
  'Leg Press':                    'Potisak nogama',
  'Hack Squat':                   'Hack čučanj',
  'Bulgarian Split Squat':        'Bugarski raznožni čučanj',
  'Goblet Squat':                 'Goblet čučanj',
  'Leg Extension':                'Ekstenzija nogu',
  'Leg Curl':                     'Pregibanje nogu',
  'Seated Leg Curl':              'Sjedeće pregibanje nogu',
  'Lying Leg Curl':               'Pregibanje nogu ležeće',
  'Hip Thrust':                   'Hip thrust',
  'Barbell Hip Thrust':           'Hip thrust sa šipkom',
  'Glute Bridge':                 'Glutealni most',
  'Single-Leg Hip Thrust':        'Jednonožni hip thrust',
  'Step Up':                      'Korak na klupu',
  'Lunges':                       'Iskoraci',
  'Walking Lunges':               'Hodajući iskoraci',
  'Reverse Lunge':                'Iskoraci unazad',
  'Calf Raise':                   'Podizanje na prste',
  'Seated Calf Raise':            'Sjedeće podizanje na prste',
  'Leg Press Calf Raise':         'Podizanje na prste na leg pressu',
  'Nordic Curl':                  'Nordic curl',
  'GHD':                          'GHD',
  'Smith Machine Squat':          'Čučanj na Smith mašini',
  'Leg Press Machine':            'Mašina za potisak nogama',

  // ── Core ──────────────────────────────────────────────────────────────────
  'Plank':                        'Plank',
  'Side Plank':                   'Bočni plank',
  'Ab Rollout':                   'Kotačić za trbuh',
  'Cable Crunch':                 'Pregib trbuha na kablovima',
  'Hanging Leg Raise':            'Podizanje nogu u visu',
  'Hanging Knee Raise':           'Podizanje koljena u visu',
  'Russian Twist':                'Ruska rotacija',
  'Dead Bug':                     'Dead bug',
  'Pallof Press':                 'Pallof potisak',
  'Sit-up':                       'Trbušnjaci',
  'Crunch':                       'Kratki trbušnjaci',
  'Dragon Flag':                  'Dragon flag',
  'L-Sit':                        'L-sjedenje',
  'Landmine Rotation':            'Rotacija s landmineom',
  'Farmer\'s Carry':              'Farmers carry',
  'Hex Bar Deadlift':             'Mrtvo dizanje hex šipkom',

  // ── Olympic ───────────────────────────────────────────────────────────────
  'Power Clean':                  'Power clean',
  'Hang Clean':                   'Hang clean',
  'Clean and Press':              'Clean and press',
  'Snatch':                       'Trzaj',
  'Push Press':                   'Push potisak',
  'Push Jerk':                    'Push jerk',

  // ── Machines / misc ───────────────────────────────────────────────────────
  'Assisted Dip':                 'Asistovani dips',
};

const SL: Record<string, string> = {
  'Squat':                'Počep',
  'Bench Press':          'Potisk s klopjo',
  'Deadlift':             'Mrtvi dvig',
  'Overhead Press':       'Potisk nad glavo',
  'Barbell Row':          'Veslanje s olimpijsko palico',
  'Front Squat':          'Prednji počep',
  'Sumo Deadlift':        'Sumo mrtvi dvig',
  'Romanian Deadlift':    'Romunski mrtvi dvig',
  'Pull-up':              'Dvigovanje na drogu',
  'Chin-up':              'Dvigovanje podprijemalnim oprijemom',
  'Lat Pulldown':         'Spuščanje visoke vrvi',
  'Dip':                  'Dips',
  'Push-up':              'Skleci',
  'Leg Press':            'Potisk z nogami',
  'Leg Extension':        'Izteg nog',
  'Leg Curl':             'Upogib nog',
  'Hip Thrust':           'Hip thrust',
  'Lunges':               'Izpadni koraki',
  'Calf Raise':           'Dvigovanje na prste',
  'Plank':                'Deska',
  'Crunch':               'Trebušnjaki',
  'Lateral Raise':        'Bočni dvigi',
  'Face Pull':            'Vlečenje k obrazu',
  'Seated Cable Row':     'Veslanje sede na kablu',
  'Barbell Curl':         'Upogib z olimpijsko palico',
  'Dumbbell Curl':        'Upogib z utežmi',
  'Tricep Pushdown':      'Izteg tricepsa na kablu',
  'Bulgarian Split Squat':'Bolgarski počep',
};

const MK: Record<string, string> = {
  'Squat':            'Чучење',
  'Bench Press':      'Потисок на клупа',
  'Deadlift':         'Мртво кревање',
  'Overhead Press':   'Потисок над глава',
  'Barbell Row':      'Веслање со шипка',
  'Pull-up':          'Подигнувања',
  'Dip':              'Дипс',
  'Push-up':          'Склекови',
  'Leg Press':        'Потисок со нозе',
  'Lunges':           'Испади',
  'Calf Raise':       'Подигнување на прсти',
  'Plank':            'Планк',
  'Crunch':           'Абдоминали',
  'Lateral Raise':    'Одручување настрана',
  'Romanian Deadlift':'Романско мртво кревање',
  'Hip Thrust':       'Хип тракција',
  'Barbell Curl':     'Прегибање со шипка',
  'Dumbbell Curl':    'Прегибање со тегови',
  'Tricep Pushdown':  'Потиснување на трицепс',
};

// Map language codes to their translation table
const TABLES: Record<string, Record<string, string>> = {
  bs: BCS, sr: BCS, hr: BCS, cnr: BCS,
  sl: SL,
  mk: MK,
};

/**
 * Returns the translated exercise name for the current UI language.
 * Falls back to the original English name if no translation exists.
 */
export function getExerciseName(name: string, language: string): string {
  const table = TABLES[language];
  if (!table) return name;
  return table[name] ?? name;
}

/**
 * Returns the reverse mapping (local name → English) for a given language.
 * Used to normalize user input back to canonical English for the database.
 */
export function getCanonicalName(localName: string, language: string): string {
  const table = TABLES[language];
  if (!table) return localName;
  const entry = Object.entries(table).find(([, v]) => v.toLowerCase() === localName.toLowerCase());
  return entry ? entry[0] : localName;
}
