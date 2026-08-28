import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionSet } from '../../../services/session.service';
import {
  Exercise,
  WorkoutDraft,
  buildFromPlan,
  clearDraft,
  loadDraft,
  pruneOtherDrafts,
  reconcileDraft,
  saveDraft,
  unresolvedDeletions,
} from '../workoutState';

const reset = (AsyncStorage as unknown as { __reset: () => void }).__reset;

let n = 0;
const serverSet = (p: Partial<SessionSet> = {}): SessionSet => ({
  id: `srv-${++n}`,
  sessionId: 'sess',
  exerciseName: 'Back Squat',
  exerciseOrder: 0,
  setNumber: 1,
  targetReps: 5,
  targetWeight: 100,
  targetRpe: 7,
  repsCompleted: 5,
  weightUsed: 100,
  rpe: 7,
  isCompleted: true,
  isPR: false,
  techniqueNotes: null,
  techniqueRating: null,
  loggedAt: '2026-08-28T10:00:00.000Z',
  ...p,
});

const plan = [
  { name: 'Back Squat', sets: 3, reps: 5, weight: 100, rpe: 7, cue: 'brace' },
  { name: 'Bench Press', sets: 3, reps: 8, weight: 80 },
];

const draftOf = (exercises: Exercise[], removedSetIds: string[] = []): WorkoutDraft => ({
  version: 1,
  sessionId: 'sess',
  savedAt: Date.now(),
  exercises,
  removedSetIds,
});

beforeEach(() => reset());

describe('buildFromPlan', () => {
  it('tops each planned exercise up to its prescribed set count', () => {
    const built = buildFromPlan(plan, []);
    expect(built.map((e) => e.name)).toEqual(['Back Squat', 'Bench Press']);
    expect(built[0].sets).toHaveLength(3);
    expect(built[0].sets[0]).toMatchObject({ reps: '5', weight: '100', targetRpe: 7 });
    expect(built[0].cue).toBe('brace');
  });

  it('keeps logged sets and only fills the shortfall', () => {
    const built = buildFromPlan(plan, [serverSet({ weightUsed: 105 })]);
    expect(built[0].sets).toHaveLength(3);
    expect(built[0].sets[0]).toMatchObject({ weight: '105', isCompleted: true });
    expect(built[0].sets[1].id).toBeUndefined();
  });

  it('keeps exercises logged off-plan', () => {
    const built = buildFromPlan(plan, [serverSet({ exerciseName: 'Leg Press', exerciseOrder: 5 })]);
    expect(built.map((e) => e.name)).toContain('Leg Press');
  });

  it('reads the technique self-report back off the anchor set', () => {
    const built = buildFromPlan(plan, [
      serverSet({ techniqueNotes: 'knees caved on rep 4', techniqueRating: 3 }),
    ]);
    expect(built[0].exerciseNotes).toBe('knees caved on rep 4');
    expect(built[0].techniqueRating).toBe(3);
  });

  it('falls back to the logged sets when there is no plan', () => {
    const built = buildFromPlan(undefined, [serverSet({ exerciseName: 'Deadlift' })]);
    expect(built.map((e) => e.name)).toEqual(['Deadlift']);
  });
});

