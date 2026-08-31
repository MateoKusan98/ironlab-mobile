import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoadAdjustCard } from '../LoadAdjustCard';
import { InSessionAdjustment } from '../../../../services/ai-coach.service';

// The 2026-08-28 case this card exists for: 4×8 @ 162.5kg prescribed at RPE 7, set one
// comes back at RPE 9, three sets left.
const CUT: InSessionAdjustment = {
  exercise: 'Competition Squat',
  currentWeight: 162.5,
  suggestedWeight: 150,
  cutKg: 12.5,
  cutPct: 7.7,
  observedRpe: 9,
  targetRpe: 7,
  observedE1Rm: 213.3,
  plannedAnchor: 230,
  remainingSets: 3,
  capped: false,
};

const open = (adjustment: InSessionAdjustment | null, handlers = {}) =>
  render(
    <LoadAdjustCard
      adjustment={adjustment}
      exerciseName="Competition Squat"
      onApply={jest.fn()}
      onDismiss={jest.fn()}
      {...handlers}
    />,
  );

describe('LoadAdjustCard', () => {
  it('renders nothing when there is no suggestion — the silent case is the common one', async () => {
    const r = await open(null);
    expect(r.queryByText(/Drop to/)).toBeNull();
  });

  it('shows both weights so the athlete can see what changed', async () => {
    const r = await open(CUT);
    expect(r.getByText('162.5kg')).toBeTruthy();
    expect(r.getByText('150kg')).toBeTruthy();
    expect(r.getByText('Drop to 150kg')).toBeTruthy();
  });

  it('states the RPE that triggered it rather than just asserting a number', async () => {
    const r = await open(CUT);
    expect(r.getByText(/RPE 9 against a target of 7/)).toBeTruthy();
  });

  it('says when the cut was bounded, so a bad day is not mistaken for a small one', async () => {
    const clean = await open(CUT);
    expect(clean.queryByText(/Capped/)).toBeNull();
    const bounded = await open({ ...CUT, capped: true });
    expect(bounded.getByText(/Capped/)).toBeTruthy();
  });

  it('applies and dismisses without touching anything itself', async () => {
    const onApply = jest.fn();
    const onDismiss = jest.fn();
    const r = await open(CUT, { onApply, onDismiss });
    fireEvent.press(r.getByText('Drop to 150kg'));
    expect(onApply).toHaveBeenCalledTimes(1);
    fireEvent.press(r.getByText('Keep'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
