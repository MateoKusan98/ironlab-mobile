import { renderHook, act } from '@testing-library/react-native';
import { mockAppState } from '../../../test/appState';
import { useWorkoutTimer, IDLE_LIMIT_MS } from '../useWorkoutTimer';

let appState: ReturnType<typeof mockAppState>;

/** Run timers forward. Modern fake timers move Date.now() in step, so the hook's
 *  wall-clock arithmetic stays consistent with its interval ticks. */
const advance = async (ms: number) => {
  await act(async () => { jest.advanceTimersByTime(ms); });
};

/** Jump the wall clock only — JS timers are frozen while the app is backgrounded. */
const backgroundFor = async (ms: number) => {
  await act(async () => { jest.setSystemTime(Date.now() + ms); });
};

describe('useWorkoutTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-28T10:00:00Z'));
    appState = mockAppState();
  });
  afterEach(() => jest.useRealTimers());

  it('counts active seconds while running', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    expect(result.current.elapsedSeconds).toBe(0);

    await advance(5_000);
    expect(result.current.elapsedSeconds).toBe(5);

    await advance(55_000);
    expect(result.current.elapsedSeconds).toBe(60);
    expect(result.current.isPaused).toBe(false);
  });

  it('auto-pauses after the idle limit and rewinds to the last activity', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());

    await advance(60_000);
    await act(async () => { result.current.markActivity(); }); // last activity at t=60s

    // Walk past the idle limit with no further activity.
    await advance(IDLE_LIMIT_MS + 5_000);

    expect(result.current.isPaused).toBe(true);
    // The idle gap is discarded: only the 60s before the last activity counts.
    expect(result.current.elapsedSeconds).toBe(60);
  });

  it('does not keep counting while paused', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    await advance(30_000);
    await act(async () => { result.current.markActivity(); });
    await advance(IDLE_LIMIT_MS + 1_000);
    expect(result.current.isPaused).toBe(true);

    const frozen = result.current.elapsedSeconds;
    await advance(120_000);
    expect(result.current.elapsedSeconds).toBe(frozen);
  });

  it('resumes into a fresh segment, banking the previous one', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    await advance(30_000);
    await act(async () => { result.current.markActivity(); });
    await advance(IDLE_LIMIT_MS + 1_000);
    expect(result.current.elapsedSeconds).toBe(30);

    await act(async () => { result.current.resume(); });
    expect(result.current.isPaused).toBe(false);

    await advance(10_000);
    // 30 banked + 10 in the new segment — the idle stretch is still excluded.
    expect(result.current.elapsedSeconds).toBe(40);
  });

  it('markActivity un-pauses an auto-paused clock', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    await advance(IDLE_LIMIT_MS + 1_000);
    expect(result.current.isPaused).toBe(true);

    await act(async () => { result.current.markActivity(); });
    expect(result.current.isPaused).toBe(false);
  });

  it('resume is a no-op when already running', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    await advance(10_000);
    await act(async () => { result.current.resume(); });
    expect(result.current.elapsedSeconds).toBe(10);

    await advance(5_000);
    expect(result.current.elapsedSeconds).toBe(15);
  });

  it('syncStart adopts the server startedAt for a resumed session', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    const startedAt = Date.now() - 20 * 60_000; // started 20 minutes ago

    await act(async () => { result.current.syncStart(startedAt); });
    expect(result.current.elapsedSeconds).toBe(20 * 60);

    await advance(5_000);
    expect(result.current.elapsedSeconds).toBe(20 * 60 + 5);
  });

  it('syncStart does not immediately trip the idle auto-pause', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    // A session started hours ago would look "idle" if syncStart didn't also
    // reset the activity marker.
    await act(async () => { result.current.syncStart(Date.now() - 3 * 60 * 60_000); });

    await advance(2_000);
    expect(result.current.isPaused).toBe(false);
  });

  it('catches an idle period that elapsed while backgrounded', async () => {
    const { result } = await renderHook(() => useWorkoutTimer());
    await advance(30_000);
    await act(async () => { result.current.markActivity(); });

    await backgroundFor(IDLE_LIMIT_MS + 60_000);
    await act(async () => { appState.fire('active'); });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.elapsedSeconds).toBe(30);
  });
});
