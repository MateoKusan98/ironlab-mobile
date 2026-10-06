import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { aiCoachService, FatigueStatus, RecoveryWeekStatus } from '../../../services/ai-coach.service';
import { apiErrorMessage } from '../../../utils/apiError';
import { PlanGeneration } from './usePlanGeneration';

/**
 * The athlete-triggered recovery week / vacation / taper. Starting a window regenerates
 * today's plan to match it and refreshes the fatigue status it suppresses.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function useRecoveryWeek(gen: PlanGeneration, setFatigue: (f: FatigueStatus) => void) {
  const { t } = useTranslation();
  const { setPlan, setGeneratedAt, setGenerating, setPlanReady } = gen;
  const [recoveryWeek, setRecoveryWeek] = useState<RecoveryWeekStatus | null>(null);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const handleTriggerRecovery = async (mode: 'recovery' | 'vacation' | 'taper') => {
    setRecoveryBusy(true);
    try {
      const res = await aiCoachService.triggerRecoveryWeek(mode);
      setRecoveryWeek({ mode: res.mode, until: res.until, resumeWeek: res.resumeWeek });
      setRecoveryModalVisible(false);
      const dateStr = new Date(`${res.until}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (mode === 'vacation') {
        Alert.alert(t('aiCoach.recovery.vacationOnTitle'), t('aiCoach.recovery.vacationOnMsg', { date: dateStr }));
      } else {
        if (mode === 'taper') {
          // The server warns when the signal is too deep for a taper to fix — say so
          // before regenerating, since the peak session may still come back clamped.
          Alert.alert(
            res.fatigueWarning ? t('aiCoach.recovery.taperWarningTitle') : t('aiCoach.recovery.taperOnTitle'),
            res.fatigueWarning ?? t('aiCoach.recovery.taperOnMsg', { date: dateStr }),
          );
        }
        // The window suppresses the alarm's recommendation server-side — pull the fresh
        // status so the banner stops offering a taper that is now running.
        aiCoachService.fatigueCheck().then(setFatigue).catch(() => {});
        // Swap today's stale plan for one that matches the new window right away.
        setPlanReady(false);
        setGenerating(true);
        try {
          const newPlan = await aiCoachService.generatePlan();
          setPlan(newPlan);
          setGeneratedAt(new Date().toISOString());
          setPlanReady(true);
        } catch {
          // Throttled or offline — the recovery window is active server-side either
          // way; the next generated session will come out light.
          setGenerating(false);
        }
      }
    } catch (err: unknown) {
      Alert.alert('Error', apiErrorMessage(err, t('aiCoach.recovery.error')));
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleEndRecovery = () => {
    Alert.alert(t('aiCoach.recovery.endTitle'), t('aiCoach.recovery.endMsg'), [
      { text: t('aiCoach.recovery.keep'), style: 'cancel' },
      {
        text: t('aiCoach.recovery.endConfirm'),
        onPress: async () => {
          try {
            await aiCoachService.cancelRecoveryWeek();
            setRecoveryWeek(null);
          } catch {
            Alert.alert('Error', t('aiCoach.recovery.error'));
          }
        },
      },
    ]);
  };

  return {
    recoveryWeek, setRecoveryWeek, recoveryModalVisible, setRecoveryModalVisible, recoveryBusy,
    handleTriggerRecovery, handleEndRecovery,
  };
}
