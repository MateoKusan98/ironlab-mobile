import { useState } from 'react';
import { Alert } from 'react-native';
import { aiCoachService, FatigueStatus, PrForecast } from '../../../services/ai-coach.service';
import { apiErrorMessage } from '../../../utils/apiError';

/**
 * The recovery status card and the PR forecast beside it, plus the athlete's
 * "I feel fine" dismissal and its undo.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function useFatigueStatus() {
  const [fatigue, setFatigue] = useState<FatigueStatus | null>(null);
  const [prForecast, setPrForecast] = useState<PrForecast | null>(null);
  const [fatigueModalVisible, setFatigueModalVisible] = useState(false);
  const [fatigueBusy, setFatigueBusy] = useState(false);

  const handleDismissFatigue = async () => {
    setFatigueBusy(true);
    try {
      setFatigue(await aiCoachService.dismissFatigue());
    } catch (e: unknown) {
      Alert.alert('Not available', apiErrorMessage(e, 'Could not clear your fatigue status.'));
    } finally {
      setFatigueBusy(false);
    }
  };

  const handleResumeFatigue = async () => {
    setFatigueBusy(true);
    try {
      setFatigue(await aiCoachService.resumeFatigue());
    } catch {
      Alert.alert('Error', 'Could not update your recovery status.');
    } finally {
      setFatigueBusy(false);
    }
  };

  return {
    fatigue, setFatigue, prForecast, setPrForecast, fatigueModalVisible, setFatigueModalVisible, fatigueBusy,
    handleDismissFatigue, handleResumeFatigue,
  };
}
