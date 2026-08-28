import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PRResult, SessionSet } from '../../services/session.service';

/**
 * The in-progress workout's state model, plus the local persistence that keeps it
 * alive across a trip out of the screen.
 *
 * The screen used to rebuild itself from two server-side sources on every mount:
 * the plan it was launched with, and the sets already logged. Everything that
 * lived only in the athlete's head — an exercise they removed, one they added or
 * swapped, a technique rating, a note, reps typed but not yet ticked off — was
 * gone the moment the screen unmounted, and a removed exercise came back from the
 * plan. The draft below is the missing third source: the shape of the session as
 * the athlete has actually rearranged it.
 *
 * On resume the server stays authoritative for anything it has saved (set ids,
 * completed values, PRs); the draft is authoritative for structure and for input
 * that never reached the server.
 */

// Stable, monotonically-increasing client-side id for a set row. Unlike
// setNumber (a display position that shifts when sets are added/removed) this
// never changes for the life of a row, so async saves and removals always
// target the right set even after the list has been reordered.
let setUidCounter = 0;
export const nextSetUid = () => `set-${++setUidCounter}`;

export interface LocalSet {
  id?: string;
  // Stable client-side identity (see nextSetUid). Used for React keys and to
  // patch the correct set after an async save, independent of its index.
  uid: string;
  setNumber: number;
  reps: string;
  weight: string;
  rpe: string;
  // What the plan prescribed for this set — sent to the API so the coach can
  // compare prescribed-vs-actual RPE and drive progression. Undefined for sets
  // added manually mid-workout (no prescription).
  targetReps?: number;
  targetWeight?: number;
  targetRpe?: number;
  isCompleted: boolean;
  isSaving?: boolean;
  prs?: PRResult[];
}

export interface Exercise {
  name: string;
  order: number;
  sets: LocalSet[];
  isExpanded: boolean;
  techniqueRating?: number;
  exerciseNotes?: string;
  // Coaching cue from the generated plan (e.g. "keep elbows tucked"). Surfaced
  // during the workout so the user knows what to watch — and can answer the
  // Technique self-report meaningfully instead of guessing.
  cue?: string;
}

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rpe?: number;
  cue?: string;
}

// ---------------------------------------------------------------- persistence

const DRAFT_PREFIX = 'activeWorkout:draft:v1:';
const draftKey = (sessionId: string) => `${DRAFT_PREFIX}${sessionId}`;

export interface WorkoutDraft {
  version: 1;
  sessionId: string;
  savedAt: number;
  exercises: Exercise[];
  /**
   * Sets the athlete deliberately deleted. The delete request is fire-and-forget,
   * so if it failed the row is still on the server — without this list the next
   * resume would faithfully "recover" a set they meant to throw away.
   */
  removedSetIds: string[];
}

export async function saveDraft(
  sessionId: string,
  exercises: Exercise[],
  removedSetIds: string[],
): Promise<void> {
  const draft: WorkoutDraft = {
    version: 1,
    sessionId,
    savedAt: Date.now(),
    // uid is regenerated on load and isSaving/prs are server-derived, so neither
    // is worth persisting.
    exercises: exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map(({ isSaving: _s, prs: _p, ...set }) => set as LocalSet),
    })),
    removedSetIds,
  };
  try {
    await AsyncStorage.setItem(draftKey(sessionId), JSON.stringify(draft));
  } catch {
    // A draft is a convenience, never a source of truth — a failed write must not
    // interrupt the workout.
  }
}

export async function loadDraft(sessionId: string): Promise<WorkoutDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutDraft;
    if (parsed?.version !== 1 || !Array.isArray(parsed.exercises)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearDraft(sessionId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(draftKey(sessionId));
  } catch {
    // ignore
  }
}

/**
 * Drop drafts belonging to any other session. A draft only has meaning while its
 * session is in progress, and sessions that ended without a clean finish (app
 * killed, a cancel that failed) would otherwise accumulate forever.
 */
export async function pruneOtherDrafts(keepSessionId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => k.startsWith(DRAFT_PREFIX) && k !== draftKey(keepSessionId));
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------- reconstruction

const renumber = (sets: LocalSet[]): LocalSet[] => sets.map((s, i) => ({ ...s, setNumber: i + 1 }));

const fromServerSet = (s: SessionSet, setNumber: number): LocalSet => ({
  id: s.id,
  uid: nextSetUid(),
  setNumber,
  reps: s.repsCompleted != null ? String(s.repsCompleted) : '',
  weight: s.weightUsed != null ? String(s.weightUsed) : '',
  rpe: s.rpe != null ? String(s.rpe) : '',
  targetReps: s.targetReps ?? undefined,
  targetWeight: s.targetWeight ?? undefined,
  targetRpe: s.targetRpe ?? undefined,
  isCompleted: s.isCompleted,
  prs: s.prs,
});

/**
 * Rebuild the exercise list from the plan and whatever has been logged. This is
 * the "revert to default" shape: the athlete's structural edits are discarded,
 * but every logged set is kept and re-attached to its exercise.
 */
