import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SubstituteExerciseModal, rankSubstitutes } from '../SubstituteExerciseModal';

const SUGGESTIONS = ['Front Squat', 'Hack Squat', 'Leg Press'] as const;
const CATALOGUE = ['Back Squat', 'Front Squat', 'Hack Squat', 'Leg Press', 'Bulgarian Split Squat'] as const;

const open = (props: Partial<React.ComponentProps<typeof SubstituteExerciseModal>> = {}) =>
  render(
    <SubstituteExerciseModal
      exerciseName="Back Squat"
      loggedSetCount={0}
      isKeyLift={false}
      suggestions={SUGGESTIONS}
      catalogue={CATALOGUE}
      onClose={jest.fn()}
      onSubstitute={jest.fn()}
      exName={(n) => n}
      {...props}
    />,
  );

describe('rankSubstitutes', () => {
  it('shows only the coach suggestions when nothing is typed', () => {
    expect(rankSubstitutes('', SUGGESTIONS, CATALOGUE, 'Back Squat')).toEqual([...SUGGESTIONS]);
  });

  it('puts matching suggestions ahead of the rest of the catalogue', () => {
    const out = rankSubstitutes('squat', SUGGESTIONS, CATALOGUE, 'Back Squat');
    expect(out[0]).toBe('Front Squat');
    expect(out).toContain('Bulgarian Split Squat');
    expect(out.indexOf('Front Squat')).toBeLessThan(out.indexOf('Bulgarian Split Squat'));
  });

  it('never offers the exercise being replaced', () => {
    expect(rankSubstitutes('squat', SUGGESTIONS, CATALOGUE, 'Back Squat')).not.toContain('Back Squat');
  });

  it('does not list a suggestion twice when it is also in the catalogue', () => {
    const out = rankSubstitutes('front', SUGGESTIONS, CATALOGUE, 'Back Squat');
    expect(out.filter((x) => x === 'Front Squat')).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    expect(rankSubstitutes('LEG', SUGGESTIONS, CATALOGUE, 'Back Squat')).toContain('Leg Press');
  });
});

describe('SubstituteExerciseModal', () => {
  it('names the exercise being replaced', async () => {
    const r = await open();
    expect(r.getByText('REPLACING')).toBeTruthy();
    expect(r.getByText('Back Squat')).toBeTruthy();
  });

  it('warns before substituting a competition lift', async () => {
    const r = await open({ isKeyLift: true });
    expect(r.getByText(/Key lift for today/)).toBeTruthy();
  });

  it('stays quiet for an accessory', async () => {
    const r = await open({ isKeyLift: false });
    expect(r.queryByText(/Key lift for today/)).toBeNull();
  });

  it('explains that already-logged sets keep the original name', async () => {
    const r = await open({ loggedSetCount: 3 });
    expect(r.getByText(/3 already-logged sets will remain under "Back Squat"/)).toBeTruthy();
  });

  it('uses the singular for one logged set', async () => {
    const r = await open({ loggedSetCount: 1 });
    expect(r.getByText(/1 already-logged set will remain/)).toBeTruthy();
  });

  it('says nothing about history when no sets are logged', async () => {
    const r = await open({ loggedSetCount: 0 });
    expect(r.queryByText(/already-logged/)).toBeNull();
  });

  it('substitutes the exercise that was tapped', async () => {
    const onSubstitute = jest.fn();
    const r = await open({ onSubstitute });
    fireEvent.press(r.getByText('Leg Press'));
    expect(onSubstitute).toHaveBeenCalledWith('Leg Press');
  });

  it('allows a free-text substitute the catalogue has never heard of', async () => {
    const onSubstitute = jest.fn();
    const r = await open({ onSubstitute });
    fireEvent.changeText(r.getByPlaceholderText('Search substitutes...'), 'Belt Squat');
    const row = await waitFor(() => r.getByText(/Use "Belt Squat"/));
    fireEvent.press(row);
    expect(onSubstitute).toHaveBeenCalledWith('Belt Squat');
  });

  it('renders nothing when closed', async () => {
    const r = await open({ exerciseName: null });
    expect(r.queryByText('REPLACING')).toBeNull();
  });
});
