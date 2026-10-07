import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PRResult, SessionSet } from '../../services/session.service';
import type { SubstituteTarget } from '../../services/ai-coach.service';
import { LiftingUnit, convertTyped, deliveredPrescriptionKg, loggedInUnit, prescribedInUnit } from '../../units/weight';

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
  /** What the athlete reads and types — in their lifting unit, not necessarily kg. */
  weight: string;
  rpe: string;
  // What the plan prescribed for this set — sent to the API so the coach can
  // compare prescribed-vs-actual RPE and drive progression. Undefined for sets
  // added manually mid-workout (no prescription).
  targetReps?: number;
  targetWeight?: number;
  targetRpe?: number;
  /**
   * A mid-session load cut the athlete accepted (see LoadAdjustCard). Kept SEPARATE from
   * targetWeight on purpose: targetWeight is what the plan prescribed and is what the API
   * receives, so the debrief can still see that the athlete went under the prescription.
   * Overwriting it would erase the cut from the record and report perfect compliance on a
   * session that was deliberately backed off. This field only changes what the plate
   * stack draws — the bar the athlete actually has to build.
   */
  adjustedWeight?: number;
  isCompleted: boolean;
  isSaving?: boolean;
  prs?: PRResult[];
  /**
   * The phone's id for this set, sent with every save so a retry lands on the row it
   * already created instead of logging the set twice. Assigned at the first tick and
   * kept for the life of the row (unlike `uid`, which is regenerated on every resume).
   */
  clientSetId?: string;
  /** When the athlete ticked it — sent so a set that syncs late keeps its real time. */
  performedAt?: string;
  /**
   * The server does not have the athlete's latest word on this set yet: a save failed for
   * want of signal and is queued for retry (see setSync.ts). Persisted with the draft, so
   * the queue survives the app being closed.
   */
  unsynced?: boolean;
  /**
   * The exercise this set was DONE as, frozen at the tick. A set still queued when the
   * athlete swaps the exercise must be saved as the movement they actually lifted, not
   * the one the card says now.
   */
  loggedAs?: { exerciseName: string; exerciseOrder: number; substitutedFor?: string };
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
  // This movement is loaded by hanging plates on a barbell, so its prescribed
  // weights can be drawn as a loaded bar. Set from the plan; absent on exercises
  // added or substituted mid-workout, which simply get no drawing.
  barLoaded?: boolean;
  /**
   * The PRESCRIBED movement this one was swapped in for, sent with every set so the server
   * credits the work to the slot it replaced. Kept across repeated swaps (Good Morning →
   * Leg Press → Hack Squat still replaced Good Morning) and cleared on a swap back.
   */
  substitutedFor?: string;
  /**
   * Warm-up weights the athlete has ticked off (see warmup.ts). Local only — warm-ups
   * are never logged as sets — but kept on the exercise so the draft carries them.
   */
  warmupsDone?: number[];
}

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rpe?: number;
  cue?: string;
  barLoaded?: boolean;
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
  /** The unit the typed weights are in. Absent on drafts from before pounds: kg. */
  unit?: LiftingUnit;
}

