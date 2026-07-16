import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/auth.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useLogout } from '../../hooks/useAuth';
import { theme, palette } from '../../theme';
import { useQueryClient } from '@tanstack/react-query';
import { aiCoachService } from '../../services/ai-coach.service';
import { usersService } from '../../services/users.service';
import { nutritionService } from '../../services/nutrition.service';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';
import { Barbell, ThumbsUp, Robot, Bell, Lock, ForkKnife, Question, Package, Users, Camera, Trophy, Lightbulb, Pill, ChatCircleDots, Bug, Sparkle, Brain, ScanSmiley, TreeStructure } from 'phosphor-react-native';
import { useWhatsNew } from '../../contexts/WhatsNewContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBadges } from '../../hooks/useBadges';
import { rankForPoints } from '../../services/rank';
import { Medallion, TIERS } from '../../components/ui/Medallion';
import { UserRole } from '@shared';

const CREATINE_ENABLED_KEY = '@ironlab_creatine_enabled';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ROLE_SUPER_ADMIN]: 'Super Admin',
  [UserRole.ROLE_ADMIN]:       'Admin',
  [UserRole.ROLE_COACH]:       'Coach',
  [UserRole.ROLE_TRAINEE]:     'Trainee',
};

const isAdmin = (role?: string | null) =>
  role === UserRole.ROLE_ADMIN || role === UserRole.ROLE_SUPER_ADMIN;

