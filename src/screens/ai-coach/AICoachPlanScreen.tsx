import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '@shared';
import { FitnessQuiz } from '../../components/ui/FitnessQuiz';
import { RecoveryModal, RecoveryBanner } from '../../components/ui/RecoveryWeekControl';
import { PRForecastCard } from '../../components/ui/PRForecastCard';

import { DebugModal } from './plan/DebugModal';
import { InjuryModal, InjuryBanner } from './plan/InjuryControls';
import { CompDateModal, CompBanner, OffseasonBanner } from './plan/CompetitionControls';
import { FatigueBanner, FatigueModal } from './plan/FatigueControls';
import { NotesModal } from './plan/NotesModal';
import { PlanHeader } from './plan/PlanHeader';
import { styles } from './AICoachPlanScreen.styles';
import { usePlanGeneration } from './plan/usePlanGeneration';
import { useCompetitionDate } from './plan/useCompetitionDate';
import { useInjuries } from './plan/useInjuries';
import { useFatigueStatus } from './plan/useFatigueStatus';
import { useRecoveryWeek } from './plan/useRecoveryWeek';
import { useCoachNotes } from './plan/useCoachNotes';
import { useCoachPlanLoad } from './plan/useCoachPlanLoad';
type NavProp = NativeStackNavigationProp<RootStackParamList, 'AICoachPlan'>;

/**
 * Today's AI-coach session and the controls around it. State lives in ./plan hooks
 * (generation, competition date, injuries, fatigue, recovery week, notes, loading) and
 * the banners and sheets in ./plan components; this screen lays them out.
 *
 * Split into hooks and components 2026-10-06 (no behaviour change).
 */
