import { renderHook, act } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import AsyncStorageMock from '../../../test/mocks/async-storage';
import { mockAppState } from '../../../test/appState';
import { scheduleRestTimerAlert, cancelRestTimerAlert } from '../../services/pushNotification.service';
import { useRestTimer } from '../useRestTimer';

const SESSION = 'session-abc';
const KEY = `activeRest:${SESSION}`;

let appState: ReturnType<typeof mockAppState>;

/**
 * Step the countdown a second at a time. Each tick is scheduled by a React effect
 * that only runs after the previous one has re-rendered, so a single large
 * `advanceTimersByTime` would fire just the first timeout.
 */
const tick = async (seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    await act(async () => { jest.advanceTimersByTime(1_000); });
  }
};

/** Let the persistence promises settle without moving the clock. */
const flush = async () => { await act(async () => {}); };

describe('useRestTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-28T10:00:00Z'));
    AsyncStorageMock.__reset();
    appState = mockAppState();
    jest.mocked(scheduleRestTimerAlert).mockClear().mockResolvedValue('notif-1');
    jest.mocked(cancelRestTimerAlert).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('counts down from the requested duration', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    expect(result.current.restSecs).toBeNull();

    await act(async () => { result.current.startRest(90); });
    expect(result.current.restSecs).toBe(90);

    await tick(10);
    expect(result.current.restSecs).toBe(80);
  });

  it('ignores a non-positive duration', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    await act(async () => { result.current.startRest(0); });
    expect(result.current.restSecs).toBeNull();
    expect(scheduleRestTimerAlert).not.toHaveBeenCalled();
  });

  it('schedules a background-safe alert and persists the absolute end time', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    const endAt = Date.now() + 60_000;

    await act(async () => { result.current.startRest(60); });
    await flush();

    expect(scheduleRestTimerAlert).toHaveBeenCalledWith(60);
    expect(JSON.parse(AsyncStorageMock.__store.get(KEY)!)).toEqual({ endAt, notifId: 'notif-1' });
  });

  it('vibrates and clears itself when the rest period elapses', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    const { result } = await renderHook(() => useRestTimer(SESSION));

    await act(async () => { result.current.startRest(3); });
    await tick(3);

    expect(result.current.restSecs).toBeNull();
    expect(vibrate).toHaveBeenCalled();
    // The notification is deliberately NOT cancelled — it must still fire so the
    // sound plays even with the screen foregrounded.
    expect(AsyncStorageMock.__store.has(KEY)).toBe(false);
    vibrate.mockRestore();
  });

  it('stopRest cancels the alert and clears the persisted timer', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    await act(async () => { result.current.startRest(120); });
    await flush();

    await act(async () => { result.current.stopRest(); });
    await flush();

    expect(result.current.restSecs).toBeNull();
    expect(cancelRestTimerAlert).toHaveBeenCalledWith('notif-1');
    expect(AsyncStorageMock.__store.has(KEY)).toBe(false);
  });

  it('adjustRest adds time relative to what is actually remaining', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    await act(async () => { result.current.startRest(60); });
    await tick(20); // 40s left

    await act(async () => { result.current.adjustRest(15); });
    expect(result.current.restSecs).toBe(55);
  });

  it('adjustRest below zero stops the rest instead of going negative', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    await act(async () => { result.current.startRest(20); });

    await act(async () => { result.current.adjustRest(-30); });
    expect(result.current.restSecs).toBeNull();
  });

  it('self-corrects when the JS thread stalls and ticks are missed', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    await act(async () => { result.current.startRest(120); });

    // Wall clock jumps 30s with no timer firing — Doze, a busy JS thread, or a
    // brief background stint with no AppState transition. A naive decrementing
    // counter would come back reading 119; deriving from the absolute end time
    // is what keeps rest honest.
    await act(async () => { jest.setSystemTime(Date.now() + 30_000); });
    await tick(1);

    expect(result.current.restSecs).toBe(89);
  });

  it('re-syncs from the absolute end time after returning from the background', async () => {
    const { result } = await renderHook(() => useRestTimer(SESSION));
    await act(async () => { result.current.startRest(120); });

    // JS timers freeze while backgrounded, so the counter would have drifted;
    // only the wall clock moves.
    await act(async () => { jest.setSystemTime(Date.now() + 45_000); });
    await act(async () => { appState.fire('active'); });

    expect(result.current.restSecs).toBe(75);
  });

  it('restores a countdown that was running when the screen was torn down', async () => {
    AsyncStorageMock.__store.set(
      KEY,
      JSON.stringify({ endAt: Date.now() + 42_000, notifId: 'notif-9' }),
    );

    const { result } = await renderHook(() => useRestTimer(SESSION));
    await flush();

    expect(result.current.restSecs).toBe(42);
  });

  it('discards a persisted timer that already expired', async () => {
    AsyncStorageMock.__store.set(
      KEY,
      JSON.stringify({ endAt: Date.now() - 5_000, notifId: 'notif-9' }),
    );

    const { result } = await renderHook(() => useRestTimer(SESSION));
    await flush();

    expect(result.current.restSecs).toBeNull();
    expect(AsyncStorageMock.__store.has(KEY)).toBe(false);
  });

  it('survives a malformed persisted payload', async () => {
    AsyncStorageMock.__store.set(KEY, 'not-json');

    const { result } = await renderHook(() => useRestTimer(SESSION));
    await flush();

    expect(result.current.restSecs).toBeNull();
    expect(AsyncStorageMock.__store.has(KEY)).toBe(false);
  });

  it('keys persistence by session so a stale timer cannot leak into another workout', async () => {
    AsyncStorageMock.__store.set(
      'activeRest:some-other-session',
      JSON.stringify({ endAt: Date.now() + 90_000 }),
    );

    const { result } = await renderHook(() => useRestTimer(SESSION));
    await flush();

    expect(result.current.restSecs).toBeNull();
  });
});
