import { platesPerSide, formatPlates } from '../plateMath';

const commercial = { barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] };
const home = { barKg: 20, plates: [20, 15, 10, 5, 2.5, 1.25] };

describe('platesPerSide', () => {
  it('builds the 152.5kg the athlete is actually asked to load', () => {
    // 152.5 = 20 bar + 66.25 a side → 25 + 25 + 15 + 1.25
    expect(platesPerSide(152.5, commercial)).toEqual([25, 25, 15, 1.25]);
  });

  it('loads largest-first, the order a plate actually goes on the sleeve', () => {
    const stack = platesPerSide(180, commercial)!;
    expect([...stack].sort((a, b) => b - a)).toEqual(stack);
  });

  it('always sums back to the prescribed weight', () => {
    for (const w of [60, 100, 102.5, 140, 152.5, 172.5, 180, 232.5]) {
      const stack = platesPerSide(w, commercial)!;
      expect(stack).not.toBeNull();
      expect(20 + 2 * stack.reduce((a, b) => a + b, 0)).toBeCloseTo(w, 5);
    }
  });

  it('returns an empty stack for the bare bar — "just the bar" is the instruction', () => {
    expect(platesPerSide(20, commercial)).toEqual([]);
  });

  it('refuses anything at or below the bar it cannot build', () => {
    expect(platesPerSide(15, commercial)).toBeNull();
    expect(platesPerSide(0, commercial)).toBeNull();
  });

  it('refuses a weight the plates on hand cannot make EXACTLY, rather than rounding', () => {
    // 21.25 needs 0.625 a side. Every upstream clamp snaps loads to 2× the athlete's
    // smallest plate, so this should never arrive — and if it does, the drawing must
    // not quietly disagree with the number printed beside it.
    expect(platesPerSide(21.25, commercial)).toBeNull();
    // A 1.25kg plate exists here but 1.25 a side is 22.5 total, not 21.25.
    expect(platesPerSide(22.5, commercial)).toEqual([1.25]);
  });

  it('backtracks off a greedy dead end instead of stranding a remainder', () => {
    // Greedy takes the 1.25 first and strands 0.75, which no plate here can close.
    // The exact answer is 0.5 × 4.
    const oddSet = { barKg: 20, plates: [1.25, 0.5] };
    expect(platesPerSide(24, oddSet)).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  it('does not hand a home gym a 25kg plate it was never told about', () => {
    const stack = platesPerSide(152.5, home)!;
    expect(stack).not.toContain(25);
    expect(20 + 2 * stack.reduce((a, b) => a + b, 0)).toBeCloseTo(152.5, 5);
  });

  it('is exact on the quarter-kilo change plates that float-arithmetic strands', () => {
    // 0.25 + 0.25 + 0.25 has no exact float sum; the fill works in hundredths.
    const meet = { barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25] };
    expect(platesPerSide(20.5, meet)).toEqual([0.25]);
    expect(platesPerSide(21.5, meet)).toEqual([0.5, 0.25]);
  });

  it('draws nothing when there is no bar to draw', () => {
    expect(platesPerSide(100, { barKg: 20, plates: [] })).toBeNull();
    expect(platesPerSide(NaN, commercial)).toBeNull();
  });
});

describe('formatPlates', () => {
  it('drops the trailing zero a plate is never marked with', () => {
    expect(formatPlates([25, 10, 2.5])).toBe('25 / 10 / 2.5');
    expect(formatPlates([1.25])).toBe('1.25');
  });
});
