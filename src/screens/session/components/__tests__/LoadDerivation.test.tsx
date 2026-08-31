import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoadDerivation } from '../LoadDerivation';
import { LoadBasisView } from '../../../../services/ai-coach.service';

const BASIS: LoadBasisView = {
  anchor: 230,
  anchorSource: 'stored-1rm',
  role: 'heavy',
  roleMultiplier: 1,
  targetRpe: 7,
  rpeParts: { phase: 7, weeklyRamp: 0, frequencyDamping: 0 },
  incrementKg: 2.5,
  reps: 8,
  stale: null,
};

describe('LoadDerivation', () => {
  it('shows the chain that produced the number', async () => {
    const r = await render(<LoadDerivation basis={BASIS} weight={162.5} weightPerc={71} />);
    expect(r.getByText('WHY 162.5KG')).toBeTruthy();
    expect(r.getByText('230kg')).toBeTruthy();
    expect(r.getByText('your stored 1RM')).toBeTruthy();
    expect(r.getByText('RPE 7')).toBeTruthy();
    expect(r.getByText('71% → 162.5kg')).toBeTruthy();
  });

  it('omits terms that did not move the number', async () => {
    const r = await render(<LoadDerivation basis={BASIS} weight={162.5} />);
    // No "+0 this week", no "−0 for frequency", no role line on an undiscounted day.
    expect(r.queryByText(/this week/)).toBeNull();
    expect(r.queryByText(/training it often/)).toBeNull();
    expect(r.queryByText('heavy day')).toBeNull();
  });

  it('shows the role discount and the RPE terms when they are real', async () => {
    const r = await render(
      <LoadDerivation
        basis={{
          ...BASIS,
          role: 'secondary',
          roleMultiplier: 0.92,
          targetRpe: 7,
          rpeParts: { phase: 7, weeklyRamp: 0.5, frequencyDamping: 0.5 },
        }}
        weight={149}
      />,
    );
    expect(r.getByText('× 92%')).toBeTruthy();
    expect(r.getByText('secondary day')).toBeTruthy();
    expect(r.getByText(/\+0\.5 this week/)).toBeTruthy();
    expect(r.getByText(/−0\.5 for training it often/)).toBeTruthy();
  });

  it('surfaces the benchMax 147.5 that a logged e1RM of 167.7 has left behind', async () => {
    const onFixMax = jest.fn();
    const r = await render(
      <LoadDerivation
        basis={{
          ...BASIS,
          anchor: 147.5,
          stale: { storedAnchor: 147.5, demonstratedE1Rm: 167.7, deltaKg: 20.2, deltaPct: 13.7 },
        }}
        weight={104}
        onFixMax={onFixMax}
      />,
    );
    expect(r.getByText(/167\.7kg — 14% above the 147\.5kg/)).toBeTruthy();
    fireEvent.press(r.getByText('Update your max →'));
    expect(onFixMax).toHaveBeenCalledTimes(1);
  });

  it('says nothing about staleness when the stored max is current', async () => {
    const r = await render(<LoadDerivation basis={BASIS} weight={162.5} />);
    expect(r.queryByText(/Update your max/)).toBeNull();
  });
});
