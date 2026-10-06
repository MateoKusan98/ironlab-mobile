import { useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The RPE guide: shown the first time the athlete focuses an RPE field, and on demand
 * from the column header.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useRpeGuide() {
  const [rpeGuideVisible, setRpeGuideVisible] = useState(false);
  const rpeGuideSeen = useRef(false);

  const handleRpeFocus = async () => {
    if (rpeGuideSeen.current) return;
    rpeGuideSeen.current = true;
    const seen = await AsyncStorage.getItem('hasSeenRPEGuide');
    if (!seen) {
      setRpeGuideVisible(true);
      await AsyncStorage.setItem('hasSeenRPEGuide', '1');
    }
  };

  return { rpeGuideVisible, setRpeGuideVisible, handleRpeFocus };
}
