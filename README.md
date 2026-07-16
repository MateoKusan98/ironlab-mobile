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
| Release APK | `npm run build:local` → `ironlab-latest.apk` |

## Layout

```
src/
  screens/        61 screens, grouped by domain (session, ai-coach, nutrition, client, admin, …)
  components/ui/  27 shared primitives — Button, Slider, Pagination, KeyboardAwareScreen, …
  services/       typed API clients, one per backend module
  hooks/          React Query wrappers (server state)
  stores/         Zustand (client state: auth, settings)
  i18n/           8 locales: en, hr, bs, sr, sl, mk, sq, cnr
  theme/          palette + typography tokens
```

Server state is React Query; client state is Zustand. If you're adding a screen that reads from the API, it goes through `hooks/` — not a `useEffect` + `fetch`.

## Things that will bite you

These are all load-bearing and were each learned the hard way on a release build:

- **No in-app back arrows.** Rely on native back. `✕` close buttons and paginators are fine.
- **Rest-timer notifications need exact-alarm permissions** on Android (`USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM`). Doze defers inexact alarms, so the timer fires late or never on a release build.
- **Animate modal entrances in a `useEffect` + rAF.** A synchronous `useNativeDriver` animation kicked off before the `Modal` mounts silently does nothing in release under the New Architecture.
- **Don't use `StyleSheet.absoluteFillObject` for full-screen backgrounds** — the SVG covers content. Use `ImageBackground` with explicit insets.
- **Keyboard handling goes through the shared `KeyboardAwareScreen`** (react-native-keyboard-controller). Never RN's `KeyboardAvoidingView` with `behavior={undefined}`. Changing this needs a native rebuild.

## Known rough edges

- `src/store/` (one file) and `src/stores/` (two) both exist — the program-builder store should move into `stores/`.
- There are no tests here yet; the logic worth testing lives in the backend, which has 444.
- `no-explicit-any` is a warning, not an error — mostly in the API service layer, where responses aren't fully typed yet.
