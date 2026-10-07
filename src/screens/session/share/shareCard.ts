import type { SessionSet } from '../../../services/session.service';

/**
 * What goes on the shareable session image. Pure, so the numbers on the picture are
 * tested rather than eyeballed.
 *
 * The image shows each lift's TOP SET — the heaviest completed set, more reps breaking
 * a tie — because that is the line a lifter posts. Bodyweight work has no top set to
 * brag about and is left off; it still counts toward sets and volume.
 */

export interface ShareCardLift {
  name: string;
  weight: number;
  reps: number;
}

export interface ShareCardData {
  setCount: number;
  /** Total kg moved, completed sets only. */
  volumeKg: number;
  lifts: ShareCardLift[];
}

/** A story image has room for this many lifts before it becomes a spreadsheet. */
export const MAX_SHARE_LIFTS = 5;

export function buildShareCard(sets: SessionSet[]): ShareCardData {
  const done = sets.filter((s) => s.isCompleted && (s.repsCompleted ?? 0) > 0);
  const volumeKg = done.reduce((acc, s) => acc + Number(s.weightUsed ?? 0) * (s.repsCompleted ?? 0), 0);

  const top = new Map<string, ShareCardLift & { order: number }>();
  for (const s of done) {
    const weight = Number(s.weightUsed ?? 0);
    if (!(weight > 0)) continue;
    const reps = s.repsCompleted!;
    const best = top.get(s.exerciseName);
    if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) {
      top.set(s.exerciseName, { name: s.exerciseName, weight, reps, order: s.exerciseOrder });
    }
  }

  const lifts = [...top.values()]
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_SHARE_LIFTS)
    .map(({ name, weight, reps }) => ({ name, weight, reps }));
  return { setCount: done.length, volumeKg: Math.round(volumeKg), lifts };
}

/** "12,450 kg" → "12.4 t" past a tonne, where the exact kilo stops meaning anything. */
export function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(Math.floor(kg / 100) / 10).toFixed(1)} t` : `${kg} kg`;
}
