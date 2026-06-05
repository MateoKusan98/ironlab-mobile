import { MedalTier, TIER_ORDER } from '../components/ui/Medallion';

// ── Profile rank ladder ───────────────────────────────────────────────────────
// A user's profile rank is derived from their total achievement points. Each
// tier needs progressively more points than the last, so the gaps widen as you
// climb — reaching the next rank gets harder the higher you already are.
export interface RankTierDef {
  tier: MedalTier;
  minPoints: number;
}

export const RANK_TIERS: RankTierDef[] = [
  { tier: 'bronze',    minPoints: 0 },
  { tier: 'silver',    minPoints: 500 },
  { tier: 'gold',      minPoints: 1500 },
  { tier: 'platinum',  minPoints: 3500 },
  { tier: 'diamond',   minPoints: 7000 },
  { tier: 'legendary', minPoints: 12000 },
];

export interface RankInfo {
  tier: MedalTier;
  index: number;                                  // position in TIER_ORDER (0 = bronze)
  currentMin: number;                             // points where this tier starts
  next: { tier: MedalTier; minPoints: number } | null;
  pointsToNext: number | null;                    // points still needed for next tier
  progress: number;                               // 0..1 through the current band
}

/** Maps a total achievement-point count to its rank tier + progress to the next. */
export function rankForPoints(points: number): RankInfo {
  const p = Math.max(0, points);

  // Highest tier whose threshold we've reached.
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (p >= RANK_TIERS[i].minPoints) idx = i;
  }

  const current = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1] ?? null;
  const pointsToNext = next ? Math.max(0, next.minPoints - p) : null;
  const progress = next
    ? Math.min(1, (p - current.minPoints) / (next.minPoints - current.minPoints))
    : 1;

  return {
    tier: current.tier,
    index: TIER_ORDER.indexOf(current.tier),
    currentMin: current.minPoints,
    next: next ? { tier: next.tier, minPoints: next.minPoints } : null,
    pointsToNext,
    progress,
  };
}
