/**
 * A token colour at a given opacity: `alpha(palette.error[500], 0.25)`.
 *
 * React Native accepts 8-digit `#RRGGBBAA`, which is how these were written
 * before — as opaque literals like `'#ef444440'` that no longer showed which
 * token they were tinting.
 */
export function alpha(color: string, opacity: number): string {
  const a = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  /**
   * Legacy shorthand neutrals (`#111`, `#333`, `#888` …) that predate the ramps
   * below. Kept at their exact values so tokenising them moved no pixel; prefer
   * `zinc` or `gray` for new work.
   */
  mono: {
    11: '#111111',
    22: '#222222',
    33: '#333333',
    44: '#444444',
    55: '#555555',
    66: '#666666',
    88: '#888888',
    aa: '#AAAAAA',
  },

  /**
   * The app's dark surfaces and secondary text are the Tailwind ZINC ramp — a
   * cooler neutral than the custom `gray` scale below. This was the real reason
   * colours got hardcoded: the ramp the UI is actually built on wasn't declared,
   * so there was no token to reach for. `theme.colors.background` / `card` /
   * `cardElevated` are zinc 950 / 900 / 800.
   */
  zinc: {
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },

  // Grays / Neutrals
  gray: {
    50: '#F8F8F8',
    100: '#E8E8E8',
    200: '#D4D4D4',
    300: '#A3A3A3',
    400: '#737373',
    500: '#525252',
    600: '#404040',
    700: '#262626',
    800: '#171717',
    900: '#0A0A0A',
    950: '#050505',
  },

  // Primary Brand (Orange)
  brand: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',     // Main Primary
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
    950: '#431407',
  },

  // Semantic: Success (Green)
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  // Semantic: Warning (Yellow/Orange)
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // Semantic: Error/Danger (Red)
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  // Semantic: Info (Blue)
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // Gold/star accents. Deliberately separate from `warning` (amber) — this is
  // the warmer yellow used for ratings, elite tiers and highlights.
  yellow: {
    500: '#EAB308',
  },

  /**
   * Categorical accent families. These exist to be the SOURCE for the semantic
   * groups below (`theme.chart`, `theme.rank`, …) — muscle-group coding, tier
   * colours and status chips. Only the steps actually in use are declared, so
   * the palette stays an honest record of what the UI renders.
   */
  violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
  purple: { 400: '#C084FC' },
  indigo: { 500: '#6366F1', 950: '#1E1B4B' },
  cyan: { 400: '#22D3EE', 500: '#06B6D4' },
  teal: { 300: '#5EEAD4', 700: '#0F766E', 950: '#042F2E' },
  emerald: { 400: '#34D399', 500: '#10B981' },
  lime: { 400: '#A3E635', 500: '#84CC16', 600: '#65A30D', 800: '#3F6212' },
  pink: { 300: '#F9A8D4', 400: '#F472B6', 500: '#EC4899' },
  rose: { 400: '#FB7185', 500: '#F43F5E' },
  slate: { 800: '#1E293B' },
  stone: { 600: '#57534E', 900: '#1C1917' },
  // Tailwind's blue-tinted "gray" ramp — distinct from both `gray` and `zinc`.
  coolGray: { 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 800: '#1F2937' },
};