describe('reconcileDraft', () => {
  it('keeps an exercise the athlete removed from the plan', () => {
    const draft = draftOf(buildFromPlan(plan, []).filter((e) => e.name !== 'Bench Press'));
    expect(reconcileDraft(draft, []).map((e) => e.name)).toEqual(['Back Squat']);
  });

  it('keeps an exercise the athlete added but never logged', () => {
    const exercises = buildFromPlan(plan, []);
    exercises.push({
      name: 'Face Pull',
      order: 2,
      isExpanded: true,
      sets: [{ uid: 'x', setNumber: 1, reps: '', weight: '', rpe: '', isCompleted: false }],
    });
    expect(reconcileDraft(draftOf(exercises), []).map((e) => e.name)).toContain('Face Pull');
  });

  it('keeps a substituted name rather than reverting to the plan', () => {
    const exercises = buildFromPlan(plan, []);
    exercises[0] = { ...exercises[0], name: 'Hack Squat' };
    expect(reconcileDraft(draftOf(exercises), []).map((e) => e.name)).toEqual([
      'Hack Squat',
      'Bench Press',
    ]);
  });

  it('keeps typed-but-unticked input and the technique self-report', () => {
    const exercises = buildFromPlan(plan, []);
    exercises[0] = {
      ...exercises[0],
      techniqueRating: 4,
      exerciseNotes: 'felt sharp',
      sets: exercises[0].sets.map((s, i) => (i === 0 ? { ...s, reps: '6', weight: '110' } : s)),
    };
    const [squat] = reconcileDraft(draftOf(exercises), []);
    expect(squat).toMatchObject({ techniqueRating: 4, exerciseNotes: 'felt sharp' });
    expect(squat.sets[0]).toMatchObject({ reps: '6', weight: '110' });
  });

  it('lets the server win on a set it has saved', () => {
    const saved = serverSet({ weightUsed: 102.5, repsCompleted: 4, rpe: 9 });
    const exercises = buildFromPlan(plan, [saved]);
    // Stale local copy of the same row — the server's numbers are the real ones.
    exercises[0].sets[0] = { ...exercises[0].sets[0], weight: '95', reps: '5', rpe: '7' };
    const [squat] = reconcileDraft(draftOf(exercises), [saved]);
    expect(squat.sets[0]).toMatchObject({ weight: '102.5', reps: '4', rpe: '9', isCompleted: true });
  });

  it('demotes a set to unsaved when the server no longer has it', () => {
    const saved = serverSet();
    const exercises = buildFromPlan(plan, [saved]);
    const [squat] = reconcileDraft(draftOf(exercises), []);
    expect(squat.sets[0].id).toBeUndefined();
    expect(squat.sets[0].isCompleted).toBe(false);
    expect(squat.sets[0].weight).toBe('100');
  });

  it('re-attaches a logged set the draft never saw', () => {
    const exercises = buildFromPlan(plan, []);
    const stray = serverSet({ exerciseName: 'Bench Press', weightUsed: 82.5 });
    const [, bench] = reconcileDraft(draftOf(exercises), [stray]);
    expect(bench.sets.filter((s) => s.id === stray.id)).toHaveLength(1);
  });

  it('adds an exercise for a logged set whose exercise is gone from the draft', () => {
    const exercises = buildFromPlan(plan, []).filter((e) => e.name !== 'Bench Press');
    const stray = serverSet({ exerciseName: 'Bench Press' });
    expect(reconcileDraft(draftOf(exercises), [stray]).map((e) => e.name)).toEqual([
      'Back Squat',
      'Bench Press',
    ]);
  });

  it('does not resurrect a set the athlete deleted when the delete failed', () => {
    const deleted = serverSet();
    const exercises = buildFromPlan(plan, []);
    const result = reconcileDraft(draftOf(exercises, [deleted.id]), [deleted]);
    expect(result[0].sets.some((s) => s.id === deleted.id)).toBe(false);
  });

  it('renumbers sets contiguously', () => {
    const exercises = buildFromPlan(plan, []);
    exercises[0].sets = exercises[0].sets.slice(1);
    const [squat] = reconcileDraft(draftOf(exercises), []);
    expect(squat.sets.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  it('gives every restored set a distinct uid', () => {
    const exercises = buildFromPlan(plan, []);
    const uids = reconcileDraft(draftOf(exercises), []).flatMap((e) => e.sets.map((s) => s.uid));
    expect(new Set(uids).size).toBe(uids.length);
  });
});

describe('unresolvedDeletions', () => {
  it('reports deletions the server still holds so they can be retried', () => {
    const stillThere = serverSet();
    const gone = serverSet();
    const draft = draftOf([], [stillThere.id, gone.id]);
    expect(unresolvedDeletions(draft, [stillThere])).toEqual([stillThere.id]);
  });
});

describe('persistence', () => {
  it('round-trips a draft', async () => {
    const exercises = buildFromPlan(plan, []);
    await saveDraft('sess', exercises, ['dead-1']);
    const loaded = await loadDraft('sess');
    expect(loaded?.exercises.map((e) => e.name)).toEqual(['Back Squat', 'Bench Press']);
    expect(loaded?.removedSetIds).toEqual(['dead-1']);
  });

  it('does not persist server-derived fields', async () => {
    const exercises = buildFromPlan(plan, [serverSet({ prs: [] })]);
    exercises[0].sets[0] = { ...exercises[0].sets[0], isSaving: true };
    await saveDraft('sess', exercises, []);
    const raw = (await AsyncStorage.getItem('activeWorkout:draft:v1:sess')) ?? '';
    expect(raw).not.toContain('isSaving');
    expect(raw).not.toContain('"prs"');
  });

  it('returns null for a missing or unreadable draft', async () => {
    expect(await loadDraft('nope')).toBeNull();
    await AsyncStorage.setItem('activeWorkout:draft:v1:sess', 'not json');
    expect(await loadDraft('sess')).toBeNull();
  });

  it('ignores a draft written by an older version', async () => {
    await AsyncStorage.setItem(
      'activeWorkout:draft:v1:sess',
      JSON.stringify({ version: 0, exercises: [] }),
    );
    expect(await loadDraft('sess')).toBeNull();
  });

  it('clears one draft', async () => {
    await saveDraft('sess', [], []);
    await clearDraft('sess');
    expect(await loadDraft('sess')).toBeNull();
  });

  it('prunes drafts of other sessions but keeps this one', async () => {
    await saveDraft('sess', [], []);
    await saveDraft('older', [], []);
    await AsyncStorage.setItem('hasSeenRPEGuide', '1');
    await pruneOtherDrafts('sess');
    expect(await loadDraft('sess')).not.toBeNull();
    expect(await loadDraft('older')).toBeNull();
    expect(await AsyncStorage.getItem('hasSeenRPEGuide')).toBe('1');
  });
});
