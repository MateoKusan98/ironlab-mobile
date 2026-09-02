import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockDetail = jest.fn();
const mockEdit = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../../services/plan-review.service', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  planReviewService: {
    detail: (...a: any[]) => mockDetail(...a),
    edit: (...a: any[]) => mockEdit(...a),
    approve: (...a: any[]) => mockApprove(...a),
    reject: (...a: any[]) => mockReject(...a),
  },
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: { reviewId: 'review-1' } }),
}));

/* eslint-disable import/first */
import { PlanReviewDetailScreen } from '../PlanReviewDetailScreen';
/* eslint-enable import/first */

const DETAIL = {
  id: 'review-1',
  status: 'pending',
  targetDate: '2026-09-03',
  athlete: { id: 'a1', name: 'Marko', email: 'm@x.com' },
  session: {
    plan: '### Lower\n**Back Squat** — 4×5 @ 120kg (RPE 8)',
    json: {
      focus: 'Lower',
      exercises: [
        { name: 'Back Squat', sets: 4, reps: 5, weight: 120, rpe: 8 },
        { name: 'Leg Curl', sets: 3, reps: 12, weight: 40, rpe: 8 },
      ],
    },
    loadBasis: null,
  },
  original: null,
  coachNote: null,
  checkIn: {
    date: '2026-09-03', submitted: true, sleepHours: 6, sleepQuality: 2,
    energyLevel: 2, mood: 'tired', sorenessLevel: 4, sorenessAreas: ['lower_back'],
    stressLevel: 3, note: 'Back is tight', totals: null, meals: [],
  },
  autoApproveAt: new Date(Date.now() + 7_200_000).toISOString(),
  reviewedAt: null, releasedAt: null, createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDetail.mockResolvedValue(DETAIL);
  mockEdit.mockResolvedValue({ violations: [], republished: false });
  mockApprove.mockResolvedValue(undefined);
});

const open = () => render(<PlanReviewDetailScreen />);

describe('PlanReviewDetailScreen', () => {
  it('shows the check-in that produced the draft, not just the draft', async () => {
    // The coach's job is judging the session against what the athlete reported. A
    // screen that shows only the workout makes them go and look it up.
    const r = await open();
    await waitFor(() => expect(r.getByText('planReview.theirCheckIn')).toBeTruthy());
    expect(r.getByText(/Back is tight/)).toBeTruthy();
  });

  it('renders the drafted exercises as editable fields', async () => {
    const r = await open();
    await waitFor(() => expect(r.getByDisplayValue('Back Squat')).toBeTruthy());
    expect(r.getByDisplayValue('Leg Curl')).toBeTruthy();
  });

  it('approves without a save when nothing was touched', async () => {
    const r = await open();
    await waitFor(() => expect(r.getByDisplayValue('Back Squat')).toBeTruthy());

    fireEvent.press(r.getByText('planReview.approve'));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('review-1', undefined));
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it('saves an unsaved edit BEFORE approving, so the approved session is the edited one', async () => {
    // Approve publishes whatever the SERVER holds. Approving with a dirty form would
    // ship the version the coach just changed away from — the one case where the coach
    // is most likely to believe their change went out.
    const r = await open();
    await waitFor(() => expect(r.getByDisplayValue('Back Squat')).toBeTruthy());

    fireEvent.changeText(r.getByDisplayValue('Back Squat'), 'Front Squat');
    // Per test/setup.ts: a state-changing fireEvent has not committed by the time the
    // next query runs. The Save button only exists once the form is dirty, so waiting
    // for it is both the sync point and proof the edit registered.
    await waitFor(() => expect(r.getByText('planReview.saveChanges')).toBeTruthy());

    fireEvent.press(r.getByText('planReview.approve'));

    await waitFor(() => expect(mockEdit).toHaveBeenCalled());
    const [, body] = mockEdit.mock.calls[0];
    expect(body.exercises[0].name).toBe('Front Squat');
    expect(mockApprove).toHaveBeenCalled();
  });

  it('sends the whole remaining session when an exercise is removed', async () => {
    // The API replaces rather than patches, so a removal has to arrive as absence.
    const r = await open();
    await waitFor(() => expect(r.getByDisplayValue('Leg Curl')).toBeTruthy());

    fireEvent.press(r.getAllByLabelText('planReview.removeExercise')[1]);

    await waitFor(() => expect(r.getByText('planReview.saveChanges')).toBeTruthy());
    fireEvent.press(r.getByText('planReview.saveChanges'));

    await waitFor(() => expect(mockEdit).toHaveBeenCalled());
    const [, body] = mockEdit.mock.calls[0];
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0].name).toBe('Back Squat');
  });

  it('hides approve and reject once the session is already with the athlete', async () => {
    // It has shipped; the only remaining action is an edit, which re-publishes.
    mockDetail.mockResolvedValue({ ...DETAIL, status: 'approved', releasedAt: new Date().toISOString() });

    const r = await open();

    await waitFor(() => expect(r.getByText('planReview.alreadyReleased')).toBeTruthy());
    expect(r.queryByText('planReview.approve')).toBeNull();
    expect(r.queryByText('planReview.reject')).toBeNull();
  });
});