export const theme = {
  // Aliases for currently used theme objects to ensure backward compatibility
  // while linking everything to our new scalable foundations.
  colors: {
    // Primary palette mapping
    primary: palette.brand[600],
    primaryLight: palette.brand[400],
    primaryDark: palette.brand[800],

    // Accent
    accent: palette.brand[400],

    // Semantic mapping
    success: palette.success[500],
    warning: palette.warning[500],
    error: palette.error[500],
    info: palette.info[500],

    // Dark Mode Theme Application
    background: '#09090B',         // Deep Neutral Black
    backgroundSecondary: '#111113', // Slightly lighter for layering
    backgroundTertiary: '#1C1C1E',
    
    card: '#18181B',               // Same as bg secondary typically
    cardElevated: '#27272A',

    // Text mapping (Dark mode optimized)
    text: palette.gray[50],
    textSecondary: palette.gray[400],
    textTertiary: palette.gray[500],
    textInverse: palette.gray[900],

    // Borders mapping
    border: palette.gray[800],
    borderLight: palette.gray[700],

    // Mood colors (Legacy support)
    moodGreat: '#00E676',
    moodGood: '#69F0AE',
    moodOkay: '#FFD54F',
    moodBad: '#FF8A65',
    moodTerrible: '#EF5350',
  },

  /**
   * The canonical card. Before this existed, 20 screens each declared their own
   * `card:` style and drifted apart — three different "card background" values,
   * eight radii, eight paddings. `<Card>` renders these; a screen that needs to
   * differ passes an explicit prop, so the deviation is visible in the JSX
   * instead of buried in a private StyleSheet.
   */
  card: {
    background: '#18181B',      // = colors.card (zinc 900)
    border: '#171717',          // = colors.border (gray 800)
    radius: 16,
    padding: 18,
    gap: 12,
  },

  /**
   * Section headings. Two shapes cover almost every use: a small uppercase
   * "overline" above a group of cards, and a plain heading inside one.
   */
  sectionTitle: {
    overline: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
      marginBottom: 12,
    },
    heading: {
      fontSize: 15,
      fontWeight: '700' as const,
      marginBottom: 12,
    },
  },

  /**
   * Very dark, hue-tinted surfaces that sit behind a coloured chip, status pill
   * or category card — each is its accent's hue dropped to a near-black
   * lightness so the accent still reads against it.
   */
  surfaceTint: {
    success: '#0A1A0F',
    successDeep: '#0F1A10',
    lime: '#12180A',
    warning: '#1C1009',
    warningDeep: '#2A1E08',
    error: '#1C0A0A',
    brand: '#1A0E05',
    info: '#0A1628',
    violet: '#1A1040',
    neutral: '#0F0F14',
  },

  /** Lighter hue tints used for meal/workout category cards. */
  categoryTint: {
    green: '#1A3322',
    amber: '#3A2016',
    rose: '#3D1525',
    yellow: '#31230D',
    orange: '#422006',
  },

  /** Near-black surfaces used by hero/full-bleed screens and inert controls. */
  surface: {
    black: '#080808',
    raised: '#1A1A1A',
    /** Unfilled portion of a progress arc. */
    track: '#2A2A2A',
    lockedCard: '#0D0D0F',
    violetBorder: '#3B1F6A',
  },

  /** Confetti burst on a badge unlock. Intentionally loud — not UI chrome. */
  celebration: {
    confetti: ['#FFD700', '#FFA500', '#FF6B6B'],
  },

  /**
   * Medal metals, one ramp per rank tier. Each tier is a small material system —
   * `light`→`deep` shade the body top-to-bottom, `rim` is the bright bevel,
   * `glow` the outer halo and `emblem` the raised star. They are struck metals
   * rather than UI colours, which is why none of them come off the palette ramps.
   */
  medal: {
    bronze: {
      light: '#F4C58B', mid: '#C77B3F', dark: '#7A4520', deep: '#3E2412',
      rim: '#FBE3C6', glow: '#C77B3F', emblem: '#FFEFDD',
    },
    silver: {
      light: '#FCFDFF', mid: '#C4CDD8', dark: '#79858F', deep: '#2B3138',
      rim: palette.white, glow: '#C4CDD8', emblem: palette.white,
    },
    gold: {
      light: '#FFECB0', mid: '#E9B53F', dark: '#9C6E13', deep: '#5A3E08',
      rim: '#FFF6D8', glow: '#F5C451', emblem: '#FFF7D6',
    },
    platinum: {
      light: '#F4FAFF', mid: '#C2D5E8', dark: '#7E93A8', deep: '#2C3742',
      rim: palette.white, glow: '#9BC4FF', emblem: palette.white,
    },
    diamond: {
      light: '#F0FBFF', mid: '#BFE9F5', dark: '#6FA9C4', deep: '#234B5E',
      rim: palette.white, glow: '#8EE6FF', emblem: palette.white,
    },
    legendary: {
      light: '#FFE0B0', mid: '#F2751C', dark: '#B23A0A', deep: '#4A1405',
      rim: '#FFE8C4', glow: '#FF7A1E', emblem: '#FFEAC9',
    },
    locked: {
      light: '#34343A', mid: '#222227', dark: '#161619', deep: '#0B0B0D',
      rim: '#3C3C42', glow: 'transparent', emblem: '#4C4C55',
    },
    /** Surfaces the medallion itself sits on. */
    surface: { card: '#0C0C0E', border: '#2A2A30', lockIcon: '#8A8A93' },
    /** Decorative sheen on the diamond facet. */
    sheen: '#FF3DA6',
  },

  /**
   * Categorical colour scales. These are DATA, not styling: a muscle group's
   * colour has to be the same everywhere it appears or the charts stop being
   * readable. They lived inline in StatsScreen — meaning a second stats view
   * would have silently invented its own.
   */
  chart: {
    muscleGroup: {
      'Chest': palette.error[500],
      'Back': palette.info[500],
      'Shoulders': palette.warning[500],
      'Triceps': palette.violet[500],
      'Biceps': palette.cyan[500],
      'Quads': palette.success[500],
      'Hamstrings/Glutes': palette.brand[500],
      'Calves': palette.lime[500],
      'Core': palette.pink[500],
      'Other': palette.gray[500],
    } as Record<string, string>,
  },

  /** Experience-tier colours, ascending. Shared by stats, path tree and profile. */
  rank: {
    Untrained: palette.gray[500],
    Beginner: palette.lime[500],
    Novice: palette.success[500],
    Intermediate: palette.cyan[500],
    Advanced: palette.violet[400],
    Elite: palette.yellow[500],
  } as Record<string, string>,

  /** Weekly-volume landmark status (MEV/MAV/MRV bands). */
  volumeStatus: {
    under: palette.warning[500],
    optimal: palette.success[500],
    high: palette.info[500],
    overreaching: palette.error[500],
  },

  /** Post-session readiness self-report. */
  mood: {
    tired: palette.coolGray[500],
    neutral: palette.coolGray[400],
    good: palette.brand[500],
    great: palette.error[500],
    elite: palette.yellow[500],
  },

  // Expanded typography system (like Figma)
  typography: {
    // Displays
    display2xl: { fontSize: 72, lineHeight: 90, letterSpacing: -1.5 },
    displayXl: { fontSize: 60, lineHeight: 72, letterSpacing: -1.2 },
    displayLg: { fontSize: 48, lineHeight: 60, letterSpacing: -1 },
    displayMd: { fontSize: 36, lineHeight: 44, letterSpacing: -0.5 },
    displaySm: { fontSize: 30, lineHeight: 38 },
    
    // Headings
    heading2xl: { fontSize: 24, lineHeight: 32 },
    headingXl: { fontSize: 20, lineHeight: 28 },
    headingLg: { fontSize: 18, lineHeight: 28 },
    headingMd: { fontSize: 16, lineHeight: 24 },
    headingSm: { fontSize: 14, lineHeight: 20 },

    // Text
    textXl: { fontSize: 20, lineHeight: 28 },
    textLg: { fontSize: 18, lineHeight: 28 },
    textMd: { fontSize: 16, lineHeight: 24 }, // Base body
    textSm: { fontSize: 14, lineHeight: 20 },
    textXs: { fontSize: 12, lineHeight: 16 },
  },

  // Expanded scale for consistent whitespace
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    xxl: 24, // Legacy alias
    '3xl': 32,
    xxxl: 32, // Legacy alias
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
    '7xl': 80,
    '8xl': 96,
  },

  // Foundational radii
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  // Legacy flat font-size for backward compatibility
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 34,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Full shadow scale directly influenced by the Design System
  shadow: {
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.1,
      shadowRadius: 25,
      elevation: 12,
    },
    '2xl': {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.15,
      shadowRadius: 50,
      elevation: 24,
    },
  },
} as const;

export type Theme = typeof theme;
