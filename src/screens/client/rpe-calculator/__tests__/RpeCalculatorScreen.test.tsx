import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RpeChart } from '../../../../services/session.service';

const mockGetRpeChart = jest.fn<Promise<RpeChart>, []>();
jest.mock('../../../../services/session.service', () => ({
  sessionService: { getRpeChart: () => mockGetRpeChart() },
}));

/* eslint-disable import/first */
import { RpeCalculatorScreen } from '../RpeCalculatorScreen';

const CHART: RpeChart = {
  rpe: [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6],
  pctByReps: [
    [100.0, 97.8, 95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3],
    [95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7],
    [92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1],
    [89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6],
    [86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6, 77.4, 76.2],
  ],
  nearFailureRpe: 8,
  nearFailureMaxReps: 8,
};

describe('RpeCalculatorScreen', () => {
  beforeEach(() => {
    mockGetRpeChart.mockReset();
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
  });

  // Defaults are a triple @ 8 in, a five @ 8 out: 160 / 86.3% = 185.4, × 81.1% = 150.4 → 150.
  it('turns a typed triple into the weight for a five, on a loadable plate', async () => {
    mockGetRpeChart.mockResolvedValue(CHART);
    const r = await render(<RpeCalculatorScreen />);
    const input = await waitFor(() => r.getByLabelText('Weight lifted, in kg'));
    fireEvent.changeText(input, '160');
    await waitFor(() => expect(r.getByText('150 kg')).toBeTruthy());
    expect(r.getByText('Estimated max: 185.4 kg')).toBeTruthy();
    expect(r.queryByText(/Rough estimate/)).toBeNull();
  });

  it('accepts a decimal comma, the way half the app\'s languages type it', async () => {
    mockGetRpeChart.mockResolvedValue(CHART);
    const r = await render(<RpeCalculatorScreen />);
    const input = await waitFor(() => r.getByLabelText('Weight lifted, in kg'));
    fireEvent.changeText(input, '162,5');
    await waitFor(() => expect(r.getByText('Estimated max: 188.3 kg')).toBeTruthy());
  });

  it('works offline in a basement gym once the chart has been fetched before', async () => {
    await AsyncStorage.setItem('rpeChart:v1', JSON.stringify(CHART));
    mockGetRpeChart.mockRejectedValue(new Error('offline'));
    const r = await render(<RpeCalculatorScreen />);
    await waitFor(() => expect(r.getByLabelText('Weight lifted, in kg')).toBeTruthy());
  });

  it('says it needs a connection rather than inventing a chart when offline on first open', async () => {
    mockGetRpeChart.mockRejectedValue(new Error('offline'));
    const r = await render(<RpeCalculatorScreen />);
    await waitFor(() => expect(r.getByText(/needs a connection/)).toBeTruthy());
  });
});
