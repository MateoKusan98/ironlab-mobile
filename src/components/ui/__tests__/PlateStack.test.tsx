import React from 'react';
import { render } from '@testing-library/react-native';
import { PlateStack } from '../PlateStack';

// The contract this component is worth having: it either draws a stack that
// agrees with the number printed beside it, or it draws nothing. There is no
// third case, because a bar that is close is a bar that gets loaded wrong.

const commercial = { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] };

const stack = (props: Partial<React.ComponentProps<typeof PlateStack>> = {}) =>
  render(<PlateStack weight={152.5} bar={commercial} unit="kg" perSideLabel="per side" {...props} />);

describe('PlateStack', () => {
  it('names the plates for the prescribed weight', async () => {
    const r = await stack();
    expect(r.getByText('25 / 25 / 15 / 1.25 per side')).toBeTruthy();
  });

  it('reads the whole instruction out to a screen reader, bar included', async () => {
    const r = await stack();
    expect(
      r.getByLabelText('152.5 kg: a 20 kg bar plus 25 / 25 / 15 / 1.25 kilos per side'),
    ).toBeTruthy();
  });

  it('says "just the bar" rather than drawing an empty stack', async () => {
    const r = await stack({ weight: 20 });
    expect(r.getByText('20 kg bar')).toBeTruthy();
  });

  it('renders nothing for an athlete whose gym has no barbell', async () => {
    const r = await stack({ bar: null });
    expect(r.toJSON()).toBeNull();
  });

  it('renders nothing rather than a stack that does not add up', async () => {
    // 0.625 a side — no plate here closes it, and rounding it would put the
    // athlete under a bar that disagrees with the prescription above it.
    const r = await stack({ weight: 21.25 });
    expect(r.toJSON()).toBeNull();
  });

  it('loads a pound lifter\'s 225 as two 45s a side on a 45lb bar', async () => {
    const r = await stack({ weight: 225, unit: 'lb', bar: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] } });
    expect(r.getByLabelText('225 lb: a 45 lb bar plus 45 / 45 pounds per side')).toBeTruthy();
  });
});
