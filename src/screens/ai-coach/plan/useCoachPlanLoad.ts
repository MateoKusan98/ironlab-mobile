import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { aiCoachService, CoachNote, FatigueStatus, PrForecast, RecoveryWeekStatus } from '../../../services/ai-coach.service';
import { REGEN_DATE_KEY } from './usePlanGeneration';
import { ActiveInjury } from './useInjuries';

/** Where the loaded plan state lands — the setters of the screen's other hooks. */
export interface CoachPlanLoadTargets {
  isAICoachSetupComplete: boolean | undefined;
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachPlan'>;
  setRegenUsedToday: (v: boolean) => void;
  setCompDate: (v: string | null) => void;
  setCompType: (v: string | null) => void;
  setBlockIntent: (v: string | null) => void;
  setActiveInjuries: (v: ActiveInjury[]) => void;
  setInjuryHandling: (v: string | null) => void;
  setRecoveryWeek: (v: RecoveryWeekStatus | null) => void;
  setPlan: (v: string | null) => void;
  setGeneratedAt: (v: string | null) => void;
  setFatigue: (v: FatigueStatus) => void;
  setPrForecast: (v: PrForecast | null) => void;
  setNotes: (v: CoachNote[]) => void;
}

/**
 * Loads everything the plan screen shows on mount, and refreshes the session, recovery
 * status and PR forecast whenever the screen regains focus. Returns whether the first
 * load is still in flight.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */
export function useCoachPlanLoad(to: CoachPlanLoadTargets): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!to.isAICoachSetupComplete) {
      to.navigation.replace('AICoachWelcome');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if manual regen was already used today
    AsyncStorage.getItem(REGEN_DATE_KEY).then((d) => {
      if (d === today) to.setRegenUsedToday(true);
    }).catch(() => {});

    aiCoachService.getPlan()
      .then(({ plan: p, generatedAt: ga, competitionDate: cd, competitionType: ct, blockIntent: bi, activeInjuries: ai, injuryHandling: ih, recoveryWeek: rw }) => {
        to.setCompDate(cd);
        to.setCompType(ct);
        to.setBlockIntent(bi ?? null);
        to.setActiveInjuries(ai ?? []);
        to.setInjuryHandling(ih);
        to.setRecoveryWeek(rw ?? null);
        to.setPlan(p);
        to.setGeneratedAt(ga);
        if (!p) to.navigation.replace('StartSession', {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    aiCoachService.fatigueCheck().then(to.setFatigue).catch(() => {});
    aiCoachService.prForecast().then(to.setPrForecast).catch(() => {});
    aiCoachService.getNotes().then(to.setNotes).catch(() => {});
  }, []);

  // Refresh the session + recovery status whenever the screen regains focus — the
  // athlete may have adjusted a load or cleared fatigue over in the coach chat.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      aiCoachService.getPlan()
        .then(({ plan: p, generatedAt: ga }) => { if (!cancelled) { to.setPlan(p); to.setGeneratedAt(ga); } })
        .catch(() => {});
      aiCoachService.fatigueCheck().then((f) => { if (!cancelled) to.setFatigue(f); }).catch(() => {});
      // Refetched on focus alongside fatigue: a session logged elsewhere can settle an
      // open forecast, and a stale "PR ON" card is the one error worth never shipping.
      aiCoachService.prForecast().then((f) => { if (!cancelled) to.setPrForecast(f); }).catch(() => {});
      return () => { cancelled = true; };
    }, []),
  );

  return loading;
}
