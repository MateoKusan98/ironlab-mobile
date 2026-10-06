import { useState } from 'react';
import { Alert } from 'react-native';
import { aiCoachService } from '../../../services/ai-coach.service';
import { apiErrorMessage } from '../../../utils/apiError';

/**
 * The competition date, the block intent it sits beside, and ending an offseason on
 * the athlete's word.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function useCompetitionDate() {
  const [compDate, setCompDate] = useState<string | null>(null);
  const [blockIntent, setBlockIntent] = useState<string | null>(null);
  const [peakBusy, setPeakBusy] = useState(false);
  const [compType, setCompType] = useState<string | null>(null);
  const [compModalVisible, setCompModalVisible] = useState(false);

  const handleSaveCompDate = async (date: string, type: 'meet' | 'pr_test') => {
    try {
      await aiCoachService.setCompetitionDate(date, type);
      setCompDate(date);
      setCompType(type);
      setCompModalVisible(false);
      Alert.alert('Saved', 'Competition date set. Regenerate your plan to apply the new phase.');
    } catch {
      Alert.alert('Error', 'Could not save competition date.');
    }
  };

  /**
   * Ends the offseason on the athlete's word. The server owns the run-in length, so the
   * confirmation can only be honest about it AFTER the call — hence the alert reporting
   * the weeks rather than a prompt promising a number the client guessed.
   */
  const handleTriggerPeak = async () => {
    setPeakBusy(true);
    try {
      const { date, weeksOut } = await aiCoachService.triggerPeak();
      setCompDate(date);
      setCompType('pr_test');
      Alert.alert(
        `PR test in ${weeksOut} weeks`,
        `Your build is done. The next ${weeksOut} weeks ramp into the attempt, then you drop straight back into the offseason. Regenerate your plan to start.`,
      );
    } catch (e) {
      Alert.alert('Not yet', apiErrorMessage(e, 'Could not schedule the test.'));
    } finally {
      setPeakBusy(false);
    }
  };

  const handleClearCompDate = async () => {
    try {
      await aiCoachService.clearCompetitionDate();
      setCompDate(null);
      setCompType(null);
      setCompModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not clear competition date.');
    }
  };

  return {
    compDate, setCompDate, compType, setCompType, blockIntent, setBlockIntent, peakBusy,
    compModalVisible, setCompModalVisible, handleSaveCompDate, handleTriggerPeak, handleClearCompDate,
  };
}
