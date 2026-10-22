import { filenameFromDisposition } from '../session.service';

describe('training export filename — taken from the server, which dates it on the app calendar', () => {
  it('reads the filename out of the attachment header', () => {
    expect(filenameFromDisposition('attachment; filename="ironlab-sets-2026-10-20.csv"')).toBe('ironlab-sets-2026-10-20.csv');
  });

  it('refuses a name that would write outside the cache directory', () => {
    expect(filenameFromDisposition('attachment; filename="../../Documents/x.csv"')).toBeNull();
  });

  it('falls back (null) when the header is missing', () => {
    expect(filenameFromDisposition(undefined)).toBeNull();
  });
});
