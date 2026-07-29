import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddExerciseModal, isCustomExercise } from '../AddExerciseModal';

const CATALOGUE = ['Back Squat', 'Bench Press', 'Deadlift', 'Barbell Row'] as const;

const open = (onAdd = jest.fn(), onClose = jest.fn()) =>
  render(
    <AddExerciseModal visible onClose={onClose} onAdd={onAdd} catalogue={CATALOGUE} />,
  );

describe('isCustomExercise', () => {
  it('needs more than two characters', () => {
    expect(isCustomExercise('ab', CATALOGUE)).toBe(false);
    expect(isCustomExercise('abc', CATALOGUE)).toBe(true);
  });

  it('is false when the catalogue already has that exercise, any casing', () => {
    expect(isCustomExercise('bench press', CATALOGUE)).toBe(false);
    expect(isCustomExercise('  Bench Press  ', CATALOGUE)).toBe(false);
  });

  it('is true for a genuinely new movement', () => {
    expect(isCustomExercise('Zercher Squat', CATALOGUE)).toBe(true);
  });
});

describe('AddExerciseModal', () => {
  it('lists the whole catalogue before any search', async () => {
    const r = await open();
    expect(r.getByText('Back Squat')).toBeTruthy();
    expect(r.getByText('Deadlift')).toBeTruthy();
  });

  it('adds the exercise that was tapped', async () => {
    const onAdd = jest.fn();
    const r = await open(onAdd);
    fireEvent.press(r.getByText('Deadlift'));
    expect(onAdd).toHaveBeenCalledWith('Deadlift');
  });

  it('filters the catalogue as you type, case-insensitively', async () => {
    const r = await open();
    fireEvent.changeText(r.getByPlaceholderText('activeWorkout.searchExercise'), 'bar');
    await waitFor(() => expect(r.getByText('Barbell Row')).toBeTruthy());
    expect(r.queryByText('Deadlift')).toBeNull();
  });

  it('offers a free-text exercise when nothing matches', async () => {
    const r = await open();
    fireEvent.changeText(r.getByPlaceholderText('activeWorkout.searchExercise'), 'Zercher Squat');
    await waitFor(() => expect(r.getByText(/Add "Zercher Squat"/)).toBeTruthy());
  });

  it('does not offer free text when the search matches the catalogue exactly', async () => {
    const r = await open();
    fireEvent.changeText(r.getByPlaceholderText('activeWorkout.searchExercise'), 'Deadlift');
    expect(r.queryByText(/Add "Deadlift"/)).toBeNull();
  });

  it('adds the typed name when the free-text row is tapped', async () => {
    const onAdd = jest.fn();
    const r = await open(onAdd);
    fireEvent.changeText(r.getByPlaceholderText('activeWorkout.searchExercise'), '  Zercher Squat  ');
    const row = await waitFor(() => r.getByText(/Add "Zercher Squat"/));
    fireEvent.press(row);
    expect(onAdd).toHaveBeenCalledWith('Zercher Squat');
  });

  it('closes without adding anything', async () => {
    const onClose = jest.fn();
    const onAdd = jest.fn();
    const r = await open(onAdd, onClose);
    fireEvent.press(r.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
