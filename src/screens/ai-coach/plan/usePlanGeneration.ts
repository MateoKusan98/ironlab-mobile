import { useEffect, useRef, useState } from 'react';
import { Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { aiCoachService } from '../../../services/ai-coach.service';
import { apiErrorMessage, apiErrorStatus } from '../../../utils/apiError';

export const REGEN_DATE_KEY = '@ironlab_regen_date';

/**
 * Today's plan and regenerating it: the once-a-day manual regeneration, the optional
 * note, and the generating / plan-ready handshake with the quiz overlay.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function usePlanGeneration() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // True once the new plan has come back but the quiz is still up — lets the
  // user finish the question they're on before the plan is revealed.
  const [planReady, setPlanReady] = useState(false);
  const [regenUsedToday, setRegenUsedToday] = useState(false);
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenNote, setRegenNote] = useState('');
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Pulsing dots while generating
  useEffect(() => {
    if (generating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [generating]);

  const handleGenerate = async (note?: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (regenUsedToday) {
      Alert.alert(t('aiCoach.regenLimitTitle'), t('aiCoach.regenLimitMsg'));
      return;
    }
    setShowRegenInput(false);
    setRegenNote('');
    setPlanReady(false);
    setGenerating(true);
    try {
      const newPlan = await aiCoachService.generatePlan(undefined, note?.trim() || undefined);
      setPlan(newPlan);
      setGeneratedAt(new Date().toISOString());
      await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
      setRegenUsedToday(true);
      setPlanReady(true);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      if (status === 429) {
        await AsyncStorage.setItem(REGEN_DATE_KEY, today).catch(() => {});
        setRegenUsedToday(true);
      }
      Alert.alert('Could not generate plan', apiErrorMessage(err, 'Unknown error'));
      setGenerating(false);
    }
  };

  return {
    plan, setPlan, generatedAt, setGeneratedAt, generating, setGenerating, planReady, setPlanReady,
    regenUsedToday, setRegenUsedToday, showRegenInput, setShowRegenInput, regenNote, setRegenNote,
    handleGenerate,
  };
}

export type PlanGeneration = ReturnType<typeof usePlanGeneration>;
