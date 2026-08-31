import { renderHook, act } from '@testing-library/react-native';
import AsyncStorageMock from '../../../test/mocks/async-storage';

jest.mock('../../services/ai-coach.service', () => ({
  aiCoachService: { technique: jest.fn(async () => ({ lifts: [] })) },
}));

/* eslint-disable import/first */
import { aiCoachService, TechniqueLift } from '../../services/ai-coach.service';
import { useTechniqueNudge } from '../useTechniqueNudge';
/* eslint-enable import/first */

const SESSION = 'session-abc';

const lift = (over: Partial<TechniqueLift> = {}): TechniqueLift => ({
  key: 'squat',
  label: 'Squat',
  compLift: 'squat',
  exposures: 8,
  score: null,
  scoredAtMs: null,
  flagged: false,
  dismissed: false,
  loadMultiplier: 1,
  ...over,
});

const flush = async () => { await act(async () => {}); };
const mount = async (name: string | null, ready = true) =>
  renderHook(() => useTechniqueNudge(SESSION, name, ready));

describe('useTechniqueNudge', () => {
  beforeEach(() => {
    AsyncStorageMock.__reset();
    jest.mocked(aiCoachService.technique).mockReset().mockResolvedValue({ lifts: [] });
  });

  it('asks for a film when an unfilmed key lift comes up', async () => {
    jest.mocked(aiCoachService.technique).mockResolvedValue({ lifts: [lift()] });

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.nudge?.lift.key).toBe('squat');
  });

  it('reaches the comp lift through the plan\'s own wording', async () => {
    // The plan says "Barbell Back Squat"; the key lift is the squat family.
    jest.mocked(aiCoachService.technique).mockResolvedValue({ lifts: [lift()] });

    const { result } = await mount('Barbell Back Squat');
    await flush();

    expect(result.current.nudge?.lift.key).toBe('squat');
  });

  it('stays quiet about a lift he has already filmed', async () => {
    jest.mocked(aiCoachService.technique).mockResolvedValue({
      lifts: [lift({ score: 8, scoredAtMs: Date.now() })],
    });

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.nudge).toBeNull();
  });

  it('asks at most once per session', async () => {
    jest.mocked(aiCoachService.technique).mockResolvedValue({ lifts: [lift()] });

    const { result } = await mount('Squat');
    await flush();
    await act(async () => { result.current.dismiss(); });
    await flush();

    expect(result.current.nudge).toBeNull();
  });

  it('stays quiet on a resumed session that already asked', async () => {
    await AsyncStorageMock.setItem(`techniqueAsked:${SESSION}`, '1');
    jest.mocked(aiCoachService.technique).mockResolvedValue({ lifts: [lift()] });

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.nudge).toBeNull();
  });

  it('holds back while the session is still loading', async () => {
    jest.mocked(aiCoachService.technique).mockResolvedValue({ lifts: [lift()] });

    const { result } = await mount('Squat', false);
    await flush();

    expect(result.current.nudge).toBeNull();
  });

  it('never surfaces the technique read failing inside a workout', async () => {
    jest.mocked(aiCoachService.technique).mockRejectedValue(new Error('offline'));

    const { result } = await mount('Squat');
    await flush();

    expect(result.current.nudge).toBeNull();
  });
});
