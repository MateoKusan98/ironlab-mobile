import type { LastPerformanceSet } from '../../services/session.service';

/**
 * The "Last:" line under an exercise in the live workout — what the athlete did the
 * previous time, compressed the way a lifter writes it in a notebook.
 *
 * Consecutive identical sets collapse ("3×5 @ 160"); a top set with back-offs stays two
 * groups ("1×3 @ 170, 3×5 @ 150"). RPE is the hardest set's, since that is the one the
 * athlete remembers. Pure so it can be tested without rendering.
 */
export function formatLastSets(sets: LastPerformanceSet[]): string {
  const groups: { count: number; reps: number; weight: number | null }[] = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    if (last && last.reps === set.reps && last.weight === set.weight) last.count += 1;
    else groups.push({ count: 1, reps: set.reps, weight: set.weight });
  }
  const scheme = groups
    .map((g) => `${g.count}×${g.reps}${g.weight != null && g.weight > 0 ? ` @ ${formatKg(g.weight)}kg` : ''}`)
    .join(', ');
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r != null);
  return rpes.length ? `${scheme} · RPE ${formatKg(Math.max(...rpes))}` : scheme;
}

/** Whole calendar days between the last session and now, in the device's local time. */
export function daysSince(completedAt: string, nowMs: number): number | null {
  const then = new Date(completedAt);
  if (Number.isNaN(then.getTime())) return null;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((startOf(new Date(nowMs)) - startOf(then)) / 86_400_000));
}

/** "160", "162.5" — never "160.00". */
function formatKg(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
