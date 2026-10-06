import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiCoachService } from '../../../services/ai-coach.service';
import { apiErrorStatus } from '../../../utils/apiError';
import { PlanGeneration, REGEN_DATE_KEY } from './usePlanGeneration';

export type ActiveInjury = { id: string; exerciseName: string | null; description: string };

/**
 * Active injuries and how the coach should handle them. Choosing a handling regenerates
 * today's plan, so this reads the plan-generation state.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function useInjuries(gen: PlanGeneration) {
  const { setPlan, setGeneratedAt, setGenerating, setPlanReady, setRegenUsedToday } = gen;
  const [activeInjuries, setActiveInjuries] = useState<ActiveInjury[]>([]);
  const [injuryHandling, setInjuryHandling] = useState<string | null>(null);
  const [injuryModalVisible, setInjuryModalVisible] = useState(false);

  const handleSaveInjuryPreference = async (handling: 'replace' | 'remove' | 'reduce') => {
    try {
      await aiCoachService.setInjuryPreference(handling);
      setInjuryHandling(handling);
      setInjuryModalVisible(false);
      setPlanReady(false);
      setGenerating(true);
      const newPlan = await aiCoachService.generatePlan();
      setPlan(newPlan);
      setGeneratedAt(new Date().toISOString());
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
      setRegenUsedToday(true);
      setPlanReady(true);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      if (status === 429) {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
        setRegenUsedToday(true);
      }
      Alert.alert('Error', 'Could not save injury preference.');
      setGenerating(false);
    }
  };

  /**
   * Retract a wrongly-detected injury. Injuries are coach NOTES (category INJURY), so
   * clearing one is the same soft-delete the notes screen uses — it stays in the DB,
   * just inactive, and stops constraining plan generation. The plan is NOT regenerated
   * here: the athlete may be clearing several at once, and the next session picks the
   * change up anyway. Closes the modal once the last one is gone, since there is then
   * nothing left for the handling options to apply to.
   */
  const handleClearInjury = async (id: string) => {
    try {
      await aiCoachService.deleteNote(id);
      const remaining = activeInjuries.filter((i) => i.id !== id);
      setActiveInjuries(remaining);
      if (!remaining.length) setInjuryModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not remove that injury. Check your connection and try again.');
    }
  };

  return {
    activeInjuries, setActiveInjuries, injuryHandling, setInjuryHandling, injuryModalVisible, setInjuryModalVisible,
    handleSaveInjuryPreference, handleClearInjury,
  };
}
