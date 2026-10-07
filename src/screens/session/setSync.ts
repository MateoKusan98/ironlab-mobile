import { isAxiosError } from 'axios';
import { sessionService, SessionSet } from '../../services/session.service';
import type { Exercise, LocalSet } from './workoutState';
import { LiftingUnit, toKg } from '../../units/weight';

/**
 * Logging a set without signal (2026-10-07).
 *
 * A failed save used to un-tick the set and say "Could not save set. Check connection."
 * In a basement gym that meant tapping the same set again and again between attempts, or
 * giving up on logging the session. Now a set is ticked the moment the athlete taps it;
 * a save that fails for want of signal leaves it ticked, marked "not synced", saved in the
 * workout draft on the phone, and retried until it lands.
 *
 * Two things keep a late or repeated save honest:
 *  - `clientSetId` makes the server's create idempotent, so a retry whose first attempt
 *    actually landed can never log the set twice (a duplicate double-counts the set in the
 *    weekly volume budget and the e1RM history).
 *  - `performedAt` carries when the set was done, so a set synced half an hour later keeps
 *    its real place in the rest-time and PR-timeline stats.
 */

/**
 * Backoff between retries while sets are queued. Starts short because the commonest
 * failure is a dead keep-alive socket or a moment between rooms, and stops at 30s — a
 * retry is one small request, and the athlete should not walk out of the basement and
 * wait another minute to see their sets land.
 */
export const SYNC_RETRY_DELAYS_MS = [3_000, 6_000, 12_000, 20_000, 30_000];

export const retryDelayFor = (attempt: number): number =>
  SYNC_RETRY_DELAYS_MS[Math.min(attempt, SYNC_RETRY_DELAYS_MS.length - 1)];

/** Unique within a session, which is all the server's index asks of it. */
export function newClientSetId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Whether a failed save is worth retrying. No response at all (no signal, timeout), a
 * server-side failure, rate limiting, or an expired session that the refresh flow will fix:
 * all of these say nothing about the set itself. Any other 4xx is the server rejecting
 * the set — retrying it forever would hide that, so it is surfaced instead.
 */
export function isTransientSaveError(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  const status = err.response?.status;
  if (status == null) return true;
  return status >= 500 || status === 401 || status === 408 || status === 429;
}

/** The server's own words for a rejected save, when it gave any. */
export function rejectionMessage(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  const msg = (err.response?.data as { message?: string | string[] } | undefined)?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

/** Freeze which movement a set was done as, at the moment it is ticked. */
export function loggedAsOf(ex: Exercise): NonNullable<LocalSet['loggedAs']> {
  return {
    exerciseName: ex.name,
    exerciseOrder: ex.order,
    ...(ex.substitutedFor ? { substitutedFor: ex.substitutedFor } : {}),
  };
}

const num = (v: string, parse: (s: string) => number) => (v ? parse(v) : undefined);

/**
 * Send the set's current state to the server. Returns the row the server holds, or null
 * when there was nothing to send (a set never ticked and never sent has no server copy).
 * The weight is typed in the athlete's unit and always stored in kg.
 */
export async function writeSet(
  sessionId: string,
  ex: Exercise,
  set: LocalSet,
  unit: LiftingUnit = 'kg',
): Promise<SessionSet | null> {
  const typed = num(set.weight, parseFloat);
  const values = {
    repsCompleted: num(set.reps, parseInt),
    weightUsed: typed != null && Number.isFinite(typed) ? toKg(typed, unit) : typed,
    rpe: num(set.rpe, parseFloat),
    isCompleted: set.isCompleted,
  };
  if (set.id) return sessionService.updateSet(set.id, values);
  if (!set.isCompleted && !set.clientSetId) return null;

  const as = set.loggedAs ?? loggedAsOf(ex);
  return sessionService.addSet(sessionId, {
    exerciseName: as.exerciseName,
    exerciseOrder: as.exerciseOrder,
    ...(as.substitutedFor ? { substitutedFor: as.substitutedFor } : {}),
    setNumber: set.setNumber,
    targetReps: set.targetReps,
    targetWeight: set.targetWeight,
    targetRpe: set.targetRpe,
    ...values,
    clientSetId: set.clientSetId,
    performedAt: set.performedAt,
  });
}

export interface LocatedSet {
  exIdx: number;
  ex: Exercise;
  set: LocalSet;
}

/** Find a set by its uid wherever it now sits — exercises can be added, removed or moved. */
export function findSet(exercises: Exercise[], uid: string): LocatedSet | null {
  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const set = exercises[exIdx].sets.find((s) => s.uid === uid);
    if (set) return { exIdx, ex: exercises[exIdx], set };
  }
  return null;
}

/** Merge a patch into one set, located by uid. */
export function patchSetByUid(exercises: Exercise[], uid: string, patch: Partial<LocalSet>): Exercise[] {
  return exercises.map((ex) =>
    ex.sets.some((s) => s.uid === uid)
      ? { ...ex, sets: ex.sets.map((s) => (s.uid === uid ? { ...s, ...patch } : s)) }
      : ex,
  );
}

/**
 * Sets waiting to be retried, oldest first — sent in the order they were done, so each
 * one's PR check runs against the sets that really came before it.
 */
export function queuedSets(exercises: Exercise[]): LocatedSet[] {
  const queued: LocatedSet[] = [];
  exercises.forEach((ex, exIdx) => {
    for (const set of ex.sets) if (set.unsynced && !set.isSaving) queued.push({ exIdx, ex, set });
  });
  return queued.sort((a, b) => (a.set.performedAt ?? '').localeCompare(b.set.performedAt ?? ''));
}

export function countUnsynced(exercises: Exercise[]): number {
  return exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.unsynced).length, 0);
}

/**
 * Remember that the athlete deleted this set, so its server copy is deleted and never
 * comes back on resume. A set deleted while its save was still queued is remembered by
 * clientSetId too: that save may have landed after all, under an id the phone never saw.
 * Returns the server id to delete now, if there is one.
 */
export function rememberRemoval(set: LocalSet, removed: Set<string>): string | undefined {
  if (set.clientSetId) removed.add(set.clientSetId);
  if (set.id) removed.add(set.id);
  return set.id;
}
