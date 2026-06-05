import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Circle,
  Ellipse,
  Path,
  Polygon,
  ClipPath,
  G,
} from 'react-native-svg';
import { Lock } from 'phosphor-react-native';

// ── Tier system ──────────────────────────────────────────────────────────────
export type MedalTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';

export const TIER_ORDER: MedalTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'];

interface TierPalette {
  light: string;   // top highlight / sheen
  mid: string;     // main metal body
  dark: string;    // lower body
  deep: string;    // rim shadow / inner shadow
  rim: string;     // bright bevel edge
  glow: string;    // outer halo
  emblem: string;  // raised star colour
  label: string;
}

export const TIERS: Record<MedalTier, TierPalette> = {
  bronze: {
    light: '#F4C58B', mid: '#C77B3F', dark: '#7A4520', deep: '#3E2412',
    rim: '#FBE3C6', glow: '#C77B3F', emblem: '#FFEFDD', label: 'BRONZE',
  },
  silver: {
    light: '#FCFDFF', mid: '#C4CDD8', dark: '#79858F', deep: '#2B3138',
    rim: '#FFFFFF', glow: '#C4CDD8', emblem: '#FFFFFF', label: 'SILVER',
  },
  gold: {
    light: '#FFECB0', mid: '#E9B53F', dark: '#9C6E13', deep: '#5A3E08',
    rim: '#FFF6D8', glow: '#F5C451', emblem: '#FFF7D6', label: 'GOLD',
  },
  platinum: {
    light: '#F4FAFF', mid: '#C2D5E8', dark: '#7E93A8', deep: '#2C3742',
    rim: '#FFFFFF', glow: '#9BC4FF', emblem: '#FFFFFF', label: 'PLATINUM',
  },
  diamond: {
    light: '#F0FBFF', mid: '#BFE9F5', dark: '#6FA9C4', deep: '#234B5E',
    rim: '#FFFFFF', glow: '#8EE6FF', emblem: '#FFFFFF', label: 'DIAMOND',
  },
  legendary: {
    light: '#FFE0B0', mid: '#F2751C', dark: '#B23A0A', deep: '#4A1405',
    rim: '#FFE8C4', glow: '#FF7A1E', emblem: '#FFEAC9', label: 'LEGENDARY',
  },
};

const LOCKED: TierPalette = {
  light: '#34343A', mid: '#222227', dark: '#161619', deep: '#0B0B0D',
  rim: '#3C3C42', glow: 'transparent', emblem: '#4C4C55', label: 'LOCKED',
};

// 5-point star path, outer R / inner r, centred at (cx, cy)
function starPath(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (i % 2 === 0 ? R : r);
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}
const STAR = starPath(50, 49, 15, 6);

// Unique gradient ids so multiple medallions on screen never collide (Android).
let _mid = 0;

interface Props {
  tier: MedalTier;
  size?: number;
  locked?: boolean;
}

