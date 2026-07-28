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
