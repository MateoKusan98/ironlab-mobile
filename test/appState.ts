import { AppState } from 'react-native';

/**
 * Installs a stable AppState mock and hands back a `fire` to simulate the app
 * returning to the foreground.
 *
 * Both timer hooks re-sync on 'active' because JS timers freeze while
 * backgrounded. Install this once per file (in `beforeEach`, never restored) —
 * a per-test spy that gets restored mid-file leaves later mounts holding an
 * undefined subscription, which then throws on unmount.
 */
export function mockAppState() {
  const listeners: Array<(state: string) => void> = [];

  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    cb: (state: string) => void,
  ) => {
    listeners.push(cb);
    return {
      remove: () => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      },
    };
  }) as never);

  return {
    fire: (state: string = 'active') => listeners.forEach((cb) => cb(state)),
    listeners,
  };
}
