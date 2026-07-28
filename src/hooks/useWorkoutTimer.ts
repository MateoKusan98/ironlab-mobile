import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** Auto-pause once this much time passes with no completed set. */
export const IDLE_LIMIT_MS = 15 * 60 * 1000;

export interface WorkoutTimer {
  /** Active seconds elapsed — idle gaps are excluded. */
  elapsedSeconds: number;
  isPaused: boolean;
  /** Resume counting from now. No-op when already running. */
  resume: () => void;
  /** Record real activity (a logged set). Resets the idle window and un-pauses. */
  markActivity: () => void;
  /**
   * Adopt the server's `startedAt` once the session loads, so a resumed workout
   * shows the true elapsed time rather than counting from when the screen mounted.
   */
  syncStart: (startedAtMs: number) => void;
}

/**
 * The active-time clock for a workout.
 *
 * The visible elapsed time is `accumulatedRef` (active seconds banked from previous
 * running segments) plus the live seconds since `startTimeRef` (the start of the
 * current running segment). Pausing banks the current segment and freezes the display.
 *
 * Idle time is never counted: after `idleLimitMs` with no activity the clock
 * auto-pauses and rewinds to the last activity, so a forgotten workout left open
 * overnight doesn't report a 9-hour session.
 */
export function useWorkoutTimer(idleLimitMs: number = IDLE_LIMIT_MS): WorkoutTimer {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Seeded on mount rather than in the useRef initializer: reading the clock
  // during render is impure (it re-evaluates on every render, and React may
  // render speculatively). Nothing reads these before the mount effect runs.
  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  // Wall-clock time of the last real activity (set logged, manual resume, or
  // session start). Used to auto-pause after a stretch of inactivity.
  const lastActivityRef = useRef(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    startTimeRef.current = now;
    lastActivityRef.current = now;
  }, []);

  // Freeze the clock at wall-clock time `at`, banking the active portion of the
  // current segment. Idle time after the last activity is intentionally excluded.
  const pauseAt = useCallback((at: number) => {
    if (isPausedRef.current) return;
    accumulatedRef.current += Math.max(0, Math.floor((at - startTimeRef.current) / 1000));
    isPausedRef.current = true;
    setIsPaused(true);
    setElapsedSeconds(accumulatedRef.current);
  }, []);

  // Resume counting from now — starts a fresh active segment.
  const resume = useCallback(() => {
    if (!isPausedRef.current) return;
    startTimeRef.current = Date.now();
    lastActivityRef.current = Date.now();
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isPausedRef.current) resume();
  }, [resume]);

  const syncStart = useCallback((startedAtMs: number) => {
    startTimeRef.current = startedAtMs;
    accumulatedRef.current = 0;
    // Treat the resume as activity so a just-reopened session doesn't trip the
    // idle auto-pause immediately.
    lastActivityRef.current = Date.now();
    setElapsedSeconds(Math.floor((Date.now() - startedAtMs) / 1000));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (isPausedRef.current) return;
      const now = Date.now();
      if (now - lastActivityRef.current >= idleLimitMs) {
        // Auto-pause and freeze at the last activity so the idle gap isn't counted.
        pauseAt(lastActivityRef.current);
        return;
      }
      setElapsedSeconds(accumulatedRef.current + Math.floor((now - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [pauseAt, idleLimitMs]);

  // JS timers freeze in the background, so the idle auto-pause can't fire while
  // away. Catch it on return: if we were idle past the limit, pause and freeze at
  // the last activity so the gap isn't counted.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!isPausedRef.current && Date.now() - lastActivityRef.current >= idleLimitMs) {
        pauseAt(lastActivityRef.current);
      }
    });
    return () => sub.remove();
  }, [pauseAt, idleLimitMs]);

  return { elapsedSeconds, isPaused, resume, markActivity, syncStart };
}
