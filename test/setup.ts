// Test-environment shims for the mobile app.
//
// GOTCHA — one fireEvent.press per render. Firing two presses against a single
// `await render(...)` leaves RNTL v14's concurrent root mid-update, and every
// SUBSEQUENT render in the same file then silently fails to commit (queries
// come back empty even though the component is fine in isolation). Split
// multi-interaction cases into one test per interaction.
//
// Related: after a fireEvent that changes state, assert through `waitFor` —
// the re-render has not committed by the time the next query runs.

// The rest timer schedules a real OS notification so it still beeps when the app
// is backgrounded. Stub it out and hand back a predictable id.
jest.mock('../src/services/pushNotification.service', () => ({
  scheduleRestTimerAlert: jest.fn(async () => 'notif-1'),
  cancelRestTimerAlert: jest.fn(async () => {}),
}));

jest.mock('../src/services/exerciseCue.service', () => ({
  exerciseCueKey: (name: string) => name.trim().toLowerCase(),
  exerciseCueService: {
    getCues: jest.fn(async () => []),
    addCue: jest.fn(),
    deleteCue: jest.fn(async () => {}),
  },
}));

// react-native-keyboard-controller is a native module with no JS fallback, and
// the `components/ui` barrel imports it via KeyboardAwareScreen. Any component
// test that touches the barrel would otherwise fail at import time.
jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView, View } = jest.requireActual('react-native');
  return {
    KeyboardAwareScrollView: ScrollView,
    KeyboardAvoidingView: View,
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
    useKeyboardHandler: () => {},
    KeyboardController: { dismiss: jest.fn() },
  };
});

// i18n: return the supplied defaultValue (or the key) so assertions read as the
// English copy the screens declare inline, without booting the real i18n stack.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string } & Record<string, unknown>) =>
      opts?.defaultValue ?? key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));
