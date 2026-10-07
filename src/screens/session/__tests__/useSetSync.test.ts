import { useRef, useState } from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AxiosError, AxiosHeaders } from 'axios';
import { sessionService, SessionSet } from '../../../services/session.service';
import { mockAppState } from '../../../../test/appState';
import { Exercise, LocalSet } from '../workoutState';
import { useSetSync } from '../hooks/useSetSync';
import { findSet } from '../setSync';

/**
 * 2026-10-07: "in a basement gym with bad reception, the athlete has to tap again and
 * again or give up logging." A failed save used to un-tick the set.
 */

jest.mock('../../../services/session.service', () => ({
  sessionService: { addSet: jest.fn(), updateSet: jest.fn(), deleteSet: jest.fn(async () => {}) },
}));

const addSet = jest.mocked(sessionService.addSet);
const deleteSet = jest.mocked(sessionService.deleteSet);

const noSignal = () => new AxiosError('Network Error', 'ERR_NETWORK');
const rejected = (status: number) =>
  new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { message: 'Session not found' },
  });

const savedRow = (id: string): SessionSet => ({ id, prs: [] } as unknown as SessionSet);

const ticked = (uid: string, performedAt: string, over: Partial<LocalSet> = {}): LocalSet => ({
  uid, setNumber: 1, reps: '5', weight: '172.5', rpe: '8', isCompleted: true,
  clientSetId: `c-${uid}`, performedAt, ...over,
});

const squat = (sets: LocalSet[]): Exercise => ({ name: 'Back Squat', order: 0, isExpanded: true, sets });

async function mount(initial: Exercise[], unit: 'kg' | 'lb' = 'kg') {
  const onLateSave = jest.fn();
  const hook = await renderHook(() => {
    const [exercises, setExercises] = useState(initial);
    const removedSetIdsRef = useRef(new Set<string>());
    const sync = useSetSync({ sessionId: 'sess', exercises, setExercises, removedSetIdsRef, unit, enabled: true, onLateSave });
    return { exercises, setExercises, removedSetIdsRef, sync };
  });
  const setOf = (uid: string) => findSet(hook.result.current.exercises, uid)!.set;
  const located = (uid: string) => findSet(hook.result.current.exercises, uid)!;
  return { ...hook, setOf, located, onLateSave };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockAppState();
  addSet.mockReset();
  deleteSet.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('useSetSync', () => {
  it('a set saved with no signal stays ticked, is marked not synced, and lands on retry', async () => {
    addSet.mockRejectedValueOnce(noSignal()).mockResolvedValueOnce(savedRow('row-1'));
    const t = await mount([squat([ticked('a', '2026-10-07T17:40:00Z')])]);

    await act(async () => { await t.result.current.sync.pushSet(t.located('a')); });
    expect(t.setOf('a')).toMatchObject({ isCompleted: true, unsynced: true, isSaving: false });

    await act(async () => { jest.advanceTimersByTime(3_000); });
    await act(async () => {});

    expect(t.setOf('a')).toMatchObject({ id: 'row-1', isCompleted: true, unsynced: false });
    // Same clientSetId both times — that is what stops the server logging it twice.
    expect(addSet.mock.calls.map(([, input]) => input.clientSetId)).toEqual(['c-a', 'c-a']);
    expect(addSet.mock.calls[1][1].performedAt).toBe('2026-10-07T17:40:00Z');
  });

  it('a set the server rejects is un-ticked rather than retried forever', async () => {
    addSet.mockRejectedValueOnce(rejected(404));
    const t = await mount([squat([ticked('a', '2026-10-07T17:40:00Z')])]);

    let result: unknown;
    await act(async () => { result = await t.result.current.sync.pushSet(t.located('a')); });

    expect(result).toEqual({ status: 'rejected', message: 'Session not found' });
    expect(t.setOf('a')).toMatchObject({ isCompleted: false, unsynced: false });
  });

  it('will not let the workout finish while a set is still waiting for signal', async () => {
    addSet.mockRejectedValue(noSignal());
    const t = await mount([squat([ticked('a', '2026-10-07T17:40:00Z', { unsynced: true })])]);

    let done: boolean | undefined;
    await act(async () => { done = await t.result.current.sync.flushPending(); });
    expect(done).toBe(false);

    addSet.mockReset().mockResolvedValue(savedRow('row-1'));
    await act(async () => { done = await t.result.current.sync.flushPending(); });
    expect(done).toBe(true);
    expect(t.setOf('a').id).toBe('row-1');
  });

  it('sends queued sets in the order they were done, so each PR check sees the sets before it', async () => {
    addSet.mockImplementation(async (_s, input) => savedRow(`row-${input.clientSetId}`));
    const t = await mount([squat([
      ticked('later', '2026-10-07T17:50:00Z', { unsynced: true, setNumber: 2 }),
      ticked('earlier', '2026-10-07T17:40:00Z', { unsynced: true }),
    ])]);

    await act(async () => { await t.result.current.sync.flushPending(); });

    expect(addSet.mock.calls.map(([, input]) => input.clientSetId)).toEqual(['c-earlier', 'c-later']);
    expect(t.onLateSave).toHaveBeenCalledTimes(2);
  });

  it('saves a queued set as the movement it was done as, not the one swapped in after', async () => {
    addSet.mockResolvedValue(savedRow('row-1'));
    const queued = ticked('a', '2026-10-07T17:40:00Z', {
      unsynced: true,
      loggedAs: { exerciseName: 'Good Morning', exerciseOrder: 2 },
    });
    const t = await mount([{ ...squat([queued]), name: 'Leg Press', substitutedFor: 'Good Morning' }]);

    await act(async () => { await t.result.current.sync.flushPending(); });

    expect(addSet.mock.calls[0][1]).toMatchObject({ exerciseName: 'Good Morning', exerciseOrder: 2 });
    expect(addSet.mock.calls[0][1].substitutedFor).toBeUndefined();
  });

  it('deletes the row a save made if the set was removed while the save was in the air', async () => {
    let land!: (row: SessionSet) => void;
    addSet.mockImplementationOnce(() => new Promise((resolve) => { land = resolve; }));
    const t = await mount([squat([ticked('a', '2026-10-07T17:40:00Z')])]);

    let pending!: Promise<unknown>;
    await act(async () => { pending = t.result.current.sync.pushSet(t.located('a')); });
    t.result.current.removedSetIdsRef.current.add('c-a');
    await act(async () => { land(savedRow('row-1')); await pending; });

    expect(deleteSet).toHaveBeenCalledWith('row-1');
  });

  it('a pound lifter\'s 225 is stored as the kilos it is, not as 225kg', async () => {
    addSet.mockResolvedValue(savedRow('row-1'));
    const t = await mount([squat([ticked('a', '2026-10-07T17:40:00Z', { weight: '225' })])], 'lb');

    await act(async () => { await t.result.current.sync.pushSet(t.located('a')); });

    expect(addSet.mock.calls[0][1].weightUsed).toBe(102.06);
  });
});
