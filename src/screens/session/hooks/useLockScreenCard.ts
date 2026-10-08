import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../stores/settings.store';
import { clearLiveWorkoutCard, showLiveWorkoutCard } from '../../../services/liveWorkoutNotification.service';
import { LiftingUnit, unitLabel } from '../../../units/weight';
import { Exercise } from '../workoutState';
import { lockScreenCard } from '../lockScreenCard';

// Typing "162.5" into a weight box is four edits; posting a notification for each would
// churn the shade for nothing. The card only has to be right by the time the phone is
// locked, which is never within a second of the last keystroke.
const UPDATE_DEBOUNCE_MS = 1000;

export interface LockScreenCardDeps {
  exercises: Exercise[];
  restEndsAt: number | null;
  exName: (name: string) => string;
  unit: LiftingUnit;
  /** False until the session has loaded — a card built from an empty list says "all done". */
  enabled: boolean;
}

const formatClock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Keeps the lock-screen card in step with the workout (see lockScreenCard.ts).
 *
 * Leaving the screen does NOT clear the card — minimising the workout is exactly when
 * the athlete wants it. Only `end()` (finish or cancel) does, so call it there.
 */
export function useLockScreenCard({ exercises, restEndsAt, exName, unit, enabled }: LockScreenCardDeps) {
  const { t } = useTranslation();
  const turnedOn = useSettingsStore((s) => s.lockScreenCard);
  const endedRef = useRef(false);
  const lastPostedRef = useRef<string | null>(null);

  // Built on every render (cheap) but the effect keys on its TEXT: the workout clock
  // re-renders this screen every second, and keying on the inputs would restart the
  // debounce each time so the card would never be posted at all.
  const card = enabled && turnedOn
    ? lockScreenCard({ exercises, restEndsAt, exName, unitLabel: unitLabel(unit), t, formatClock })
    : null;
  const title = card?.title;
  const body = card?.body;

  useEffect(() => {
    if (!enabled || endedRef.current) return;
    if (!turnedOn) {
      lastPostedRef.current = null;
      clearLiveWorkoutCard();
      return;
    }
    if (title == null || body == null) return;
    const key = `${title}\n${body}`;
    if (key === lastPostedRef.current) return;
    const timer = setTimeout(() => {
      if (endedRef.current) return;
      lastPostedRef.current = key;
      showLiveWorkoutCard({ title, body });
    }, UPDATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, body, enabled, turnedOn]);

  const end = useCallback(() => {
    endedRef.current = true;
    clearLiveWorkoutCard();
  }, []);

  return { end };
}
