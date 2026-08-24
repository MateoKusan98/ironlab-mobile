import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette, alpha } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../stores/auth.store';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Bell, PersonSimpleRun, Lightning, Robot, CalendarBlank, ChartBar, ArrowRight, Camera, Flask, Trophy } from 'phosphor-react-native';
import { UserRole } from '@shared';
import { RecoveryWeekCard } from '../../components/ui/RecoveryWeekControl';
import { MuscleVolumeCard } from '../../components/ui/MuscleVolumeCard';

// const CATEGORIES = [
//   { id: '1', label: 'HIIT', Icon: Fire, color: theme.categoryTint.green, iconColor: palette.brand[500] },
//   { id: '2', label: 'Strength', Icon: Barbell, color: palette.slate[800], iconColor: palette.info[300] },
//   { id: '3', label: 'Cardio', Icon: PersonSimpleRun, color: theme.categoryTint.orange, iconColor: palette.brand[400] },
//   { id: '4', label: 'Mobility', Icon: PersonSimpleBike, color: theme.categoryTint.rose, iconColor: palette.pink[300] },
// ];

export const WorkoutScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        left={<UserAvatar user={user} size={36} />}
        title={t('nav.workouts')}
        right={<TouchableOpacity style={styles.bellBtn}><Bell size={20} weight="bold" color={palette.zinc[400]} /></TouchableOpacity>}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* AI Banner — opens the coach hub (plan screen), which owns the competition
            date, coach memory and recovery controls, and has its own Start button.
            Jumping straight to StartSession from here hid all of that: no other
            entry point in the Workouts tab reaches AICoachPlan. */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => user?.isAICoachSetupComplete ? navigation.navigate('AICoachPlan') : navigation.navigate('AICoachWelcome')}
        >
          <View style={styles.aiBannerLeft}>
            <Text style={styles.aiBannerLabel}>M-7EO · Personal AI Trainer</Text>
            <Text style={styles.aiBannerTitle}>
              {user?.isAICoachSetupComplete ? t('workouts.sessionReady') : t('workouts.getAI')}
            </Text>
            <View style={styles.aiBannerCta}>
              <Text style={styles.aiBannerCtaText}>{user?.isAICoachSetupComplete ? 'Open coach' : 'Get started'}</Text>
              <ArrowRight size={14} weight="bold" color="rgba(0,0,0,0.7)" />
            </View>
          </View>
          <Robot size={52} weight="fill" color="rgba(0,0,0,0.18)" style={styles.aiBannerIcon} />
        </TouchableOpacity>

        {/* Section: Start Training */}
        <Text style={styles.sectionTitle}>Start Training</Text>

        {/* Start Session Banner */}
        <TouchableOpacity style={styles.startSessionBanner} onPress={() => navigation.navigate('StartSession', { freeSession: true })}>
          <View style={[styles.bannerIconWrap, { backgroundColor: palette.brand[600] + '33' }]}>
            <Lightning size={22} weight="fill" color={palette.brand[400]} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{t('workouts.logSession')}</Text>
            <Text style={styles.bannerSub}>{t('workouts.trackSets')}</Text>
          </View>
          <ArrowRight size={18} weight="bold" color={palette.gray[500]} />
        </TouchableOpacity>

        {/* Cardio Log Banner */}
        <TouchableOpacity style={styles.cardioBanner} onPress={() => navigation.navigate('CardioLog')}>
          <View style={[styles.bannerIconWrap, { backgroundColor: alpha(palette.brand[400], 0.133) }]}>
            <PersonSimpleRun size={22} weight="bold" color={palette.brand[400]} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Log Cardio</Text>
            <Text style={styles.bannerSub}>Running, cycling, HIIT and more</Text>
          </View>
          <ArrowRight size={18} weight="bold" color={palette.gray[500]} />
        </TouchableOpacity>

        {/* Form Check Banner */}
        <TouchableOpacity style={styles.formCheckBanner} onPress={() => navigation.navigate('FormCheck')}>
          <View style={[styles.bannerIconWrap, { backgroundColor: alpha(palette.violet[600], 0.133) }]}>
            <Camera size={22} weight="fill" color={palette.violet[400]} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Assess Form</Text>
            <Text style={styles.bannerSub}>AI analysis or IronLab coach review</Text>
          </View>
          <ArrowRight size={18} weight="bold" color={palette.gray[500]} />
        </TouchableOpacity>

        {/* Recovery week / vacation — banner while active, entry card otherwise */}
        {user?.isAICoachSetupComplete && <RecoveryWeekCard />}

        {/* Section: Track Progress */}
        <Text style={styles.sectionTitle}>Track Progress</Text>

        {/* What the coach has actually been programming, per muscle. Renders itself away
            when there is no measured history, so a new athlete never sees an audit of
            work they have not done yet. */}
        {user?.isAICoachSetupComplete && <MuscleVolumeCard />}

        {/* History & Stats row */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('WorkoutHistory')}>
            <View style={styles.quickIconWrap}>
              <CalendarBlank size={22} weight="bold" color={palette.brand[400]} />
            </View>
            <Text style={styles.quickLabel}>{t('nav.history')}</Text>
            <Text style={styles.quickSub}>Past sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Stats')}>
            <View style={styles.quickIconWrap}>
              <ChartBar size={22} weight="bold" color={palette.brand[400]} />
            </View>
            <Text style={styles.quickLabel}>{t('nav.stats')}</Text>
            <Text style={styles.quickSub}>Volume trends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('PRs')}>
            <View style={styles.quickIconWrap}>
              <Trophy size={22} weight="bold" color={palette.brand[400]} />
            </View>
            <Text style={styles.quickLabel}>{t('nav.prs', { defaultValue: 'Records' })}</Text>
            <Text style={styles.quickSub}>All-time bests</Text>
          </TouchableOpacity>
        </View>

        {(user?.role === UserRole.ROLE_ADMIN || user?.role === UserRole.ROLE_SUPER_ADMIN) && (
          <>
            <Text style={styles.sectionTitle}>Admin</Text>
            <TouchableOpacity
              style={styles.aiLabBanner}
              onPress={() => navigation.navigate('AdminAILab', {})}
            >
              <View style={[styles.bannerIconWrap, { backgroundColor: alpha(palette.violet[600], 0.133) }]}>
                <Flask size={22} weight="fill" color={palette.violet[400]} />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>AI Coach Lab</Text>
                <Text style={styles.bannerSub}>Test & time-travel coach state for any user</Text>
              </View>
              <ArrowRight size={18} weight="bold" color={palette.gray[500]} />
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BUILD YOUR PROGRAM FAB — hidden for now, re-enable when feature is ready */}
      {/* <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ProgramCreatorStart')}>
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>{t('workouts.buildProgram')}</Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.gray[500],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 28,
  },

  // AI Banner
  aiBanner: {
    flexDirection: 'row',
    backgroundColor: palette.brand[500],
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    overflow: 'hidden',
  },
  aiBannerLeft: { flex: 1 },
  aiBannerLabel: { color: 'rgba(0,0,0,0.55)', fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  aiBannerTitle: { color: palette.black, fontSize: 18, fontWeight: '800', marginBottom: 14, lineHeight: 22 },
  aiBannerCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiBannerCtaText: { color: 'rgba(0,0,0,0.7)', fontSize: 13, fontWeight: '700' },
  aiBannerIcon: { position: 'absolute', right: -8, bottom: -10 },

  // Action banners
  startSessionBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    gap: 14,
  },
  cardioBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    gap: 14,
  },
  formCheckBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    gap: 14,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: palette.white, marginBottom: 2 },
  bannerSub: { fontSize: 12, color: palette.gray[400] },

  // Quick cards
  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    gap: 6,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.brand[600] + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickLabel: { fontSize: 14, fontWeight: '700', color: palette.white },
  quickSub: { fontSize: 12, color: palette.gray[500] },

  aiLabBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.surface.violetBorder,
    gap: 14,
  },
});
