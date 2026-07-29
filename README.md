# IronLab — Mobile

The IronLab athlete app: React Native (Expo 56, RN 0.85, React 19), TypeScript throughout. Talks to [ironlab-backend](../ironlab-backend) for the adaptive coach, session logging and nutrition.

```bash
cp .env.example .env       # EXPO_PUBLIC_API_URL must point at your backend
npm ci
npm run dev                # expo start
npm run android            # or: npm run ios — needs a native build, not Expo Go
```

The app uses native modules (camera, notifications, secure store, keyboard-controller), so **Expo Go won't run it** — use a dev client (`expo run:android` / `run:ios`).

| | |
|---|---|
| Typecheck / lint | `npm run typecheck` / `npm run lint` |
| Tests | `npm test` — 36 hook tests, no device or network needed |
| Release APK | `npm run build:local` → `ironlab-latest.apk` |

## Layout

```
src/
  screens/        61 screens, grouped by domain (session, ai-coach, nutrition, client, admin, …)
  components/ui/  29 shared primitives — Button, Card, Slider, KeyboardAwareScreen, …
  services/       typed API clients, one per backend module
  hooks/          React Query wrappers (server state)
  stores/         Zustand (client state: auth, settings)
  i18n/           8 locales: en, hr, bs, sr, sl, mk, sq, cnr
  theme/          the ONLY place a colour literal may be written
```

Server state is React Query; client state is Zustand. If you're adding a screen that reads from the API, it goes through `hooks/` — not a `useEffect` + `fetch`.

## Two rules the linter enforces

Both are **errors**, not warnings, because both failure modes are silent.

- **No raw hex colours outside `src/theme`.** A hardcoded `'#27272A'` looks right forever and simply stops tracking the theme; that's how ~490 literals accumulated across 48 files, including 74 copies of a value that already had a token. If a colour has no token, add one to `src/theme`.
- **No `any`.** It switches off type checking wherever it lands and spreads through everything derived from it. Typing the API layer properly surfaced two real defects `any` had been hiding. If a shape is genuinely open-ended, use `unknown` and narrow it.

Screen-level state machines belong in `src/hooks`, not inside the component — that's what makes them testable. `useWorkoutTimer`, `useRestTimer` and `useExerciseCues` were extracted out of `ActiveWorkoutScreen` for exactly that reason and carry the app's 36 tests.

## Things that will bite you

These are all load-bearing and were each learned the hard way on a release build:

- **No in-app back arrows.** Rely on native back. `✕` close buttons and paginators are fine.
- **Rest-timer notifications need exact-alarm permissions** on Android (`USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM`). Doze defers inexact alarms, so the timer fires late or never on a release build.
- **Animate modal entrances in a `useEffect` + rAF.** A synchronous `useNativeDriver` animation kicked off before the `Modal` mounts silently does nothing in release under the New Architecture.
- **Don't use `StyleSheet.absoluteFillObject` for full-screen backgrounds** — the SVG covers content. Use `ImageBackground` with explicit insets.
- **Keyboard handling goes through the shared `KeyboardAwareScreen`** (react-native-keyboard-controller). Never RN's `KeyboardAvoidingView` with `behavior={undefined}`. Changing this needs a native rebuild.

## Known rough edges

- `src/store/` (one file) and `src/stores/` (two) both exist — the program-builder store should move into `stores/`.
- Test coverage is the extracted hooks only (36 tests). Screen rendering is untested; the deeper coaching logic lives in the backend, which has 499.
- Eleven screens are still over 800 lines. The state is out of the biggest one, but the JSX has not been split into components yet.
