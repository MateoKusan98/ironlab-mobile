import { getSubstitutes } from '../substitutes';

const BIG_COMPOUNDS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row'];

describe('getSubstitutes', () => {
  it('never offers Squat/Bench/Deadlift for the Face Pull at the end of the session (2026-10-12)', () => {
    const subs = getSubstitutes('Face Pull');
    for (const lift of BIG_COMPOUNDS) expect(subs).not.toContain(lift);
    expect(subs[0]).toBe('Rear Delt Cable Fly');
    // Mateo's own examples of a sensible "skip it" swap for the last slot.
    expect(subs).toEqual(expect.arrayContaining(['Cable Crunch', 'Tricep Pushdown', 'Farmer Carry']));
  });

  it('swaps a secondary bench (Spoto) for another bench variation, not Cable Fly or Dip', () => {
    const subs = getSubstitutes('Spoto Press');
    expect(subs.slice(0, 3)).toEqual(['Paused Bench Press', 'Tempo Bench Press', 'Close-Grip Bench Press']);
    expect(subs).not.toContain('Cable Fly');
    expect(subs).not.toContain('Dip');
    expect(subs).not.toContain('Spoto Press');
  });

  it('offers comp-lift variations for the comp lift, with no easy fillers in the main slot', () => {
    const subs = getSubstitutes('Back Squat');
    expect(subs).toContain('Paused Squat');
    expect(subs).not.toContain('Cable Crunch');
    expect(getSubstitutes('Deadlift')).not.toContain('Deadlift');
  });

  it('treats an RDL as a hinge accessory, never as a reason to pull from the floor', () => {
    const subs = getSubstitutes('Romanian Deadlift');
    expect(subs).toContain('Back Extension');
    expect(subs).not.toContain('Deadlift');
    expect(subs).not.toContain('Deficit Deadlift');
  });

  it('keeps hamstring curls apart from biceps curls, and calves apart from leg press', () => {
    expect(getSubstitutes('Seated Leg Curl')[0]).toBe('Lying Leg Curl');
    expect(getSubstitutes('Leg Press Calf Raise')[0]).toBe('Calf Raise');
  });

  it('suggests for the PRESCRIBED slot on a second swap and never offers back the current movement', () => {
    const subs = getSubstitutes('Face Pull', 'Cable Crunch');
    expect(subs[0]).toBe('Rear Delt Cable Fly');
    expect(subs).not.toContain('Cable Crunch');
    expect(subs).not.toContain('Face Pull');
  });

  it('falls back to easy accessories, not the big compounds, for a name it does not know', () => {
    const subs = getSubstitutes('Sled Push');
    for (const lift of BIG_COMPOUNDS) expect(subs).not.toContain(lift);
    expect(subs.length).toBeGreaterThan(0);
  });
});
