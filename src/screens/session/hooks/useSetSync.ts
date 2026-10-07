import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { sessionService, PRResult } from '../../../services/session.service';
import { Exercise } from '../workoutState';
import type { LiftingUnit } from '../../../units/weight';
import {
  LocatedSet,
  countUnsynced,
  isTransientSaveError,
  newClientSetId,
  patchSetByUid,
  queuedSets,
  rejectionMessage,
  retryDelayFor,
  writeSet,
} from '../setSync';

export type PushResult =
  | { status: 'saved'; prs?: PRResult[] }
  | { status: 'queued' }
  | { status: 'rejected'; message?: string }
  | { status: 'gone' };

export interface SetSyncDeps {
  sessionId: string;
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  removedSetIdsRef: React.MutableRefObject<Set<string>>;
  /** The unit the athlete typed the weights in; the server is sent kg. */
  unit: LiftingUnit;
  /** Off until the session has been restored — there is nothing to sync before that. */
  enabled: boolean;
  /** A queued set finally landed. */
  onLateSave: (located: LocatedSet) => void;
}

/**
 * The queue behind "a set is ticked the moment you tap it" — see setSync.ts for why.
 *
 * `pushSet` sends one set now. Anything that fails for want of signal stays marked
 * `unsynced` and `flushPending` retries it, oldest first, on a backoff, whenever the app
 * comes back to the foreground, and once more before the workout is finished.
 */
export function useSetSync(deps: SetSyncDeps) {
  const { sessionId, exercises, setExercises, removedSetIdsRef, unit, enabled, onLateSave } = deps;
  // Async code below reads the newest exercises through this, never a stale closure.
  // It can still trail the latest setState by one render; the server's idempotent create
  // is what makes that harmless — a set sent twice is still one set.
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  const inFlightRef = useRef(new Map<string, Promise<PushResult>>());
  const flushRef = useRef<Promise<boolean> | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const unsyncedCount = countUnsynced(exercises);

  const patch = (uid: string, p: Parameters<typeof patchSetByUid>[2]) =>
    setExercises((prev) => patchSetByUid(prev, uid, p));

  const wasRemovedMeanwhile = (set: LocatedSet['set']) =>
    (!!set.clientSetId && removedSetIdsRef.current.has(set.clientSetId)) ||
    (!!set.id && removedSetIdsRef.current.has(set.id));

  const send = async ({ ex, set: current }: LocatedSet): Promise<PushResult> => {
    // Drafts from before the queue carry no clientSetId; give one before the first send.
    const set = current.clientSetId || current.id ? current : { ...current, clientSetId: newClientSetId() };
    patch(set.uid, { isSaving: true, clientSetId: set.clientSetId });
    try {
      const saved = await writeSet(sessionId, ex, set, unit);
      if (saved && wasRemovedMeanwhile(set)) {
        // Deleted while the save was in the air — the row it made must not outlive it.
        removedSetIdsRef.current.add(saved.id);
        sessionService.deleteSet(saved.id).catch(() => {});
        return { status: 'gone' };
      }
      const created = saved && !set.id ? { id: saved.id, prs: saved.prs } : {};
      patch(set.uid, { isSaving: false, unsynced: false, ...created });
      return { status: 'saved', prs: saved && !set.id ? saved.prs : undefined };
    } catch (err) {
      if (wasRemovedMeanwhile(set)) return { status: 'gone' };
      if (isTransientSaveError(err)) {
        patch(set.uid, { isSaving: false, unsynced: true });
        return { status: 'queued' };
      }
      // The server answered and said no. Put the tick back where the server has it and
      // say so, rather than retrying a set that will never be accepted.
      patch(set.uid, { isSaving: false, unsynced: false, isCompleted: !set.isCompleted });
      return { status: 'rejected', message: rejectionMessage(err) };
    }
  };

  /** Send one set's current state. A second call while the first is in the air joins it. */
  const pushSet = (located: LocatedSet): Promise<PushResult> => {
    const uid = located.set.uid;
    const pending = inFlightRef.current.get(uid);
    if (pending) return pending;
    const request = send(located).finally(() => inFlightRef.current.delete(uid));
    inFlightRef.current.set(uid, request);
    return request;
  };

  /**
   * Retry every queued set, oldest first. Resolves true when nothing is left waiting,
   * false when the signal is still not there (the backoff then schedules the next try).
   */
  const flushPending = (): Promise<boolean> => {
    if (flushRef.current) return flushRef.current;
    const run = (async () => {
      // A save already in the air decides the answer as much as the queue does — and a
      // failure it is about to report may not have reached exercisesRef yet.
      const inFlight = await Promise.all([...inFlightRef.current.values()]);
      if (inFlight.some((r) => r.status === 'queued')) {
        setRetryAttempt((a) => a + 1);
        return false;
      }
      for (const located of queuedSets(exercisesRef.current)) {
        const result = await pushSet(located);
        if (result.status === 'queued') {
          setRetryAttempt((a) => a + 1);
          return false;
        }
        if (result.status === 'saved') onLateSave(located);
        if (result.status === 'rejected') {
          Alert.alert(
            'Set not saved',
            `Set ${located.set.setNumber} of ${located.ex.name} was not accepted${result.message ? `: ${result.message}` : '.'}`,
          );
        }
      }
      setRetryAttempt(0);
      return true;
    })().finally(() => { flushRef.current = null; });
    flushRef.current = run;
    return run;
  };

  const latestFlushRef = useRef(flushPending);
  latestFlushRef.current = flushPending;

  // The backoff. Re-armed whenever the queue changes size or a retry fails.
  useEffect(() => {
    if (!enabled || unsyncedCount === 0) return;
    const timer = setTimeout(() => { latestFlushRef.current(); }, retryDelayFor(retryAttempt));
    return () => clearTimeout(timer);
  }, [enabled, unsyncedCount, retryAttempt]);

  // Coming back to the app is the likeliest moment the signal came back with it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && countUnsynced(exercisesRef.current) > 0) latestFlushRef.current();
    });
    return () => sub.remove();
  }, []);

  return { pushSet, flushPending, unsyncedCount };
}