export const Medallion: React.FC<Props> = ({ tier, size = 76, locked = false }) => {
  const uid = useRef(`m${_mid++}`).current;
  const p = locked ? LOCKED : TIERS[tier];

  const gFace = `${uid}-face`;
  const gRing = `${uid}-ring`;
  const gGlow = `${uid}-glow`;
  const gSheen = `${uid}-sheen`;
  const gStar = `${uid}-star`;
  const cFace = `${uid}-cface`;

  // reeded rim: a dashed ring fakes the milled edge of a coin
  const reedR = 38;
  const reedCirc = 2 * Math.PI * reedR;
  const reedSeg = (reedCirc / 70).toFixed(2);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Domed metal face — light source top-left */}
          <RadialGradient id={gFace} cx="0.38" cy="0.30" r="0.75">
            <Stop offset="0" stopColor={p.light} />
            <Stop offset="0.45" stopColor={p.mid} />
            <Stop offset="1" stopColor={p.dark} />
          </RadialGradient>
          {/* Beveled rim — vertical light→dark */}
          <LinearGradient id={gRing} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.light} />
            <Stop offset="0.5" stopColor={p.dark} />
            <Stop offset="1" stopColor={p.deep} />
          </LinearGradient>
          {/* Outer glow halo */}
          <RadialGradient id={gGlow} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.62" stopColor={p.glow} stopOpacity={locked ? 0 : 0.55} />
            <Stop offset="0.85" stopColor={p.glow} stopOpacity={locked ? 0 : 0.12} />
            <Stop offset="1" stopColor={p.glow} stopOpacity="0" />
          </RadialGradient>
          {/* Specular sheen */}
          <LinearGradient id={gSheen} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={locked ? 0.06 : 0.5} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
          {/* Raised star relief — light top, dark bottom */}
          <LinearGradient id={gStar} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.light} />
            <Stop offset="1" stopColor={p.dark} />
          </LinearGradient>
          <ClipPath id={cFace}>
            <Circle cx="50" cy="50" r="31" />
          </ClipPath>
        </Defs>

        {/* glow */}
        <Circle cx="50" cy="50" r="50" fill={`url(#${gGlow})`} />

        {/* rim + reeded edge */}
        <Circle cx="50" cy="50" r="40" fill={`url(#${gRing})`} />
        <Circle cx="50" cy="50" r={reedR} fill="none" stroke={p.deep} strokeOpacity={0.55} strokeWidth={4} strokeDasharray={`${reedSeg} ${reedSeg}`} />
        <Circle cx="50" cy="50" r={reedR} fill="none" stroke={p.rim} strokeOpacity={locked ? 0.1 : 0.4} strokeWidth={4} strokeDasharray={`${reedSeg} ${reedSeg}`} strokeDashoffset={Number((reedCirc / 140).toFixed(2))} />

        {/* inner bevel base + face */}
        <Circle cx="50" cy="50" r="33" fill={p.deep} />
        <Circle cx="50" cy="50" r="31" fill={`url(#${gFace})`} />

        {/* surface detail (clipped to face) */}
        <G clipPath={`url(#${cFace})`}>
          {/* diamond facets */}
          {tier === 'diamond' && !locked && (
            <>
              <Polygon points="50,20 68,50 50,80 32,50" fill="#FFFFFF" opacity={0.10} />
              <Polygon points="50,20 50,80 32,50" fill="#FFFFFF" opacity={0.06} />
            </>
          )}
          {/* legendary iridescent wash */}
          {tier === 'legendary' && !locked && (
            <Ellipse cx="42" cy="40" rx="30" ry="24" fill="#FF3DA6" opacity={0.10} />
          )}
          <Ellipse cx="50" cy="32" rx="24" ry="13" fill={`url(#${gSheen})`} />
          <Ellipse cx="50" cy="66" rx="26" ry="14" fill={p.deep} opacity={0.32} />
          <Circle cx="50" cy="50" r="31" fill="none" stroke={p.rim} strokeOpacity={locked ? 0.12 : 0.45} strokeWidth="1" />
        </G>

        {/* engraved star emblem (raised relief + drop shadow) */}
        <Path d={STAR} fill={p.deep} opacity={locked ? 0.5 : 0.55} transform="translate(0,1.4)" />
        <Path d={STAR} fill={`url(#${gStar})`} opacity={locked ? 0.6 : 1} />
        <Path d={STAR} fill="none" stroke={p.rim} strokeOpacity={locked ? 0.1 : 0.35} strokeWidth="0.6" />
      </Svg>

      {/* Lock chip for locked medals */}
      {locked && (
        <View style={[styles.lockChip, { width: size * 0.32, height: size * 0.32, borderRadius: size * 0.16, right: size * 0.02, bottom: size * 0.02 }]}>
          <Lock size={size * 0.17} weight="bold" color="#8A8A93" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lockChip: {
    position: 'absolute',
    backgroundColor: '#0C0C0E',
    borderWidth: 1,
    borderColor: '#2A2A30',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
