import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RestTimerBanner, formatRest, restColorFor } from '../RestTimerBanner';
import { palette } from '../../../../theme';

describe('formatRest', () => {
  it('zero-pads both parts', () => {
    expect(formatRest(0)).toBe('00:00');
    expect(formatRest(9)).toBe('00:09');
    expect(formatRest(65)).toBe('01:05');
    expect(formatRest(600)).toBe('10:00');
  });
});

describe('restColorFor', () => {
  it('steps green → amber → red as rest runs out', () => {
    expect(restColorFor(120)).toBe(palette.success[500]);
    expect(restColorFor(31)).toBe(palette.success[500]);
    expect(restColorFor(30)).toBe(palette.warning[500]);
    expect(restColorFor(11)).toBe(palette.warning[500]);
    expect(restColorFor(10)).toBe(palette.error[500]);
    expect(restColorFor(0)).toBe(palette.error[500]);
  });
});

describe('RestTimerBanner', () => {
  it('renders nothing when no rest is running', async () => {
    const r = await render(<RestTimerBanner restSecs={null} onAdjust={jest.fn()} onSkip={jest.fn()} />);
    expect(r.queryByText('REST')).toBeNull();
  });

  it('shows the remaining time', async () => {
    const r = await render(<RestTimerBanner restSecs={95} onAdjust={jest.fn()} onSkip={jest.fn()} />);
    expect(r.getByText('REST')).toBeTruthy();
    expect(r.getByText('01:35')).toBeTruthy();
  });

  // One press per test: two presses against a single render leave RNTL v14's
  // concurrent root mid-update, and every later render in the file then fails
  // to commit.
  it('adds 15 seconds', async () => {
    const onAdjust = jest.fn();
    const r = await render(<RestTimerBanner restSecs={60} onAdjust={onAdjust} onSkip={jest.fn()} />);
    fireEvent.press(r.getByLabelText('Add 15 seconds of rest'));
    expect(onAdjust).toHaveBeenCalledWith(15);
  });

  it('subtracts 15 seconds', async () => {
    const onAdjust = jest.fn();
    const r = await render(<RestTimerBanner restSecs={60} onAdjust={onAdjust} onSkip={jest.fn()} />);
    fireEvent.press(r.getByLabelText('Subtract 15 seconds of rest'));
    expect(onAdjust).toHaveBeenCalledWith(-15);
  });

  it('skips the rest period', async () => {
    const onSkip = jest.fn();
    const r = await render(<RestTimerBanner restSecs={60} onAdjust={jest.fn()} onSkip={onSkip} />);
    fireEvent.press(r.getByLabelText('Skip rest'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('still renders at zero rather than disappearing mid-tick', async () => {
    const r = await render(<RestTimerBanner restSecs={0} onAdjust={jest.fn()} onSkip={jest.fn()} />);
    expect(r.getByText('00:00')).toBeTruthy();
  });
});
