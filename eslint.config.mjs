import expo from 'eslint-config-expo/flat.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...expo,
  {
    ignores: ['dist/**', 'android/**', 'ios/**', '.expo/**', 'node_modules/**'],
  },
  {
    // Colour must come from the design system. src/theme is the single place a
    // raw hex may be written; everywhere else reaches for a token.
    //
    // This is an error, not a warning, because the failure mode is silent: a
    // hardcoded '#27272A' looks correct forever and simply stops tracking the
    // theme. That is how ~490 literals accumulated across 48 files — including
    // 74 copies of a value that already had a token (theme.colors.cardElevated).
    // If a colour genuinely has no token yet, add one to src/theme rather than
    // disabling this rule.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message:
            'Raw hex colour. Use a token from src/theme (palette.* / theme.colors.* / theme.chart.* …), and add one there if it does not exist yet.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      // The react-hooks v6 rules below are written against React DOM and the
      // React Compiler's purity model. They are kept as warnings — not errors —
      // because on React Native they fire mostly on idioms RN itself documents:
      //
      // refs: `useRef(new Animated.Value(0)).current` is the Animated API's
      //   own documented pattern for a stable animated value. The rule reads
      //   the `.current` as a render-phase ref access; there is no re-render
      //   to miss, because Animated drives the value off the JS thread.
      // set-state-in-effect: our uses are "reset/refetch when this modal
      //   becomes visible", which is a legitimate external-sync effect.
      // purity: flags `Date.now()` in render for countdown labels, which is
      //   deliberate — the label should reflect the render's wall clock.
      //
      // Off: this rule guards against HTML-escaping hazards in react-dom. RN
      // renders <Text> natively — there is no HTML parser to confuse — so its
      // only effect here would be to spell "Today's Recap" as "Today&apos;s".
      'react/no-unescaped-entities': 'off',

      // Left visible as warnings so a genuinely new violation still surfaces.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
);
