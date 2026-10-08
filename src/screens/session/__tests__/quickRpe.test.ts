import { formatRpe, quickRpeOptions } from '../quickRpe';

describe('one-tap RPE chips', () => {
  it('centres five half-point chips on the prescribed RPE', () => {
    expect(quickRpeOptions(8)).toEqual([7, 7.5, 8, 8.5, 9]);
  });

  it('slides the window instead of offering an RPE above 10 for a 9.5 target', () => {
    expect(quickRpeOptions(9.5)).toEqual([8, 8.5, 9, 9.5, 10]);
    expect(quickRpeOptions(10)).toEqual([8, 8.5, 9, 9.5, 10]);
  });

  it('gives a set added mid-workout (no target) whole points across the working range', () => {
    expect(quickRpeOptions(undefined)).toEqual([6, 7, 8, 9, 10]);
  });

  it('prints chips the way the RPE box shows them', () => {
    expect([8, 8.5].map(formatRpe)).toEqual(['8', '8.5']);
  });
});
