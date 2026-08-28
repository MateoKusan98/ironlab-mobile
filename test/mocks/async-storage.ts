/**
 * In-memory AsyncStorage. The rest timer and cue reminders both persist to disk,
 * and the tests assert on what was written, so this keeps a real readable store
 * rather than no-op stubs.
 */
const store = new Map<string, string>();

const AsyncStorageMock = {
  getItem: jest.fn(async (key: string) => store.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { store.delete(key); }),
  getAllKeys: jest.fn(async () => [...store.keys()]),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => store.delete(k)); }),
  clear: jest.fn(async () => { store.clear(); }),
  /** Test-only: reset between cases. */
  __reset: () => {
    store.clear();
    AsyncStorageMock.getItem.mockClear();
    AsyncStorageMock.setItem.mockClear();
    AsyncStorageMock.removeItem.mockClear();
    AsyncStorageMock.getAllKeys.mockClear();
    AsyncStorageMock.multiRemove.mockClear();
  },
  __store: store,
};

export default AsyncStorageMock;
