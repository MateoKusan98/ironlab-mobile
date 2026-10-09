import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

/* eslint-disable import/first */
import { LastTimeLine } from '../LastTimeLine';

const SETS = [{ reps: 5, weight: 160, rpe: 8 }];

describe('LastTimeLine', () => {
  // 2026-10-09: the "How did it go?" note was saved on every exercise and never shown again.
  it('shows the athlete\'s own note from last time under the numbers', async () => {
    const r = await render(
      <LastTimeLine exerciseName="Competition Squat" lastTime={{ completedAt: new Date().toISOString(), sets: SETS, note: 'belt from set 3' }} />,
    );
    expect(r.getByText('“belt from set 3”')).toBeTruthy();
  });

  it('adds no note line when none was written', async () => {
    const r = await render(
      <LastTimeLine exerciseName="Competition Squat" lastTime={{ completedAt: new Date().toISOString(), sets: SETS }} />,
    );
    expect(r.queryByText(/“/)).toBeNull();
  });
});
