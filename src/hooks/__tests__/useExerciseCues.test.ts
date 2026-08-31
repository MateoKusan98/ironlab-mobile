import { renderHook, act } from '@testing-library/react-native';
import AsyncStorageMock from '../../../test/mocks/async-storage';
import { exerciseCueService, ExerciseCue } from '../../services/exerciseCue.service';
import { useExerciseCues } from '../useExerciseCues';

const SESSION = 'session-abc';
const REMINDED_KEY = `cueReminded:${SESSION}`;

const cue = (over: Partial<ExerciseCue> = {}): ExerciseCue => ({
  id: 'cue-1',
  exerciseKey: 'squat',
  text: 'knees out',
  source: 'manual',
  ...over,
} as ExerciseCue);

/** A cue the server derived from a form-check verdict — no row behind it. */
const formCheckCue = (over: Partial<ExerciseCue> = {}): ExerciseCue =>
  cue({ id: 'formcheck:fc-1:0', text: 'sit back into the hips', source: 'form-check', ...over });

const flush = async () => { await act(async () => {}); };

/** Mount with a given "current exercise", ready by default. */
const mount = (name: string | null, ready = true) =>
  renderHook(() => useExerciseCues(SESSION, name, ready));

describe('useExerciseCues', () => {
  beforeEach(() => {
    AsyncStorageMock.__reset();
    jest.mocked(exerciseCueService.getCues).mockReset().mockResolvedValue([]);
    jest.mocked(exerciseCueService.addCue).mockReset();
    jest.mocked(exerciseCueService.deleteCue).mockReset().mockResolvedValue(undefined as never);
  });

  it('loads saved cues into a map keyed by exercise', async () => {
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([
      cue({ id: 'a', exerciseKey: 'squat', text: 'knees out' }),
      cue({ id: 'b', exerciseKey: 'squat', text: 'brace hard' }),
      cue({ id: 'c', exerciseKey: 'bench press', text: 'tuck elbows' }),
    ]);

    const { result } = await mount(null);
    await flush();

    expect(result.current.cuesByKey.get('squat')).toHaveLength(2);
    expect(result.current.cuesByKey.get('bench press')).toHaveLength(1);
  });

  it('pops the reminder for the exercise the athlete is about to do', async () => {
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([cue()]);

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.cueReminder?.name).toBe('Squat');
    expect(result.current.cueReminder?.cues).toHaveLength(1);
  });

  it('stays quiet while the session is still loading', async () => {
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([cue()]);

    const { result } = await mount('Squat', false);
    await flush();

    expect(result.current.cueReminder).toBeNull();
  });

  it('does not remind for an exercise with no saved cues', async () => {
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([cue({ exerciseKey: 'squat' })]);

    const { result } = await mount('Barbell Row');
    await flush();

    expect(result.current.cueReminder).toBeNull();
  });

  it('reminds only once per exercise per session', async () => {
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([cue()]);

    const { result, rerender } = await mount('Squat');
    await flush();
    expect(result.current.cueReminder).not.toBeNull();

    await act(async () => { result.current.dismissReminder(); });
    expect(result.current.cueReminder).toBeNull();

    // Still on the same exercise — it must not pop again.
    await act(async () => { await rerender({}); });
    await flush();
    expect(result.current.cueReminder).toBeNull();
  });

  it('persists reminded keys so a resumed workout stays quiet', async () => {
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([cue()]);

    const first = await mount('Squat');
    await flush();
    expect(first.result.current.cueReminder).not.toBeNull();
    await act(async () => { await first.unmount(); });

    expect(JSON.parse(AsyncStorageMock.__store.get(REMINDED_KEY)!)).toContain('squat');

    // Remount the same session: the reminder already fired, so it stays quiet.
    const second = await mount('Squat');
    await flush();
    expect(second.result.current.cueReminder).toBeNull();
  });

  it('ignores a malformed reminded-keys cache', async () => {
    AsyncStorageMock.__store.set(REMINDED_KEY, 'not-json');
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([cue()]);

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.cueReminder).not.toBeNull();
  });

  it('saveCue adds the cue to the map', async () => {
    jest.mocked(exerciseCueService.addCue).mockResolvedValue(
      cue({ id: 'new', exerciseKey: 'squat', text: 'chest up' }),
    );

    const { result } = await mount(null);
    await flush();

    let ok = false;
    await act(async () => { ok = await result.current.saveCue('Squat', '  chest up  '); });

    expect(ok).toBe(true);
    expect(exerciseCueService.addCue).toHaveBeenCalledWith({ exerciseName: 'Squat', text: 'chest up' });
    expect(result.current.cuesByKey.get('squat')).toHaveLength(1);
  });

  it('saveCue rejects empty text without calling the API', async () => {
    const { result } = await mount(null);
    await flush();

    let ok = true;
    await act(async () => { ok = await result.current.saveCue('Squat', '   '); });

    expect(ok).toBe(false);
    expect(exerciseCueService.addCue).not.toHaveBeenCalled();
  });

  it('saveCue reports failure and leaves the map untouched', async () => {
    jest.mocked(exerciseCueService.addCue).mockRejectedValue(new Error('offline'));

    const { result } = await mount(null);
    await flush();

    let ok = true;
    await act(async () => { ok = await result.current.saveCue('Squat', 'chest up'); });

    expect(ok).toBe(false);
    expect(result.current.cuesByKey.size).toBe(0);
    expect(result.current.savingCue).toBe(false);
  });

  it('does not remind about a cue the athlete just wrote this session', async () => {
    jest.mocked(exerciseCueService.addCue).mockResolvedValue(
      cue({ id: 'new', exerciseKey: 'squat', text: 'chest up' }),
    );

    const { result } = await mount('Squat');
    await flush();
    expect(result.current.cueReminder).toBeNull(); // no cues loaded yet

    await act(async () => { await result.current.saveCue('Squat', 'chest up'); });
    await flush();

    expect(result.current.cueReminder).toBeNull();
  });

  it('deleteCue removes it optimistically', async () => {
    const target = cue({ id: 'a', exerciseKey: 'squat' });
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([target]);

    const { result } = await mount(null);
    await flush();
    expect(result.current.cuesByKey.get('squat')).toHaveLength(1);

    let ok = false;
    await act(async () => { ok = await result.current.deleteCue(target); });

    expect(ok).toBe(true);
    expect(result.current.cuesByKey.has('squat')).toBe(false);
  });

  it('deleteCue restores the cue when the server rejects it', async () => {
    const target = cue({ id: 'a', exerciseKey: 'squat' });
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([target]);
    jest.mocked(exerciseCueService.deleteCue).mockRejectedValue(new Error('offline'));

    const { result } = await mount(null);
    await flush();

    let ok = true;
    await act(async () => { ok = await result.current.deleteCue(target); });

    expect(ok).toBe(false);
    expect(result.current.cuesByKey.get('squat')).toHaveLength(1);
  });

  it('pops the reminder for a form-check verdict on a movement with no cue of the athlete\'s own', async () => {
    // The whole point of the feature: a verdict read once on the results screen
    // three weeks ago, back at the top of the set it applies to.
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([formCheckCue()]);

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.cueReminder?.cues.map((c) => c.text)).toEqual(['sit back into the hips']);
  });

  it('refuses to delete a form-check cue — it is derived, there is no row', async () => {
    const derived = formCheckCue();
    jest.mocked(exerciseCueService.getCues).mockResolvedValue([derived]);

    const { result } = await mount(null);
    await flush();

    let ok = true;
    await act(async () => { ok = await result.current.deleteCue(derived); });

    expect(ok).toBe(false);
    expect(exerciseCueService.deleteCue).not.toHaveBeenCalled();
    expect(result.current.cuesByKey.get('squat')).toHaveLength(1);
  });

  it('survives the cue service being unreachable', async () => {
    jest.mocked(exerciseCueService.getCues).mockRejectedValue(new Error('offline'));

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.cuesByKey.size).toBe(0);
    expect(result.current.cueReminder).toBeNull();
  });
});
