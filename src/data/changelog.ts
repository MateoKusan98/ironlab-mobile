/**
 * User-facing changelog.
 *
 * Each entry maps an app version to a short, plain-language list of what
 * changed — written for users, not developers. The "What's New" modal
 * (see WhatsNewContext) shows every entry newer than the last version the
 * user has seen, the first time they open a freshly-updated build.
 *
 * To ship release notes: bump `version` in app.json, then add an entry here
 * with the matching version string. Keep highlights short and benefit-focused;
 * lead each with an emoji for a bit of personality. Newest entry goes first.
 */
export interface ChangelogEntry {
  /** Must match an app.json `expo.version` (e.g. "1.1.0"). */
  version: string;
  /** Human date, shown under the version badge. */
  date: string;
  /** Optional headline for the release. */
  title?: string;
  /** Simplified, user-facing bullets. */
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: 'June 2026',
    title: 'Welcome to IronLab',
    highlights: [
      '🏋️ Your AI coach builds and adapts a training plan around every session you log.',
      '🍎 Track nutrition by scanning meals, barcodes, or logging manually.',
      '🏅 Earn PRs and badges as you hit new milestones.',
    ],
  },
  // Add the next release above this line, e.g.:
  // {
  //   version: '1.1.0',
  //   date: 'July 2026',
  //   highlights: ['✨ ...'],
  // },
];

/**
 * Compare two semver-ish version strings ("1.2.0").
 * Returns >0 if a is newer, <0 if older, 0 if equal. Missing/extra segments
 * are treated as 0, and non-numeric junk is ignored.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Entries strictly newer than `version`, newest first. */
export function entriesNewerThan(version: string): ChangelogEntry[] {
  return CHANGELOG.filter((e) => compareVersions(e.version, version) > 0).sort(
    (x, y) => compareVersions(y.version, x.version),
  );
}
