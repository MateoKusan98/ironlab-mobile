import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

/**
 * The gate that protects a coach's approval.
 *
 * A session approved at 20:00 the night before carries YESTERDAY's generatedAt, so
 * StartSessionScreen's `!planFromToday` freshness check reads it as stale and — before
 * this gate — would regenerate straight over the thing a human signed off. That is the
 * exact failure coach review exists to prevent, so it gets a test that names it.
 *
 * The uncoached case is here for the same reason: review must be an addition for
 * coached athletes, never a change for everyone else.
 */

const mockGeneratePlan = jest.fn();
const mockGetPlan = jest.fn();
const mockGetReviewStatus = jest.fn();

jest.mock('../../../services/ai-coach.service', () => ({
  aiCoachService: {
    // Wrapped in arrows, NOT referenced directly: jest hoists this factory above the
    // const declarations, so a direct reference captures them mid-TDZ as undefined.
    // The indirection defers the lookup to call time, when they exist.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    getPlan: (...a: any[]) => mockGetPlan(...a),
    getReviewStatus: (...a: any[]) => mockGetReviewStatus(...a),
    generatePlan: (...a: any[]) => mockGeneratePlan(...a),
    /* eslint-enable @typescript-eslint/no-explicit-any */
    prForecast: jest.fn(async () => null),
    fatigueCheck: jest.fn(async () => null),
    triggerRecoveryWeek: jest.fn(async () => ({})),
  },
}));

// The screen reads navigation/route through hooks, not props.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../services/session.service', () => ({
  sessionService: {
    getLastReadiness: jest.fn(async () => ({ lastBodyweight: 92, avgSleepHours: 7.5 })),
    getActiveSession: jest.fn(async () => null),
  },
}));

/* eslint-disable import/first */
import { StartSessionScreen } from '../StartSessionScreen';
/* eslint-enable import/first */

// A plan approved last night: real exercises, but generated on a previous day.
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();
const approvedPlan = {
  plan: '### Lower\n**Back Squat** — 4×5 @ 120kg (RPE 8)',
  generatedAt: YESTERDAY,
  nextSessionJson: { focus: 'Lower', exercises: [{ name: 'Back Squat', sets: 4, reps: 5, weight: 120 }] },
  trainingDays: ['monday'], competitionDate: null, competitionType: null,
  injuryHandling: null, activeInjuries: [], trainingWeek: 1, sessionInWeek: 1,
  sessionsPerCycle: 4, missedSession: null, catchUpRecommendation: null,
  nextScheduledDay: 'monday', skipAheadDay: null, completedToday: false,
  regenerating: false, recoveryWeek: null, barLoading: null,
};

const open = () => render(<StartSessionScreen />);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPlan.mockResolvedValue(approvedPlan);
  mockGeneratePlan.mockResolvedValue({ plan: 'REGENERATED' });
});

describe('coached athlete', () => {
  it('serves the session the coach approved last night instead of regenerating it', async () => {
    // Asserting on the rendered exercise, not just on generatePlan going uncalled:
    // generation happens on a tap, so "not called on mount" would pass for everyone
    // and prove nothing. Seeing the approved squat is proof the released plan was
    // served straight through, skipping the readiness→generate path entirely.
    mockGetReviewStatus.mockResolvedValue({
      state: 'released', autoApproveAt: null, coachNote: null, targetDate: null,
    });

    const r = await open();

    await waitFor(() => expect(r.getByText(/Back Squat/)).toBeTruthy());
    expect(mockGeneratePlan).not.toHaveBeenCalled();
  });

  it('does not generate while the session is still with the coach', async () => {
    mockGetReviewStatus.mockResolvedValue({
      state: 'awaiting_review',
      autoApproveAt: new Date(Date.now() + 3_600_000).toISOString(),
      coachNote: null, targetDate: '2026-09-03',
    });
    mockGetPlan.mockResolvedValue({ ...approvedPlan, plan: null, nextSessionJson: null });

    const r = await open();

    // The athlete is TOLD they are waiting rather than shown a button that cannot
    // work — the i18n stub echoes keys, so the key itself is the assertion.
    await waitFor(() => expect(r.getByText('session.awaitingCoach.title')).toBeTruthy());
    expect(mockGeneratePlan).not.toHaveBeenCalled();
  });
});

describe('uncoached athlete', () => {
  it('is unaffected — review adds nothing to an athlete with no coach', async () => {
    mockGetReviewStatus.mockResolvedValue({
      state: 'none', autoApproveAt: null, coachNote: null, targetDate: null,
    });

    open();

    await waitFor(() => expect(mockGetReviewStatus).toHaveBeenCalled());
    // Generation still belongs to the readiness flow, exactly as before — this asserts
    // only that nothing in the gate short-circuits their screen on load.
    expect(mockGetPlan).toHaveBeenCalled();
  });

  it('treats an unreachable review endpoint as uncoached, failing OPEN', async () => {
    // An athlete in the gym must not be locked out of training because one advisory
    // endpoint was down.
    mockGetReviewStatus.mockRejectedValue(new Error('offline'));

    open();

    await waitFor(() => expect(mockGetPlan).toHaveBeenCalled());
  });
});