export function buildFromPlan(
  planned: PlannedExercise[] | undefined,
  serverSets: SessionSet[],
): Exercise[] {
  const loggedByName = new Map<string, { order: number; sets: SessionSet[] }>();
  for (const s of serverSets) {
    const entry = loggedByName.get(s.exerciseName) ?? { order: s.exerciseOrder, sets: [] };
    entry.sets.push(s);
    loggedByName.set(s.exerciseName, entry);
  }

  // Renumber to a contiguous 1..N so a set removed earlier doesn't leave a gap
  // that confuses the display or a later add.
  const mapLogged = (sets: SessionSet[]): LocalSet[] =>
    [...sets].sort((a, b) => a.setNumber - b.setNumber).map((s, i) => fromServerSet(s, i + 1));

  // The technique self-report is stored on the exercise's first logged set that
  // carries one (see saveExerciseReview in the screen), so read it back the same way.
  const reviewOf = (sets: SessionSet[]) => ({
    exerciseNotes: sets.find((s) => s.techniqueNotes)?.techniqueNotes ?? undefined,
    techniqueRating: sets.find((s) => s.techniqueRating != null)?.techniqueRating ?? undefined,
  });

  if (!planned?.length) {
    return Array.from(loggedByName.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name, { order, sets }]) => ({
        name,
        order,
        isExpanded: true,
        sets: mapLogged(sets),
        ...reviewOf(sets),
      }));
  }

  const loaded: Exercise[] = planned.map((pe, order) => {
    const logged = loggedByName.get(pe.name);
    const loggedSets = logged ? mapLogged(logged.sets) : [];
    // Top the exercise back up to its prescribed set count with blank rows.
    const remaining: LocalSet[] = Array.from(
      { length: Math.max(0, pe.sets - loggedSets.length) },
      (_, i) => ({
        uid: nextSetUid(),
        setNumber: loggedSets.length + i + 1,
        reps: String(pe.reps),
        weight: String(pe.weight),
        rpe: '',
        targetReps: pe.reps,
        targetWeight: pe.weight,
        targetRpe: pe.rpe,
        isCompleted: false,
      }),
    );
    return {
      name: pe.name,
      order,
      isExpanded: true,
      cue: pe.cue,
      sets: [...loggedSets, ...remaining],
      ...(logged ? reviewOf(logged.sets) : {}),
    };
  });

  // Anything logged that the plan doesn't know about was added mid-workout.
  for (const [name, { order, sets }] of loggedByName) {
    if (!planned.some((pe) => pe.name === name)) {
      loaded.push({ name, order, isExpanded: true, sets: mapLogged(sets), ...reviewOf(sets) });
    }
  }
  loaded.sort((a, b) => a.order - b.order);
  return loaded;
}

/**
 * Restore the athlete's own arrangement, corrected against what the server holds.
 *
 * The draft decides which exercises exist and in what order; the server decides
 * what a saved set actually contains. A set the draft thinks is saved but the
 * server has lost reverts to unsaved input rather than vanishing, and a set the
 * server holds that the draft never saw is re-attached rather than dropped —
 * losing logged work is the one outcome worth guarding against here.
 */
export function reconcileDraft(draft: WorkoutDraft, serverSets: SessionSet[]): Exercise[] {
  const byId = new Map(serverSets.map((s) => [s.id, s]));
  const removed = new Set(draft.removedSetIds ?? []);
  const claimed = new Set<string>();

  const exercises: Exercise[] = draft.exercises.map((ex, order) => ({
    ...ex,
    order,
    sets: ex.sets.map((set) => {
      const uid = nextSetUid();
      if (!set.id) return { ...set, uid, isSaving: false, prs: undefined };
      const server = byId.get(set.id);
      if (!server) {
        // Saved, then deleted (or lost) server-side: keep what was typed, but stop
        // pretending it's persisted — otherwise a later edit would PATCH a dead id.
        return { ...set, uid, id: undefined, isCompleted: false, isSaving: false, prs: undefined };
      }
      claimed.add(set.id);
      return { ...fromServerSet(server, set.setNumber), uid };
    }),
  }));

  // Sets the server holds that this draft never recorded — saved from another
  // device, or saved after the last draft write. Re-attach them so nothing logged
  // is silently lost.
  const orphans = serverSets.filter((s) => !claimed.has(s.id) && !removed.has(s.id));
  for (const s of orphans) {
    const target = exercises.find((ex) => ex.name === s.exerciseName);
    if (target) {
      target.sets = [...target.sets, fromServerSet(s, target.sets.length + 1)];
    } else {
      exercises.push({
        name: s.exerciseName,
        order: exercises.length,
        isExpanded: true,
        sets: [fromServerSet(s, 1)],
      });
    }
  }

  return exercises.map((ex, order) => ({ ...ex, order, sets: renumber(ex.sets) }));
}

/** Ids of sets the athlete deleted that the server still has — the delete needs a retry. */
export function unresolvedDeletions(draft: WorkoutDraft, serverSets: SessionSet[]): string[] {
  const removed = new Set(draft.removedSetIds ?? []);
  return serverSets.filter((s) => removed.has(s.id)).map((s) => s.id);
}
