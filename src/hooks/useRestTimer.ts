import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleRestTimerAlert, cancelRestTimerAlert } from '../services/pushNotification.service';

export interface RestTimer {
  /** Seconds remaining, or null when no rest period is running. */
  restSecs: number | null;
  startRest: (seconds: number) => void;
  stopRest: () => void;
  /** Add/subtract time, recomputed from the live remaining seconds. */
  adjustRest: (delta: number) => void;
}

/** Vibration pattern played when the rest period elapses. */
const REST_DONE_PATTERN = [0, 200, 100, 200, 100, 400];

/**
 * The between-sets rest countdown.
 *
 * Everything is derived from an ABSOLUTE end time (`restEndAtRef`) rather than a
 * decrementing counter, because JS timers freeze while the app is backgrounded —
 * a counter would drift by exactly the time spent away. The end time is also
 * mirrored to disk so the countdown survives the screen unmounting (minimize to a
 * tab, app backgrounded or killed), keyed by session so a stale timer can't leak
 * into a different workout.
 *
 * A background-safe OS notification is scheduled alongside, so rest still beeps
 * when the app isn't foregrounded. It is deliberately NOT cancelled on unmount —
 * leaving the screen shouldn't kill an in-progress rest; only an explicit
 * skip/finish/cancel does.
 */
export function useRestTimer(sessionId: string): RestTimer {
  const [restSecs, setRestSecs] = useState<number | null>(null);
  // Absolute wall-clock time (ms) the rest period ends.
  const restEndAtRef = useRef<number | null>(null);
  // Id of the scheduled OS notification that beeps when rest ends.
  const restNotifIdRef = useRef<string | null>(null);
  const restPersistKey = `activeRest:${sessionId}`;

  const startRest = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    const endAt = Date.now() + seconds * 1000;
    restEndAtRef.current = endAt;
    setRestSecs(seconds);
    cancelRestTimerAlert(restNotifIdRef.current);
    restNotifIdRef.current = null;
    // Persist the absolute end time immediately, then attach the notification id
    // once it's scheduled so a remount can still cancel it.
    AsyncStorage.setItem(restPersistKey, JSON.stringify({ endAt })).catch(() => {});
    scheduleRestTimerAlert(seconds).then((id) => {
      restNotifIdRef.current = id;
      AsyncStorage.setItem(restPersistKey, JSON.stringify({ endAt, notifId: id })).catch(() => {});
    });
  }, [restPersistKey]);

  const stopRest = useCallback(() => {
    restEndAtRef.current = null;
    setRestSecs(null);
    cancelRestTimerAlert(restNotifIdRef.current);
    restNotifIdRef.current = null;
    AsyncStorage.removeItem(restPersistKey).catch(() => {});
  }, [restPersistKey]);

  const adjustRest = useCallback((delta: number) => {
    const remaining = restEndAtRef.current
      ? Math.max(0, Math.round((restEndAtRef.current - Date.now()) / 1000))
      : 0;
    const next = remaining + delta;
    if (next <= 0) stopRest();
    else startRest(next);
  }, [startRest, stopRest]);

  // Countdown tick — remaining seconds are recomputed from the absolute end time
  // each second, so the display self-corrects after a return from the background.
  useEffect(() => {
    if (restSecs === null) return;
    if (restSecs <= 0) {
      Vibration.vibrate(REST_DONE_PATTERN);
      // Don't cancel the notification here — let it fire so the sound plays even
      // if the screen is in the foreground (the handler suppresses its banner).
      restEndAtRef.current = null;
      restNotifIdRef.current = null;
      AsyncStorage.removeItem(restPersistKey).catch(() => {});
      setRestSecs(null);
      return;
    }
    const id = setTimeout(() => {
      const remaining = restEndAtRef.current
        ? Math.max(0, Math.round((restEndAtRef.current - Date.now()) / 1000))
        : 0;
      setRestSecs(remaining);
    }, 1000);
    return () => clearTimeout(id);
  }, [restSecs, restPersistKey]);

  // Re-sync the visible countdown when returning from the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (restEndAtRef.current !== null) {
        setRestSecs(Math.max(0, Math.round((restEndAtRef.current - Date.now()) / 1000)));
      }
    });
    return () => sub.remove();
  }, []);

  // Restore a countdown that was running when the screen was last torn down.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(restPersistKey).then((raw) => {
      if (cancelled || !raw) return;
      try {
        const { endAt, notifId } = JSON.parse(raw) as { endAt: number; notifId?: string | null };
        const remaining = Math.round((endAt - Date.now()) / 1000);
        if (remaining > 0) {
          restEndAtRef.current = endAt;
          restNotifIdRef.current = notifId ?? null;
          setRestSecs(remaining);
        } else {
          AsyncStorage.removeItem(restPersistKey).catch(() => {});
        }
      } catch {
        AsyncStorage.removeItem(restPersistKey).catch(() => {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [restPersistKey]);

  return { restSecs, startRest, stopRest, adjustRest };
}
