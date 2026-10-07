import { convertTyped, formatVolume, formatWeight, plateSetFor, prescribedInUnit, toKg } from '../weight';

describe('bar weights in the athlete\'s unit', () => {
  it('round-trips a typed 225lb through the 2-decimal kg column back to 225', () => {
    expect(formatWeight(toKg(225, 'lb'), 'lb')).toBe('225lb');
  });

  it('puts an engine load on a 5lb step, and an empty 20kg bar on a 45lb bar — not a 40', () => {
    expect(prescribedInUnit(102.5, 'lb')).toBe(225);
    expect(prescribedInUnit(20, 'lb')).toBe(45);
  });

  it('leaves kilos alone', () => {
    expect(formatWeight(162.5, 'kg')).toBe('162.5kg');
    expect(toKg(162.5, 'kg')).toBe(162.5);
  });

  it('draws a pound lifter no plates at all rather than kg plates, when the server sent no pound ladder', () => {
    expect(plateSetFor({ barKg: 20, plates: [25, 20] }, 'lb')).toBeNull();
    expect(plateSetFor({ barKg: 20, plates: [25, 20], lb: { bar: 45, plates: [45] } }, 'lb')).toEqual({ bar: 45, plates: [45] });
  });

  it('re-expresses a weight typed in kg after a switch to pounds', () => {
    expect(convertTyped('100', 'kg', 'lb')).toBe('220.5');
  });

  it('formats volume in tonnes or thousands of pounds', () => {
    expect(formatVolume(12450, 'kg')).toBe('12.4 t');
    expect(formatVolume(850, 'kg')).toBe('850 kg');
    expect(formatVolume(12450, 'lb')).toBe('27.4k lb');
  });
});