export async function saveDraft(
  sessionId: string,
  exercises: Exercise[],
  removedSetIds: string[],
  unit: LiftingUnit = 'kg',
): Promise<void> {
  const draft: WorkoutDraft = {
    version: 1,
    sessionId,
    savedAt: Date.now(),
    unit,
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

const fromServerSet = (s: SessionSet, setNumber: number, unit: LiftingUnit): LocalSet => ({
  id: s.id,
  uid: nextSetUid(),
  setNumber,
  reps: s.repsCompleted != null ? String(s.repsCompleted) : '',
  weight: s.weightUsed != null ? String(loggedInUnit(s.weightUsed, unit)) : '',
  rpe: s.rpe != null ? String(s.rpe) : '',
  targetReps: s.targetReps ?? undefined,
  targetWeight: s.targetWeight ?? undefined,
  targetRpe: s.targetRpe ?? undefined,
  isCompleted: s.isCompleted,
  prs: s.prs,
  clientSetId: s.clientSetId ?? undefined,
});

/**
 * Rebuild the exercise list from the plan and whatever has been logged. This is
 * the "revert to default" shape: the athlete's structural edits are discarded,
 * but every logged set is kept and re-attached to its exercise.
 */
export function buildFromPlan(
  planned: PlannedExercise[] | undefined,
  serverSets: SessionSet[],
  unit: LiftingUnit = 'kg',
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
    [...sets].sort((a, b) => a.setNumber - b.setNumber).map((s, i) => fromServerSet(s, i + 1, unit));

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
        weight: String(prescribedInUnit(pe.weight, unit)),
        rpe: '',
        targetReps: pe.reps,
        targetWeight: deliveredPrescriptionKg(pe.weight, unit),
        targetRpe: pe.rpe,
        isCompleted: false,
      }),
    );
    return {
      name: pe.name,
      order,
      isExpanded: true,
      cue: pe.cue,
      barLoaded: pe.barLoaded,
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
export function reconcileDraft(draft: WorkoutDraft, serverSets: SessionSet[], unit: LiftingUnit = 'kg'): Exercise[] {
  draft = inUnit(draft, unit);
  const byId = new Map(serverSets.map((s) => [s.id, s]));
  const byClientSetId = new Map(serverSets.filter((s) => s.clientSetId).map((s) => [s.clientSetId!, s]));
  const removed = new Set(draft.removedSetIds ?? []);
  const claimed = new Set<string>();

  const exercises: Exercise[] = draft.exercises.map((ex, order) => ({
    ...ex,
    order,
    sets: ex.sets.map((set) => {
      const uid = nextSetUid();
      if (!set.id) {
        // A set the server already holds although the phone never heard back — the
        // save landed and its response was lost, or the app closed mid-save. Adopt
        // the row rather than re-attach it below as a second copy of the same set.
        const landed = set.clientSetId ? byClientSetId.get(set.clientSetId) : undefined;
        if (landed) {
          claimed.add(landed.id);
          // Still queued means the phone's values are newer than the server's; the
          // queue will push them (to this id) on the next flush.
          if (set.unsynced) return { ...set, uid, id: landed.id, isSaving: false, prs: undefined };
          return { ...fromServerSet(landed, set.setNumber, unit), uid };
        }
        // Ticked but never confirmed — the app closed mid-save. Queue it, or the set
        // would sit there looking logged while the server never hears of it.
        const unconfirmed = set.isCompleted && !!set.clientSetId;
        return { ...set, uid, isSaving: false, prs: undefined, unsynced: set.unsynced || unconfirmed };
      }
      const server = byId.get(set.id);
      if (!server) {
        // Saved, then deleted (or lost) server-side: keep what was typed, but stop
        // pretending it's persisted — otherwise a later edit would PATCH a dead id.
        return { ...set, uid, id: undefined, isCompleted: false, isSaving: false, prs: undefined };
      }
      claimed.add(set.id);
      // An edit (an un-tick, a re-tick) still queued is newer than the server's copy.
      if (set.unsynced) return { ...set, uid, isSaving: false, prs: undefined };
      return { ...fromServerSet(server, set.setNumber, unit), uid };
    }),
  }));

  // Sets the server holds that this draft never recorded — saved from another
  // device, or saved after the last draft write. Re-attach them so nothing logged
  // is silently lost.
  const orphans = serverSets.filter((s) => !claimed.has(s.id) && !wasRemoved(s, removed));
  for (const s of orphans) {
    const target = exercises.find((ex) => ex.name === s.exerciseName);
    if (target) {
      target.sets = [...target.sets, fromServerSet(s, target.sets.length + 1, unit)];
    } else {
      exercises.push({
        name: s.exerciseName,
        order: exercises.length,
        isExpanded: true,
        sets: [fromServerSet(s, 1, unit)],
      });
    }
  }

  return exercises.map((ex, order) => ({ ...ex, order, sets: renumber(ex.sets) }));
}

/**
 * The draft with its typed weights in `unit`. A workout started in kg and resumed after
 * the athlete switched to pounds would otherwise show "100" under a pound header — a
 * number off by more than half. Ticked-off warm-ups are in the old unit's round numbers
 * and are simply forgotten.
 */
function inUnit(draft: WorkoutDraft, unit: LiftingUnit): WorkoutDraft {
  const from = draft.unit ?? 'kg';
  if (from === unit) return draft;
  return {
    ...draft,
    unit,
    exercises: draft.exercises.map((ex) => ({
      ...ex,
      warmupsDone: undefined,
      sets: ex.sets.map((set) => ({ ...set, weight: convertTyped(set.weight, from, unit) })),
    })),
  };
}

/**
 * Restore the draft when the server could not be asked (no signal on resume).
 *
 * reconcileDraft against an EMPTY server list reads every saved set as "the server lost
 * it" and un-ticks it — so reopening a workout in a basement gym used to wipe the session
 * off the screen, and re-ticking the sets would have logged each one twice. With no
 * answer from the server, the phone's own record is the best one there is: keep it, and
 * queue anything ticked but never confirmed.
 */
export function restoreDraftOffline(draft: WorkoutDraft, unit: LiftingUnit = 'kg'): Exercise[] {
  return inUnit(draft, unit).exercises.map((ex, order) => ({
    ...ex,
    order,
    sets: renumber(ex.sets.map((set) => ({
      ...set,
      uid: nextSetUid(),
      isSaving: false,
      prs: undefined,
      unsynced: set.unsynced || (set.isCompleted && !set.id),
    }))),
  }));
}

/**
 * Whether the athlete deleted this server row. Removals are remembered by server id and,
 * for a set deleted while its save was still queued, by clientSetId — that save may have
 * landed after all, and the row it made must not come back on resume.
 */
function wasRemoved(s: SessionSet, removed: Set<string>): boolean {
  return removed.has(s.id) || (!!s.clientSetId && removed.has(s.clientSetId));
}

/** Ids of sets the athlete deleted that the server still has — the delete needs a retry. */
export function unresolvedDeletions(draft: WorkoutDraft, serverSets: SessionSet[]): string[] {
  const removed = new Set(draft.removedSetIds ?? []);
  return serverSets.filter((s) => wasRemoved(s, removed)).map((s) => s.id);
}

/**
 * Swap an exercise for another, mid-workout.
 *
 * 2026-10-06: this used to be a rename — `{ ...ex, name }` — so every number stayed with
 * the slot. Leg Press swapped in for Good Morning was asked for Good Morning's 3×6, and a
 * block earlier a Good Morning card carried Leg Press's 200kg×10. The athlete's words: "it
 * keeps old data which is wtf". The cue and the plate drawing described the old movement
 * too.
 *
 * Only sets not yet done are re-targeted; anything logged is history and stays as it was.
 * Called twice per swap: first with `target` null, the instant the athlete picks — the old
 * weight is cleared immediately rather than shown while the request is in flight — and
 * again when the server's numbers arrive. A null target (never done, or offline) leaves the
 * weight EMPTY: no number is better than the wrong movement's number.
 */
export function applySubstitution(
  ex: Exercise,
  newName: string,
  target: SubstituteTarget | null,
  unit: LiftingUnit = 'kg',
): Exercise {
  const original = ex.substitutedFor ?? ex.name;
  return {
    ...ex,
    name: newName,
    substitutedFor: original === newName ? undefined : original,
    cue: undefined,
    barLoaded: undefined,
    warmupsDone: undefined,
    sets: ex.sets.map((s) => (s.isCompleted || s.id ? s : {
      ...s,
      reps: String(target?.reps ?? s.targetReps ?? s.reps),
      weight: target?.weight != null ? String(prescribedInUnit(target.weight, unit)) : '',
      targetReps: target?.reps ?? s.targetReps,
      targetWeight: target?.weight != null ? deliveredPrescriptionKg(target.weight, unit) : undefined,
      targetRpe: target?.rpe ?? s.targetRpe,
      adjustedWeight: undefined,
    })),
  };
}

// How far over the prescribed RPE a set has to land before the app asks the coach whether
// the remaining sets should come down. Mirrors MIN_RPE_OVERSHOOT on the backend.
export const ADJUST_RPE_OVERSHOOT = 1;

// …and the other half of that question: reps that came up short of the prescription at
// the effort it was supposed to cost. Mirrors MIN_REPS_SHORTFALL on the backend.
export const ADJUST_REPS_SHORTFALL = 2;

/**
 * Whether a just-completed set is worth asking the server about.
 *
 * The BACKEND owns the decision — this is a call-avoidance filter, and it must stay the
 * UNION of the backend's gates rather than a subset. 2026-09-07: the athlete logged
 * 172.5kg×6 @RPE 9 against a prescribed 8 @RPE 8.5, three sets running. Half a point over
 * is inside the RPE gate, so the app never asked and the backend never got the chance to
 * read the two missing reps — which priced his squat that day at 212.7kg against the
 * 230kg the load came from. A client filter stricter than the rule it stands in for does
 * not save a request, it deletes the feature.
 */
export function shouldAskForAdjustment(set: {
  rpe: string;
  reps: string;
  targetRpe?: number;
  targetReps?: number;
}): boolean {
  if (set.targetRpe == null || !set.rpe) return false;
  const rated = parseFloat(set.rpe);
  if (!Number.isFinite(rated)) return false;

  const over = rated - set.targetRpe;
  if (over >= ADJUST_RPE_OVERSHOOT) return true;

  // Reps short is only evidence about the LOAD when the effort was at least what was
  // asked for. A set stopped early and rated EASY was not too heavy.
  if (over < 0 || set.targetReps == null) return false;
  const reps = set.reps ? parseInt(set.reps) : NaN;
  if (!Number.isFinite(reps)) return false;
  return set.targetReps - reps >= ADJUST_REPS_SHORTFALL;
}