export const AICoachPlanScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ROLE_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN;
  const [debugVisible, setDebugVisible] = useState(false);

  const gen = usePlanGeneration();
  const {
    plan, generatedAt, generating, planReady, setGenerating, setPlanReady,
    regenUsedToday, showRegenInput, setShowRegenInput, regenNote, setRegenNote, handleGenerate,
  } = gen;
  const {
    compDate, setCompDate, compType, setCompType, blockIntent, setBlockIntent, peakBusy,
    compModalVisible, setCompModalVisible, handleSaveCompDate, handleTriggerPeak, handleClearCompDate,
  } = useCompetitionDate();
  const {
    activeInjuries, setActiveInjuries, injuryHandling, setInjuryHandling, injuryModalVisible, setInjuryModalVisible,
    handleSaveInjuryPreference, handleClearInjury,
  } = useInjuries(gen);
  const {
    fatigue, setFatigue, prForecast, setPrForecast, fatigueModalVisible, setFatigueModalVisible, fatigueBusy,
    handleDismissFatigue, handleResumeFatigue,
  } = useFatigueStatus();
  const {
    recoveryWeek, setRecoveryWeek, recoveryModalVisible, setRecoveryModalVisible, recoveryBusy,
    handleTriggerRecovery, handleEndRecovery,
  } = useRecoveryWeek(gen, setFatigue);
  const {
    notes, setNotes, notesModalVisible, setNotesModalVisible, notesBusy, handleAddNote, handleDeleteNote,
  } = useCoachNotes();
  const loading = useCoachPlanLoad({
    isAICoachSetupComplete: user?.isAICoachSetupComplete, navigation,
    setRegenUsedToday: gen.setRegenUsedToday, setCompDate, setCompType, setBlockIntent, setActiveInjuries,
    setInjuryHandling, setRecoveryWeek, setPlan: gen.setPlan, setGeneratedAt: gen.setGeneratedAt,
    setFatigue, setPrForecast, setNotes,
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (generating) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FitnessQuiz
          loading={!planReady}
          title={t('aiCoach.generating')}
          subtitle={t('aiCoach.buildingWorkout')}
          onFinish={() => {
            setGenerating(false);
            setPlanReady(false);
          }}
        />
      </SafeAreaView>
    );
  }

  if (!plan) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DebugModal visible={debugVisible} onClose={() => setDebugVisible(false)} />
      <InjuryModal
        visible={injuryModalVisible}
        injuries={activeInjuries}
        currentHandling={injuryHandling}
        onSave={handleSaveInjuryPreference}
        onClearInjury={handleClearInjury}
        onClose={() => setInjuryModalVisible(false)}
      />
      <CompDateModal
        visible={compModalVisible}
        currentDate={compDate}
        currentType={compType}
        onSave={handleSaveCompDate}
        onClear={handleClearCompDate}
        onClose={() => setCompModalVisible(false)}
      />
      <RecoveryModal
        visible={recoveryModalVisible}
        busy={recoveryBusy}
        onConfirm={handleTriggerRecovery}
        onClose={() => setRecoveryModalVisible(false)}
      />
      <FatigueModal
        visible={fatigueModalVisible}
        status={fatigue}
        busy={fatigueBusy}
        onDismiss={handleDismissFatigue}
        onResume={handleResumeFatigue}
        onTaper={() => { setFatigueModalVisible(false); handleTriggerRecovery('taper'); }}
        onClose={() => setFatigueModalVisible(false)}
      />
      <NotesModal
        visible={notesModalVisible}
        notes={notes}
        busy={notesBusy}
        onAdd={handleAddNote}
        onDelete={handleDeleteNote}
        onClose={() => setNotesModalVisible(false)}
      />

      <PlanHeader
        generatedAt={generatedAt}
        isAdmin={isAdmin}
        generating={generating}
        regenUsedToday={regenUsedToday}
        showRegenInput={showRegenInput}
        regenNote={regenNote}
        setShowRegenInput={setShowRegenInput}
        setRegenNote={setRegenNote}
        setDebugVisible={setDebugVisible}
        handleGenerate={handleGenerate}
      />

      {/* Recovery / fatigue status — always visible so the athlete can manage it */}
      {fatigue && (
        <FatigueBanner status={fatigue} onPress={() => setFatigueModalVisible(true)} />
      )}

      {/* PR forecast. Sits directly under the fatigue banner because the two answer
          the same question from opposite ends — "should I back off?" and "is it on?" —
          and reading them apart is how an athlete talks themselves into a tired max. */}
      <PRForecastCard forecast={prForecast} />

      {/* Injury banner — shown whenever there are active injuries */}
      {activeInjuries.length > 0 && (
        <InjuryBanner
          injuries={activeInjuries}
          handling={injuryHandling}
          onPress={() => setInjuryModalVisible(true)}
        />
      )}

      {/* Coach memory — free-form notes the athlete wants the coach to remember */}
      <TouchableOpacity accessibilityRole="button" style={styles.setCompRow} onPress={() => setNotesModalVisible(true)}>
        <Text style={styles.setCompText}>
          🧠 Coach memory{notes.length > 0 ? ` (${notes.length})` : ' — tell me what to remember'}
        </Text>
        <Text style={styles.setCompArrow}>›</Text>
      </TouchableOpacity>

      {/* Competition countdown banner or "set date" nudge */}
      {compDate ? (
        <CompBanner compDate={compDate} compType={compType} onPress={() => setCompModalVisible(true)} />
      ) : blockIntent === 'offseason' ? (
        <OffseasonBanner busy={peakBusy} onTest={handleTriggerPeak} onEdit={() => setCompModalVisible(true)} />
      ) : (
        <TouchableOpacity accessibilityRole="button" style={styles.setCompRow} onPress={() => setCompModalVisible(true)}>
          <Text style={styles.setCompText}>{t('aiCoach.setCompDate')}</Text>
          <Text style={styles.setCompArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Recovery week / vacation — active banner or entry row */}
      {recoveryWeek ? (
        <RecoveryBanner status={recoveryWeek} onEnd={handleEndRecovery} />
      ) : (
        <TouchableOpacity accessibilityRole="button" style={styles.setCompRow} onPress={() => setRecoveryModalVisible(true)}>
          <Text style={styles.setCompText}>{t('aiCoach.recovery.entry')}</Text>
          <Text style={styles.setCompArrow}>›</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.startBtn}
          onPress={() => navigation.navigate('StartSession', { plan: plan ?? undefined })}
        >
          <Text style={styles.startBtnText}>{t('aiCoach.startWorkout')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.chatBtn}
          onPress={() => navigation.navigate('AICoachChat', {})}
        >
          <Text style={styles.chatBtnText}>{t('aiCoach.askMrEO')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
