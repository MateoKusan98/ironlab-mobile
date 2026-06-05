export const palette = {
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
