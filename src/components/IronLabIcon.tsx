import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';

import { theme, palette } from '../theme';
interface Props {
  size?: number;
  /** Show a dark rounded-square background badge */
  bg?: boolean;
}

/**
 * IronLab gear icon mark.
 * 8-tooth cog with hollow center — 100×100 viewBox.
 * Matches the brand logo shown in the style guide.
 */
export const IronLabIcon: React.FC<Props> = ({ size = 48, bg = false }) => {
  // Gear path: 8 teeth, outer R=44, root R=34, tooth half-angle=9°
  // Tooth tops are straight chords (industrial/mechanical look).
  // Center hole punched with fill-rule="evenodd".
  const gearPath = [
    // Tooth 0  (0°)
    'M 83.58,44.68',
    'L 93.46,43.12 L 93.46,56.88 L 83.58,55.32',
    'A 34,34 0 0 1 77.51,69.99',
    // Tooth 1  (45°)
    'L 85.60,75.86 L 75.86,85.60 L 69.99,77.51',
    'A 34,34 0 0 1 55.32,83.58',
    // Tooth 2  (90°)
    'L 56.88,93.46 L 43.12,93.46 L 44.68,83.58',
    'A 34,34 0 0 1 30.01,77.51',
    // Tooth 3  (135°)
    'L 24.14,85.60 L 14.40,75.86 L 22.49,69.99',
    'A 34,34 0 0 1 16.42,55.32',
    // Tooth 4  (180°)
    'L 6.54,56.88 L 6.54,43.12 L 16.42,44.68',
    'A 34,34 0 0 1 22.49,30.01',
    // Tooth 5  (225°)
    'L 14.40,24.14 L 24.14,14.40 L 30.01,22.49',
    'A 34,34 0 0 1 44.68,16.42',
    // Tooth 6  (270°)
    'L 43.12,6.54 L 56.88,6.54 L 55.32,16.42',
    'A 34,34 0 0 1 69.99,22.49',
    // Tooth 7  (315°)
    'L 75.86,14.40 L 85.60,24.14 L 77.51,30.01',
    'A 34,34 0 0 1 83.58,44.68',
    'Z',
    // Center hole (evenodd punches it out)
    'M 66,50 A 16,16 0 1 0 34,50 A 16,16 0 1 0 66,50 Z',
  ].join(' ');

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="il_gear" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.brand[400]} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.brand[700]} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {bg && <Rect width="100" height="100" rx="22" fill={theme.colors.background} />}

      <Path d={gearPath} fill="url(#il_gear)" fillRule="evenodd" />
    </Svg>
  );
};
