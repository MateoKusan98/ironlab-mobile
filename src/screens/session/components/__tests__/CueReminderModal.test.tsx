import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CueReminderModal } from '../CueReminderModal';
import { ExerciseCue } from '../../../../services/exerciseCue.service';

const cue = (id: string, text: string): ExerciseCue =>
  ({ id, exerciseKey: 'squat', text } as ExerciseCue);

const exName = (n: string) => n;

describe('CueReminderModal', () => {
  it('renders nothing visible when there is no reminder', async () => {
    const r = await render(<CueReminderModal reminder={null} onDismiss={jest.fn()} exName={exName} />);
    expect(r.queryByText(/Remember for/)).toBeNull();
  });

  it('lists every saved cue for the exercise', async () => {
    const r = await render(
      <CueReminderModal
        reminder={{ name: 'Squat', cues: [cue('a', 'knees out'), cue('b', 'brace hard')] }}
        onDismiss={jest.fn()}
        exName={exName}
      />,
    );
    expect(r.getByText('knees out')).toBeTruthy();
    expect(r.getByText('brace hard')).toBeTruthy();
  });

  it('shows the exercise name through the localised resolver', async () => {
    const r = await render(
      <CueReminderModal
        reminder={{ name: 'Bench Press', cues: [cue('a', 'tuck elbows')] }}
        onDismiss={jest.fn()}
        exName={(n) => `[${n}]`}
      />,
    );
    expect(r.getByText(/\[Bench Press\]/)).toBeTruthy();
  });

  it('dismisses when the confirm button is pressed', async () => {
    const onDismiss = jest.fn();
    const r = await render(
      <CueReminderModal
        reminder={{ name: 'Squat', cues: [cue('a', 'knees out')] }}
        onDismiss={onDismiss}
        exName={exName}
      />,
    );
    fireEvent.press(r.getByText(/Got it/));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('survives a reminder with an empty cue list', async () => {
    const r = await render(
      <CueReminderModal
        reminder={{ name: 'Squat', cues: [] }}
        onDismiss={jest.fn()}
        exName={exName}
      />,
    );
    expect(r.getByText(/Remember for/)).toBeTruthy();
  });
});