const DAY_VALUES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// Optimal day spreads per session count (maximise rest between sessions)
const OPTIMAL_DAYS: Record<number, string[]> = {
  1: ['saturday'],
  2: ['tuesday', 'friday'],
  3: ['monday', 'wednesday', 'friday'],
  4: ['monday', 'tuesday', 'thursday', 'friday'],
  5: ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
  6: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  7: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
};

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m} min` : `${m}:${String(rem).padStart(2, '0')}`;
}

const REST_STEP = 15;
const REST_MIN = 30;
const REST_MAX = 600;

export const ProfileScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { open: openWhatsNew } = useWhatsNew();
  const DAYS = DAY_VALUES.map((v) => ({ value: v, short: t(`history.${v}`) }));
  const { compoundRestSecs, isolationRestSecs, language, setCompoundRestSecs, setIsolationRestSecs, setLanguage } = useSettingsStore();

  const { data: badgeData } = useBadges();
  const achievementPoints = badgeData?.achievementPoints ?? 0;
  const rank = rankForPoints(achievementPoints);
  const [showRankBadge, setShowRankBadge] = useState(user?.showRankBadge !== false);

  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [savingDays, setSavingDays] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [nutritionTracking, setNutritionTracking] = useState(true);
  const [creatineReminder, setCreatineReminder] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);

  useEffect(() => {
    aiCoachService.getPlan()
      .then((data) => {
        if (data.trainingDays) setTrainingDays(data.trainingDays);
      })
      .catch(() => {});

    aiCoachService.getProfile()
      .then((profile) => {
        if (profile && profile.nutritionTrackingEnabled !== undefined) {
          setNutritionTracking(profile.nutritionTrackingEnabled !== false);
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(CREATINE_ENABLED_KEY)
      .then((val) => setCreatineReminder(val === 'yes'))
      .catch(() => {});
  }, []);

  const toggleNutritionTracking = async (value: boolean) => {
    setNutritionTracking(value);
    try {
      await aiCoachService.setNutritionTracking(value);
    } catch {
      setNutritionTracking(!value);
      Alert.alert('Error', 'Could not update setting. Please try again.');
    }
  };

  const toggleShowRankBadge = async (value: boolean) => {
    setShowRankBadge(value);
    try {
      const updated = await usersService.updateProfile({ showRankBadge: value });
      await setUser(updated);
    } catch {
      setShowRankBadge(!value);
      Alert.alert('Error', 'Could not update setting. Please try again.');
    }
  };

  const toggleCreatineReminder = async (value: boolean) => {
    setCreatineReminder(value);
    await AsyncStorage.setItem(CREATINE_ENABLED_KEY, value ? 'yes' : 'no').catch(() => {});
  };

  const toggleDay = (day: string) => {
    setTrainingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const saveTrainingDays = async () => {
    setSavingDays(true);
    try {
      await aiCoachService.saveTrainingDays(trainingDays);
      // If nutrition is already set up, re-derive the calorie + macro target from
      // the new training frequency so the dashboard stays in sync with the schedule.
      let recalculated = false;
      if (user?.isNutritionSetupComplete) {
        try {
          await nutritionService.computeTargets({ trainingDaysPerWeek: trainingDays.length });
          queryClient.invalidateQueries({ queryKey: ['nutritionSummary'] });
          queryClient.invalidateQueries({ queryKey: ['nutritionCalendar'] });
          recalculated = true;
        } catch {
          // Non-fatal: schedule still saved even if the target recompute fails.
        }
      }
      Alert.alert(
        t('profile.scheduleSavedTitle'),
        recalculated ? t('profile.scheduleSavedRecalc') : t('profile.scheduleSaved'),
      );
    } catch {
      Alert.alert(t('common.error'), t('profile.scheduleSaveError'));
    } finally {
      setSavingDays(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const text = await usersService.exportData();
      const date = new Date().toISOString().split('T')[0];
      const name = (user?.name ?? 'user').replace(/\s+/g, '-').toLowerCase();
      const filename = `ironlab-export-${name}-${date}.txt`;
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, text, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Export your IronLab data' });
      } else {
        Alert.alert('Exported', `File saved to: ${path}`);
      }
    } catch {
      Alert.alert('Export failed', 'Could not export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleLanguageChange = async (code: string) => {
    setLanguage(code as any);
    try {
      await usersService.updateProfile({ preferredLanguage: code });
    } catch {}
  };

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    setUploadingAvatar(true);
    try {
      const updatedUser = await usersService.uploadAvatar(uri);
      await setUser(updatedUser);
    } catch {
      Alert.alert('Upload failed', 'Could not update your profile picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) return;
    setDeletingAccount(true);
    try {
      await usersService.requestAccountDeletion(deletePassword);
      setDeleteModalVisible(false);
      setDeletePassword('');
      const updatedUser = await usersService.getProfile();
      await setUser(updatedUser as any);
      Alert.alert(
        'Deletion Scheduled',
        'Your account is scheduled for deletion in 15 days. Logging back in before then will cancel this.',
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Incorrect password. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCancelDeletion = () => {
    Alert.alert('Cancel Deletion', 'Are you sure you want to keep your account?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, keep account',
        onPress: async () => {
          setCancellingDeletion(true);
          try {
            await usersService.cancelAccountDeletion();
            const updatedUser = await usersService.getProfile();
            await setUser(updatedUser as any);
          } catch {
            Alert.alert('Error', 'Could not cancel deletion. Please try again.');
          } finally {
            setCancellingDeletion(false);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logoutMutation.mutate() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScreen style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleAvatarPress} disabled={uploadingAvatar} style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.avatarEditIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Text>
          </View>
        </View>

        {/* Rank tier badge */}
        {showRankBadge && (
          <TouchableOpacity
            style={[styles.rankCard, { borderColor: TIERS[rank.tier].glow + '55' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Badges')}
          >
            <View style={[styles.rankGlow, { backgroundColor: TIERS[rank.tier].glow + '22' }]} />
            <Medallion tier={rank.tier} size={84} />
            <View style={styles.rankInfo}>
              <Text style={[styles.rankTierLabel, { color: TIERS[rank.tier].glow }]}>
                {TIERS[rank.tier].label}
              </Text>
              <Text style={styles.rankPoints}>{achievementPoints.toLocaleString()} pts</Text>
              {rank.next ? (
                <>
                  <View style={styles.rankTrack}>
                    <View
                      style={[
                        styles.rankFill,
                        { width: `${rank.progress * 100}%` as any, backgroundColor: TIERS[rank.tier].glow },
                      ]}
                    />
                  </View>
                  <Text style={styles.rankSub}>
                    {rank.pointsToNext!.toLocaleString()} pts to {TIERS[rank.next.tier].label}
                  </Text>
                </>
              ) : (
                <Text style={styles.rankSub}>Top rank reached 🔥</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Profile badge visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROFILE BADGE</Text>
          <Text style={styles.sectionSub}>
            Your rank tier is earned from achievement points — workouts, PRs, streaks and nutrition all count.
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Trophy size={22} weight="fill" color={palette.brand[400]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show rank on profile</Text>
                <Text style={styles.toggleSub}>Hide your tier badge if you'd rather keep it private</Text>
              </View>
            </View>
            <Switch
              value={showRankBadge}
              onValueChange={toggleShowRankBadge}
              trackColor={{ false: palette.gray[700], true: palette.brand[600] }}
              thumbColor={showRankBadge ? palette.brand[400] : palette.gray[400]}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>

        {/* Training Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('profile.trainingDays').toUpperCase()}</Text>
          <Text style={styles.sectionSub}>{t('profile.trainingDaysSub')}</Text>

          {/* Session count stepper */}
          <View style={styles.sessionCountRow}>
            <Text style={styles.sessionCountLabel}>{t('profile.sessionsPerWeek')}</Text>
            <View style={styles.sessionStepper}>
              <TouchableOpacity
                style={styles.sessionStepBtn}
                onPress={() => {
                  const next = Math.max(1, trainingDays.length - 1);
                  setTrainingDays(OPTIMAL_DAYS[next] ?? []);
                }}
              >
                <Text style={styles.sessionStepText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.sessionStepValue}>{trainingDays.length}</Text>
              <TouchableOpacity
                style={styles.sessionStepBtn}
                onPress={() => {
                  const next = Math.min(7, trainingDays.length + 1);
                  setTrainingDays(OPTIMAL_DAYS[next] ?? []);
                }}
              >
                <Text style={styles.sessionStepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sessionCountHint}>{t('profile.trainingDaysHint')}</Text>

          <View style={styles.dayGrid}>
            {DAYS.map((day) => {
              const active = trainingDays.includes(day.value);
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[styles.dayBtn, active && styles.dayBtnActive]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>{day.short}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingDays && styles.saveBtnDisabled]}
            onPress={saveTrainingDays}
            disabled={savingDays}
          >
            <Text style={styles.saveBtnText}>
              {savingDays ? t('common.saving') : t('profile.saveSchedule', { count: trainingDays.length })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rest Timer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('profile.restTimer').toUpperCase()}</Text>
          <Text style={styles.sectionSub}>{t('profile.restTimerSub')}</Text>

          {/* Compound */}
          <View style={styles.restRow}>
            <View style={styles.restRowLeft}>
              <Barbell size={22} weight="bold" color={palette.brand[400]} />
              <View>
                <Text style={styles.restRowTitle}>{t('profile.compound')}</Text>
                <Text style={styles.restRowSub}>{t('profile.compoundSub')}</Text>
              </View>
            </View>
            <View style={styles.restStepper}>
              <TouchableOpacity
                style={[styles.stepBtn, compoundRestSecs <= REST_MIN && styles.stepBtnDisabled]}
                onPress={() => setCompoundRestSecs(Math.max(REST_MIN, compoundRestSecs - REST_STEP))}
                disabled={compoundRestSecs <= REST_MIN}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{fmtSecs(compoundRestSecs)}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, compoundRestSecs >= REST_MAX && styles.stepBtnDisabled]}
                onPress={() => setCompoundRestSecs(Math.min(REST_MAX, compoundRestSecs + REST_STEP))}
                disabled={compoundRestSecs >= REST_MAX}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Isolation */}
          <View style={[styles.restRow, { marginBottom: 0 }]}>
            <View style={styles.restRowLeft}>
              <ThumbsUp size={22} weight="bold" color={palette.brand[400]} />
              <View>
                <Text style={styles.restRowTitle}>{t('profile.isolation')}</Text>
                <Text style={styles.restRowSub}>{t('profile.isolationSub')}</Text>
              </View>
            </View>
            <View style={styles.restStepper}>
              <TouchableOpacity
                style={[styles.stepBtn, isolationRestSecs <= REST_MIN && styles.stepBtnDisabled]}
                onPress={() => setIsolationRestSecs(Math.max(REST_MIN, isolationRestSecs - REST_STEP))}
                disabled={isolationRestSecs <= REST_MIN}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{fmtSecs(isolationRestSecs)}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, isolationRestSecs >= REST_MAX && styles.stepBtnDisabled]}
                onPress={() => setIsolationRestSecs(Math.min(REST_MAX, isolationRestSecs + REST_STEP))}
                disabled={isolationRestSecs >= REST_MAX}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('profile.language').toUpperCase()}</Text>
          <Text style={styles.sectionSub}>{t('profile.languageSub')}</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => {
              const active = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langBtn, active && styles.langBtnActive]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langLabel, active && styles.langLabelActive]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* AI Integrations */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('profile.aiCoachSettings').toUpperCase()}</Text>
          <Text style={styles.sectionSub}>{t('profile.aiCoachSettingsSub')}</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <ForkKnife size={22} weight="bold" color={palette.brand[400]} />
              <View>
                <Text style={styles.toggleTitle}>{t('profile.foodTracking')}</Text>
                <Text style={styles.toggleSub}>{t('profile.foodTrackingSub')}</Text>
              </View>
            </View>
            <Switch
              value={nutritionTracking}
              onValueChange={toggleNutritionTracking}
              trackColor={{ false: palette.gray[700], true: palette.brand[600] }}
              thumbColor={nutritionTracking ? palette.brand[400] : palette.gray[400]}
              style={{ marginTop: 2 }}
            />
          </View>
          <View style={[styles.toggleRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: palette.gray[700], paddingTop: 16 }]}>
            <View style={styles.toggleLeft}>
              <Pill size={22} weight="bold" color={palette.brand[400]} />
              <View>
                <Text style={styles.toggleTitle}>{t('creatine.reminderTitle')}</Text>
                <Text style={styles.toggleSub}>{t('creatine.reminderSub')}</Text>
              </View>
            </View>
            <Switch
              value={creatineReminder}
              onValueChange={toggleCreatineReminder}
              trackColor={{ false: palette.gray[700], true: palette.brand[600] }}
              thumbColor={creatineReminder ? palette.brand[400] : palette.gray[400]}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>

        {/* Settings menu */}
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PathTree')}
          >
            <TreeStructure size={20} weight="fill" color={palette.brand[400]} />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>{t('pathTree.menuTitle')}</Text>
              <Text style={styles.exportSub}>{t('pathTree.menuSub')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AICoachExtendedSetup', { editMode: true })}
          >
            <Robot size={20} weight="fill" color={palette.brand[400]} />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>{t('profile.aiCoachSettings')}</Text>
              <Text style={styles.exportSub}>Goal, maxes, exercises, constraints & more</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Progress')}
          >
            <ScanSmiley size={20} weight="fill" color={palette.error[400]} />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>Progress & Body Scan</Text>
              <Text style={styles.exportSub}>Scan body fat, track photos & composition</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('FormCheck')}
          >
            <Camera size={20} weight="fill" color="#a78bfa" />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>Assess Form</Text>
              <Text style={styles.exportSub}>AI instant analysis or IronLab coach review</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Badges')}
          >
            <Trophy size={20} weight="fill" color={palette.brand[400]} />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>Badges & Achievements</Text>
              <Text style={styles.exportSub}>Track your strength milestones and points</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Quiz')}
          >
            <Brain size={20} weight="fill" color="#22d3ee" />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>Fitness Quiz</Text>
              <Text style={styles.exportSub}>Test your knowledge — 100+ questions & answers</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Messages')}
          >
            <ChatCircleDots size={20} weight="fill" color="#34d399" />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>Messages</Text>
              <Text style={styles.exportSub}>Your direct conversations</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Bell size={20} weight="bold" color={palette.gray[400]} />
            <Text style={styles.menuText}>{t('profile.notifications')}</Text>
          </View>
          <View style={styles.menuItem}>
            <Lock size={20} weight="bold" color={palette.gray[400]} />
            <Text style={styles.menuText}>{t('profile.privacy')}</Text>
          </View>
          <View style={styles.menuItem}>
            <Question size={20} weight="bold" color={palette.gray[400]} />
            <Text style={styles.menuText}>{t('profile.helpSupport')}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={openWhatsNew}
          >
            <Sparkle size={20} weight="fill" color={palette.brand[400]} />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>What's New</Text>
              <Text style={styles.exportSub}>Latest features and improvements</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SubmitIdea')}
          >
            <Lightbulb size={20} weight="fill" color={palette.warning[400]} />
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>Submit an Idea</Text>
              <Text style={styles.exportSub}>Share a feature suggestion with the team</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={palette.brand[400]} style={{ marginRight: 14 }} />
            ) : (
              <Package size={20} weight="bold" color={palette.gray[400]} />
            )}
            <View style={styles.exportTextWrap}>
              <Text style={styles.menuText}>{exporting ? t('profile.exporting') : t('profile.exportData')}</Text>
              <Text style={styles.exportSub}>All workouts, PRs, AI profile, nutrition</Text>
            </View>
          </TouchableOpacity>
        </View>

        {isAdmin(user?.role) && (
          <>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => navigation.navigate('AdminUsers')}
            >
              <Users size={18} weight="bold" color={palette.brand[300]} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.adminButtonText}>User Management</Text>
                <Text style={styles.adminButtonSub}>
                  {user?.role === UserRole.ROLE_SUPER_ADMIN ? 'All users + token spend' : 'All users overview'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, { marginTop: 8 }]}
              onPress={() => navigation.navigate('AdminIdeas')}
            >
              <Lightbulb size={18} weight="fill" color={palette.warning[300]} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.adminButtonText, { color: palette.warning[300] }]}>Community Ideas</Text>
                <Text style={styles.adminButtonSub}>Review and acknowledge user submissions</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, { marginTop: 8 }]}
              onPress={() => navigation.navigate('AdminLogs')}
            >
              <Bug size={18} weight="fill" color={palette.error[300]} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.adminButtonText, { color: palette.error[300] }]}>Error Logs</Text>
                <Text style={styles.adminButtonSub}>Client errors & stalls by email</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {(user as any)?.deletionScheduledAt ? (
          <View style={styles.deletionBanner}>
            <Text style={styles.deletionBannerTitle}>Account Deletion Scheduled</Text>
            <Text style={styles.deletionBannerSub}>
              Your account will be permanently deleted on{' '}
              {new Date((user as any).deletionScheduledAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
              })}.
              {'\n'}Log in again or tap below to cancel.
            </Text>
            <TouchableOpacity
              style={styles.cancelDeletionBtn}
              onPress={handleCancelDeletion}
              disabled={cancellingDeletion}
            >
              {cancellingDeletion ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cancelDeletionBtnText}>Cancel Deletion</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </KeyboardAwareScreen>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              Your account will be permanently deleted after 15 days. Logging in before then will cancel the deletion.{'\n\n'}
              Enter your password to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor={palette.gray[500]}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!deletePassword.trim() || deletingAccount) && styles.modalConfirmDisabled]}
                onPress={handleDeleteAccount}
                disabled={!deletePassword.trim() || deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.md, paddingBottom: 40 },

  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    paddingVertical: theme.spacing.lg,
  },

  avatarContainer: { alignItems: 'center', marginBottom: theme.spacing.xl },
  avatarWrapper: { position: 'relative', marginBottom: theme.spacing.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  avatarEditIcon: { fontSize: 12 },
  name: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  email: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  roleBadge: {
    backgroundColor: theme.colors.primaryDark + '40',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.sm,
  },
  roleText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.primaryLight },

  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: palette.gray[900],
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rankGlow: {
    position: 'absolute',
    left: -50,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  rankInfo: { flex: 1 },
  rankTierLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  rankPoints: { fontSize: 22, fontWeight: '900', color: theme.colors.text, marginTop: 2, marginBottom: 8 },
  rankTrack: { height: 7, borderRadius: 4, backgroundColor: palette.gray[700], overflow: 'hidden', marginBottom: 6 },
  rankFill: { height: '100%', borderRadius: 4 },
  rankSub: { fontSize: 11, color: palette.gray[400] },

  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.brand[400],
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: palette.gray[400],
    marginBottom: 16,
    lineHeight: 18,
  },

  sessionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionCountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.gray[100],
  },
  sessionStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sessionStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionStepText: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.brand[400],
    lineHeight: 24,
  },
  sessionStepValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    minWidth: 28,
    textAlign: 'center',
  },
  sessionCountHint: {
    fontSize: 11,
    color: palette.gray[500],
    marginBottom: 14,
  },

  dayGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: palette.gray[700],
    borderWidth: 1,
    borderColor: palette.gray[600],
  },
  dayBtnActive: {
    backgroundColor: palette.brand[600],
    borderColor: palette.brand[500],
  },
  dayBtnText: { fontSize: 13, fontWeight: '700', color: palette.gray[400] },
  dayBtnTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  menu: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuText: { fontSize: theme.fontSize.md, color: theme.colors.text },
  menuItemLast: { borderBottomWidth: 0 },
  exportTextWrap: { flex: 1 },
  exportSub: { fontSize: 11, color: palette.gray[500], marginTop: 2 },

  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[700],
    marginBottom: 4,
  },
  restRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  restRowIcon: { fontSize: 22 },
  restRowTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  restRowSub: { fontSize: 11, color: palette.gray[400], marginTop: 1 },
  restStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: palette.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: theme.colors.text, lineHeight: 22 },
  stepValue: { fontSize: 14, fontWeight: '700', color: palette.brand[400], minWidth: 52, textAlign: 'center' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, marginRight: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: palette.gray[100] },
  toggleSub: { fontSize: 11, color: palette.gray[400], marginTop: 2, lineHeight: 16 },

  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: palette.gray[700],
    borderWidth: 1,
    borderColor: palette.gray[600],
  },
  langBtnActive: {
    backgroundColor: palette.brand[600],
    borderColor: palette.brand[500],
  },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 13, fontWeight: '600', color: palette.gray[300] },
  langLabelActive: { color: '#fff' },

  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.brand[700] + '22',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.brand[600] + '44',
  },
  adminButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: palette.brand[300] },
  adminButtonSub: { fontSize: theme.fontSize.xs, color: palette.brand[500], marginTop: 2 },

  logoutButton: {
    backgroundColor: theme.colors.error + '20',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  logoutText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.error },

  deleteAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
    marginBottom: 10,
  },
  deleteAccountText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.error + 'bb' },

  deletionBanner: {
    backgroundColor: theme.colors.error + '18',
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  deletionBannerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.error,
    marginBottom: 6,
  },
  deletionBannerSub: {
    fontSize: 12,
    color: palette.gray[300],
    lineHeight: 18,
    marginBottom: 14,
  },
  cancelDeletionBtn: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelDeletionBtnText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: '#fff' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.error,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13,
    color: palette.gray[300],
    lineHeight: 20,
    marginBottom: 18,
  },
  modalInput: {
    backgroundColor: palette.gray[800],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.gray[600],
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: palette.gray[700],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: palette.gray[200] },
  modalConfirm: {
    flex: 1,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.45 },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
