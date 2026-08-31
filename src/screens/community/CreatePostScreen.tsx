import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { communityService, PostType } from '../../services/community.service';
import { X, PaperPlaneTilt, TextT, Barbell, Trophy } from 'phosphor-react-native';

import { PostMetadata } from '@shared';
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreatePost'>;
};

const POST_TYPE_ICONS = [
  { type: 'TEXT' as PostType, icon: <TextT size={18} weight="bold" />, color: palette.brand[600] },
  { type: 'WORKOUT_SHARE' as PostType, icon: <Barbell size={18} weight="bold" />, color: palette.brand[500] },
  { type: 'PR_SHARE' as PostType, icon: <Trophy size={18} weight="bold" />, color: palette.warning[500] },
];

export const CreatePostScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const POST_TYPES = POST_TYPE_ICONS.map((item) => ({
    ...item,
    label: item.type === 'TEXT' ? t('community.typeText') : item.type === 'WORKOUT_SHARE' ? t('community.typeWorkout') : t('community.typePR'),
  }));
  const [type, setType] = useState<PostType>('TEXT');
  const [content, setContent] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [previousWeight, setPreviousWeight] = useState('');
  const [workoutExercises, setWorkoutExercises] = useState('');
  const [workoutVolume, setWorkoutVolume] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = () => {
    if (submitting) return false;
    if (type === 'TEXT') return content.trim().length >= 1;
    if (type === 'PR_SHARE') return exerciseName.trim().length >= 1 && weight.trim().length >= 1;
    if (type === 'WORKOUT_SHARE') return workoutExercises.trim().length >= 1 || content.trim().length >= 1;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    try {
      let metadata: PostMetadata | null = null;
      if (type === 'WORKOUT_SHARE') {
        metadata = {
          exercises: workoutExercises.trim() || null,
          volume: workoutVolume.trim() ? parseFloat(workoutVolume) : null,
          duration: workoutDuration.trim() ? parseInt(workoutDuration, 10) : null,
        };
      } else if (type === 'PR_SHARE') {
        metadata = {
          exerciseName: exerciseName.trim(),
          weight: parseFloat(weight),
          previous: previousWeight.trim() ? parseFloat(previousWeight) : null,
        };
      }
      await communityService.createPost({
        type,
        content: content.trim() || undefined,
        metadata: metadata ?? undefined,
      });
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('community.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.close', { defaultValue: 'Close' })}
          >
            <X size={22} color={theme.colors.text} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('community.newPost')}</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canSubmit() && styles.postBtnDisabled]}
            onPress={handleSubmit}
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            disabled={!canSubmit()}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.sendPost', { defaultValue: 'Publish post' })}
            accessibilityState={{ disabled: !canSubmit(), busy: submitting }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <PaperPlaneTilt size={18} color={palette.white} weight="fill" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.typeRow}>
            {POST_TYPES.map((t) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={t.type}
                style={[
                  styles.typeChip,
                  type === t.type && { backgroundColor: t.color + '22', borderColor: t.color },
                ]}
                onPress={() => setType(t.type)}
              >
                <View>
                  {t.icon}
                </View>
                <Text style={[styles.typeLabel, type === t.type && { color: t.color }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.contentInput}
            placeholder={
              type === 'TEXT'
                ? t('community.captionText')
                : type === 'WORKOUT_SHARE'
                ? t('community.captionWorkout')
                : t('community.captionPR')
            }
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={2000}
            value={content}
            onChangeText={setContent}
            autoFocus
          />

          {type === 'WORKOUT_SHARE' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('community.workoutDetails')}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder={t('community.exercisesPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={workoutExercises}
                  onChangeText={setWorkoutExercises}
                />
              </View>
              <View style={styles.row2}>
                <TextInput
                  style={[styles.fieldInput, styles.halfInput]}
                  placeholder={t('community.volumePlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  value={workoutVolume}
                  onChangeText={setWorkoutVolume}
                />
                <TextInput
                  style={[styles.fieldInput, styles.halfInput]}
                  placeholder={t('community.durationPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  value={workoutDuration}
                  onChangeText={setWorkoutDuration}
                />
              </View>
            </View>
          )}

          {type === 'PR_SHARE' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('community.prDetails')}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={t('community.exerciseNamePlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                value={exerciseName}
                onChangeText={setExerciseName}
              />
              <View style={styles.row2}>
                <TextInput
                  style={[styles.fieldInput, styles.halfInput]}
                  placeholder={t('community.newWeightPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
                <TextInput
                  style={[styles.fieldInput, styles.halfInput]}
                  placeholder={t('community.previousPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  value={previousWeight}
                  onChangeText={setPreviousWeight}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.text },
  postBtn: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  body: { flex: 1, padding: 16 },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  contentInput: {
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingVertical: 8,
    lineHeight: 24,
    marginBottom: 16,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { marginBottom: 10 },
  fieldInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: theme.colors.text,
    fontSize: 15,
    marginBottom: 10,
  },
  row2: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
});
