import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette, alpha } from '../../theme';
import {
  formCheckService,
  AIFormCheckAnalysis,
  FormCheckRequest,
} from '../../services/form-check.service';
import { communityService } from '../../services/community.service';
import { FitnessQuiz } from '../../components/ui/FitnessQuiz';
import { PostVideo } from '../../components/PostVideo';
import { ExerciseAutocomplete } from '../../components/ExerciseAutocomplete';
import { useExerciseName } from '../../hooks/useExerciseName';
import { EXERCISE_NAMES, getLiftFamily } from '../../i18n/exerciseNames';
import {
  Camera,
  Video,
  VideoCamera,
  X,
  CheckCircle,
  WarningCircle,
  XCircle,
  Robot,
  Users,
  UsersThree,
  ChatCircle,
  Plus,
} from 'phosphor-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FormCheck'>;
};

type Tab = 'ai' | 'coach' | 'community';

const RATING_CONFIG = {
  Good:       { color: palette.success[500], Icon: CheckCircle },
  'Needs Work': { color: palette.warning[500], Icon: WarningCircle },
  Critical:   { color: palette.error[500], Icon: XCircle },
};

const ScoreRing = ({ score }: { score: number }) => {
  const color = score >= 8 ? palette.success[500] : score >= 6 ? palette.warning[500] : palette.error[500];
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={styles.scoreDenom}>/10</Text>
    </View>
  );
};

const AIResultCard = ({ analysis }: { analysis: AIFormCheckAnalysis }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultExercise}>{analysis.exercise}</Text>
          <Text style={styles.resultOverall}>{analysis.overallFeedback}</Text>
        </View>
        <ScoreRing score={analysis.overallScore} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>{t('formCheck.breakdown')}</Text>
      {analysis.breakdown.map((item) => {
        const cfg = RATING_CONFIG[item.rating] ?? RATING_CONFIG['Needs Work'];
        return (
          <View key={item.category} style={styles.breakdownRow}>
            <cfg.Icon size={18} weight="fill" color={cfg.color} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownCategory}>{item.category}</Text>
              <Text style={styles.breakdownFeedback}>{item.feedback}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>{t('formCheck.keyCorrections')}</Text>
      {analysis.keyCorrections.map((cue, i) => (
        <View key={i} style={styles.cueRow}>
          <View style={styles.cueDot} />
          <Text style={styles.cueText}>{cue}</Text>
        </View>
      ))}

      {analysis.drills.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>{t('formCheck.recommendedDrills')}</Text>
          {analysis.drills.map((d, i) => (
            <View key={i} style={styles.cueRow}>
              <View style={[styles.cueDot, { backgroundColor: palette.brand[400] }]} />
              <Text style={styles.cueText}>{d}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const CoachRequestCard = ({ req }: { req: FormCheckRequest }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.coachCard}>
      <View style={styles.coachCardHeader}>
        <Text style={styles.coachCardExercise}>{req.exerciseName}</Text>
        <View style={[styles.statusBadge, req.status === 'reviewed' ? styles.statusReviewed : styles.statusPending]}>
          <Text style={styles.statusText}>{req.status === 'reviewed' ? t('formCheck.reviewed') : t('formCheck.pending')}</Text>
        </View>
      </View>
      {req.userNotes && <Text style={styles.coachCardNotes}>"{req.userNotes}"</Text>}
      <Text style={styles.coachCardDate}>{new Date(req.createdAt).toLocaleDateString()}</Text>
      {req.coachResponse && (
        <View style={styles.coachResponseBox}>
          <Text style={styles.coachResponseLabel}>{t('formCheck.coachFeedback')}</Text>
          <Text style={styles.coachResponseText}>{req.coachResponse}</Text>
        </View>
      )}
    </View>
  );
};

// Shown on the AI tab when one of the three competition lifts is selected —
// a quick nudge on the camera angle that lets the AI grade most accurately.
const CameraAngleTip = ({ family }: { family: 'squat' | 'bench' | 'deadlift' }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <VideoCamera size={18} weight="fill" color={palette.brand[400]} />
        <Text style={styles.tipTitle}>{t('formCheck.cameraTipTitle')}</Text>
      </View>
      <Text style={styles.tipBody}>{t(`formCheck.cameraTip_${family}`)}</Text>
    </View>
  );
};

export const FormCheckScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { exName, canonical } = useExerciseName();
  const [activeTab, setActiveTab] = useState<Tab>('ai');

  // Localized exercise catalog for the autocomplete suggestions.
  const exerciseOptions = React.useMemo(
    () => Array.from(new Set(EXERCISE_NAMES.map(exName))).sort((a, b) => a.localeCompare(b)),
    [exName],
  );

  // AI tab state
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [aiVideo, setAiVideo] = useState<string | null>(null);
  const [aiExercise, setAiExercise] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  // Once the AI analysis is back, the quiz stays up showing a "Continue" CTA so the
  // athlete can finish their question before the result is revealed.
  const [analysisReady, setAnalysisReady] = useState(false);
  const [aiResult, setAiResult] = useState<AIFormCheckAnalysis | null>(null);

  // Coach tab state
  const [coachMedia, setCoachMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [coachExercise, setCoachExercise] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<FormCheckRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);

  // Community tab state
  const [commImages, setCommImages] = useState<string[]>([]);
  const [commVideo, setCommVideo] = useState<string | null>(null);
  const [commExercise, setCommExercise] = useState('');
  const [commNotes, setCommNotes] = useState('');
  const [posting, setPosting] = useState(false);

  const loadMyRequests = async () => {
    if (requestsLoaded) return;
    setLoadingRequests(true);
    try {
      const data = await formCheckService.getMyRequests();
      setMyRequests(data);
      setRequestsLoaded(true);
    } catch {
      // silently ignore
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'coach') loadMyRequests();
  };

  const pickAIImages = async () => {
    if (aiImages.length >= 3) {
      Alert.alert(t('formCheck.max3Photos'), t('formCheck.max3PhotosMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - aiImages.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAiResult(null);
      setAiVideo(null); // photos and video are alternative inputs
      setAiImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 3));
    }
  };

  const removeAIImage = (idx: number) => {
    setAiImages((prev) => prev.filter((_, i) => i !== idx));
    setAiResult(null);
  };

  const pickAIVideo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 15, // keep clips short — one or two reps
    });
    if (!r.canceled) {
      setAiResult(null);
      setAiImages([]); // photos and video are alternative inputs
      setAiVideo(r.assets[0].uri);
    }
  };

  const removeAIVideo = () => {
    setAiVideo(null);
    setAiResult(null);
  };

  const analyzeForm = async () => {
    if (!aiImages.length && !aiVideo) {
      Alert.alert(t('formCheck.nothingToAnalyze'), t('formCheck.nothingToAnalyzeMsg'));
      return;
    }
    if (!aiExercise.trim()) {
      Alert.alert(t('formCheck.exerciseRequired'), t('formCheck.exerciseRequiredMsg'));
      return;
    }
    setAnalysisReady(false);
    setAnalyzing(true);
    try {
      const exercise = aiExercise.trim();
      const notes = aiNotes.trim() || undefined;
      const { aiAnalysis } = aiVideo
        ? await formCheckService.analyzeVideo(aiVideo, exercise, notes)
        : await formCheckService.analyzeAI(aiImages, exercise, notes);
      setAiResult(aiAnalysis);
      // Result is in — keep the quiz up and flip it to the "Continue" CTA.
      setAnalysisReady(true);
    } catch (e: any) {
      Alert.alert(t('formCheck.analysisFailed'), e?.response?.data?.message || t('errors.unknownError'));
      setAnalyzing(false);
      setAnalysisReady(false);
    }
  };

  const pickCoachMedia = async () => {
    Alert.alert(t('formCheck.selectMedia'), t('formCheck.selectMediaMsg'), [
      {
        text: t('formCheck.video'),
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.7 });
          if (!r.canceled) setCoachMedia({ uri: r.assets[0].uri, type: 'video' });
        },
      },
      {
        text: t('formCheck.photos'),
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!r.canceled) setCoachMedia({ uri: r.assets[0].uri, type: 'image' });
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const submitToCoach = async () => {
    if (!coachMedia) {
      Alert.alert(t('formCheck.noMedia'), t('formCheck.noMediaMsg'));
      return;
    }
    if (!coachExercise.trim()) {
      Alert.alert(t('formCheck.exerciseRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await formCheckService.submitCoach(
        [coachMedia.uri],
        coachMedia.type,
        coachExercise.trim(),
        coachNotes.trim() || undefined,
      );
      setCoachMedia(null);
      setCoachExercise('');
      setCoachNotes('');
      setRequestsLoaded(false);
      await loadMyRequests();
      Alert.alert(t('formCheck.submitSuccess'), t('formCheck.submitSuccessMsg'));
    } catch (e: any) {
      Alert.alert(t('formCheck.submitFailed'), e?.response?.data?.message || t('errors.unknownError'));
    } finally {
      setSubmitting(false);
    }
  };

  const pickCommunityImages = async () => {
    if (commImages.length >= 3) {
      Alert.alert(t('formCheck.max3Photos'), t('formCheck.max3PhotosMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - commImages.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setCommVideo(null); // photos and video are alternative inputs
      setCommImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 3));
    }
  };

  const pickCommunityVideo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 30,
    });
    if (!r.canceled) {
      setCommImages([]); // photos and video are alternative inputs
      setCommVideo(r.assets[0].uri);
    }
  };

  const postToCommunity = async () => {
    if (!commImages.length && !commVideo) {
      Alert.alert(t('formCheck.noMedia'), t('formCheck.noMediaMsg'));
      return;
    }
    if (!commExercise.trim()) {
      Alert.alert(t('formCheck.exerciseRequired'), t('formCheck.exerciseRequiredMsg'));
      return;
    }
    setPosting(true);
    try {
      const post = commVideo
        ? await communityService.createFormCheckPost([commVideo], 'video', commExercise.trim(), commNotes.trim() || undefined)
        : await communityService.createFormCheckPost(commImages, 'image', commExercise.trim(), commNotes.trim() || undefined);
      setCommImages([]);
      setCommVideo(null);
      setCommExercise('');
      setCommNotes('');
      navigation.navigate('PostDetail', { postId: post.id });
    } catch (e: any) {
      Alert.alert(t('formCheck.postFailed'), e?.response?.data?.message || t('errors.unknownError'));
    } finally {
      setPosting(false);
    }
  };

  // While the AI reviews the lift (often 10s+), entertain the athlete with the quiz
  // instead of a button spinner. Continue (revealed once ready) returns to the
  // result that's now rendered inline on the AI tab.
  if (analyzing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FitnessQuiz
          loading={!analysisReady}
          title={t('formCheck.title')}
          subtitle={aiVideo ? t('formCheck.analyzingVideo') : t('formCheck.analyzingPhoto')}
          onFinish={() => {
            setAnalyzing(false);
            setAnalysisReady(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.headerTitle}>{t('formCheck.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => handleTabChange('ai')}
        >
          <Robot size={16} weight={activeTab === 'ai' ? 'fill' : 'bold'} color={activeTab === 'ai' ? palette.brand[400] : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'ai' && styles.tabLabelActive]}>{t('formCheck.aiCheck')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coach' && styles.tabActive]}
          onPress={() => handleTabChange('coach')}
        >
          <Users size={16} weight={activeTab === 'coach' ? 'fill' : 'bold'} color={activeTab === 'coach' ? palette.brand[400] : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'coach' && styles.tabLabelActive]}>{t('formCheck.ironlabCheck')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.tabActive]}
          onPress={() => handleTabChange('community')}
        >
          <UsersThree size={16} weight={activeTab === 'community' ? 'fill' : 'bold'} color={activeTab === 'community' ? palette.brand[400] : theme.colors.textTertiary} />
          <Text style={[styles.tabLabel, activeTab === 'community' && styles.tabLabelActive]}>{t('formCheck.communityCheck')}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {/* ── AI TAB ── */}
        {activeTab === 'ai' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>{t('formCheck.aiHint')}</Text>

            {aiVideo ? (
              /* Video preview */
              <View style={styles.mediaPreview}>
                <View style={styles.videoPlaceholder}>
                  <Video size={36} weight="fill" color={palette.brand[400]} />
                  <Text style={styles.videoLabel}>{t('formCheck.videoSelected')}</Text>
                </View>
                <TouchableOpacity style={styles.mediaRemove} onPress={removeAIVideo}>
                  <X size={14} weight="bold" color={palette.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Photo picker */}
                <View style={styles.photoGrid}>
                  {aiImages.map((uri, i) => (
                    <View key={i} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoImg} />
                      <TouchableOpacity style={styles.photoRemove} onPress={() => removeAIImage(i)}>
                        <X size={12} weight="bold" color={palette.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {aiImages.length < 3 && (
                    <TouchableOpacity style={styles.photoAdd} onPress={pickAIImages}>
                      <Plus size={24} weight="bold" color={palette.gray[500]} />
                      <Text style={styles.photoAddLabel}>{t('formCheck.addPhoto')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Video alternative */}
                {aiImages.length === 0 && (
                  <TouchableOpacity style={styles.videoPickBtn} onPress={pickAIVideo}>
                    <Video size={18} weight="bold" color={palette.brand[400]} />
                    <Text style={styles.videoPickLabel}>{t('formCheck.orUploadVideo')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Exercise input */}
            <Text style={styles.inputLabel}>{t('formCheck.exercise')}</Text>
            <ExerciseAutocomplete
              value={aiExercise}
              onChangeText={setAiExercise}
              options={exerciseOptions}
              placeholder={t('formCheck.exerciseSearchPlaceholder')}
            />

            {/* Camera-angle tip for the big three lifts */}
            {(() => {
              const family = getLiftFamily(canonical(aiExercise.trim()));
              return family ? <CameraAngleTip family={family} /> : null;
            })()}

            {/* Notes */}
            <Text style={styles.inputLabel}>{t('formCheck.notesOptional')}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={aiNotes}
              onChangeText={setAiNotes}
              placeholder={t('formCheck.notesPlaceholder')}
              placeholderTextColor={palette.gray[600]}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (analyzing || (!aiImages.length && !aiVideo) || !aiExercise.trim()) && styles.primaryBtnDisabled]}
              onPress={analyzeForm}
              disabled={analyzing || (!aiImages.length && !aiVideo) || !aiExercise.trim()}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color={palette.black} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('formCheck.analyzeBtn')}</Text>
              )}
            </TouchableOpacity>

            {analyzing && (
              <Text style={styles.analyzingHint}>
                {aiVideo ? t('formCheck.analyzingVideo') : t('formCheck.analyzingPhoto')}
              </Text>
            )}

            {aiResult && <AIResultCard analysis={aiResult} />}

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ── COACH TAB ── */}
        {activeTab === 'coach' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>{t('formCheck.coachHint')}</Text>

            {/* Media picker */}
            {coachMedia ? (
              <View style={styles.mediaPreview}>
                {coachMedia.type === 'image' ? (
                  <Image source={{ uri: coachMedia.uri }} style={styles.mediaImg} resizeMode="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Video size={36} weight="fill" color={palette.brand[400]} />
                    <Text style={styles.videoLabel}>{t('formCheck.videoSelected')}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.mediaRemove} onPress={() => setCoachMedia(null)}>
                  <X size={14} weight="bold" color={palette.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.mediaPickerBtn} onPress={pickCoachMedia}>
                <Camera size={28} weight="bold" color={palette.gray[500]} />
                <Text style={styles.mediaPickerLabel}>{t('formCheck.addMedia')}</Text>
                <Text style={styles.mediaPickerSub}>{t('formCheck.tapToSelect')}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>{t('formCheck.exercise')}</Text>
            <ExerciseAutocomplete
              value={coachExercise}
              onChangeText={setCoachExercise}
              options={exerciseOptions}
              placeholder={t('formCheck.exerciseSearchPlaceholder')}
            />

            <Text style={styles.inputLabel}>{t('formCheck.notesCoach')}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={coachNotes}
              onChangeText={setCoachNotes}
              placeholder={t('formCheck.coachNotesPlaceholder')}
              placeholderTextColor={palette.gray[600]}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (submitting || !coachMedia || !coachExercise.trim()) && styles.primaryBtnDisabled]}
              onPress={submitToCoach}
              disabled={submitting || !coachMedia || !coachExercise.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={palette.black} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('formCheck.submitBtn')}</Text>
              )}
            </TouchableOpacity>

            {/* Past submissions */}
            {(myRequests.length > 0 || loadingRequests) && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>{t('formCheck.yourSubmissions')}</Text>
                {loadingRequests ? (
                  <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 16 }} />
                ) : (
                  myRequests.map((r) => <CoachRequestCard key={r.id} req={r} />)
                )}
              </>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ── COMMUNITY TAB ── */}
        {activeTab === 'community' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>{t('formCheck.communityHint')}</Text>

            {commVideo ? (
              /* Video preview */
              <View style={styles.mediaPreview}>
                <PostVideo uri={commVideo} style={{ height: '100%', borderRadius: 16 }} />
                <TouchableOpacity style={styles.mediaRemove} onPress={() => setCommVideo(null)}>
                  <X size={14} weight="bold" color={palette.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Photo picker */}
                <View style={styles.photoGrid}>
                  {commImages.map((uri, i) => (
                    <View key={i} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoImg} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setCommImages((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X size={12} weight="bold" color={palette.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {commImages.length < 3 && (
                    <TouchableOpacity style={styles.photoAdd} onPress={pickCommunityImages}>
                      <Plus size={24} weight="bold" color={palette.gray[500]} />
                      <Text style={styles.photoAddLabel}>{t('formCheck.addPhoto')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Video alternative */}
                {commImages.length === 0 && (
                  <TouchableOpacity style={styles.videoPickBtn} onPress={pickCommunityVideo}>
                    <Video size={18} weight="bold" color={palette.brand[400]} />
                    <Text style={styles.videoPickLabel}>{t('formCheck.orUploadVideo')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={styles.inputLabel}>{t('formCheck.exercise')}</Text>
            <ExerciseAutocomplete
              value={commExercise}
              onChangeText={setCommExercise}
              options={exerciseOptions}
              placeholder={t('formCheck.exerciseSearchPlaceholder')}
            />

            <Text style={styles.inputLabel}>{t('formCheck.notesOptional')}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={commNotes}
              onChangeText={setCommNotes}
              placeholder={t('formCheck.communityNotesPlaceholder')}
              placeholderTextColor={palette.gray[600]}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (posting || (!commImages.length && !commVideo) || !commExercise.trim()) && styles.primaryBtnDisabled]}
              onPress={postToCommunity}
              disabled={posting || (!commImages.length && !commVideo) || !commExercise.trim()}
            >
              {posting ? (
                <ActivityIndicator size="small" color={palette.black} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('formCheck.postToCommunity')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.communityNote}>
              <ChatCircle size={16} weight="fill" color={theme.colors.textTertiary} />
              <Text style={styles.communityNoteText}>{t('formCheck.communityNote')}</Text>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 7,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: palette.brand[400] },
  tabLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textTertiary },
  tabLabelActive: { color: palette.brand[400] },

  scrollContent: { padding: 20 },

  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },

  photoGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  photoThumb: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 1.5, borderColor: theme.colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoAddLabel: { fontSize: 11, color: palette.gray[500], fontWeight: '500' },

  videoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  videoPickLabel: { fontSize: 13, fontWeight: '600', color: palette.brand[400] },

  inputLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 12 },

  primaryBtn: {
    backgroundColor: palette.brand[500],
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: palette.black },

  analyzingHint: { textAlign: 'center', color: theme.colors.textTertiary, fontSize: 12, marginBottom: 16 },

  tipCard: {
    backgroundColor: palette.brand[950],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.brand[900],
    padding: 14,
    marginBottom: 16,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: palette.brand[300] },
  tipBody: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },

  communityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  communityNoteText: { flex: 1, fontSize: 12, color: theme.colors.textTertiary, lineHeight: 17 },

  // Result card
  resultCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 0,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  resultExercise: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  resultOverall: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  scoreRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNumber: { fontSize: 20, fontWeight: '800' },
  scoreDenom: { fontSize: 10, color: theme.colors.textTertiary, marginTop: -2 },

  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  breakdownRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  breakdownCategory: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  breakdownFeedback: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },

  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.error[500], marginTop: 6 },
  cueText: { flex: 1, fontSize: 13, color: theme.colors.text, lineHeight: 18 },

  // Coach tab
  mediaPickerBtn: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderStyle: 'dashed',
    borderRadius: 16, paddingVertical: 32, alignItems: 'center', gap: 6, marginBottom: 20,
  },
  mediaPickerLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  mediaPickerSub: { fontSize: 12, color: theme.colors.textTertiary },

  mediaPreview: {
    height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20, position: 'relative',
    backgroundColor: theme.colors.backgroundTertiary,
  },
  mediaImg: { width: '100%', height: '100%' },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  videoLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  mediaRemove: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },

  coachCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  coachCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  coachCardExercise: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusPending: { backgroundColor: alpha(palette.warning[800], 0.2) },
  statusReviewed: { backgroundColor: alpha(palette.success[900], 0.2) },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  coachCardNotes: { fontSize: 12, color: theme.colors.textTertiary, fontStyle: 'italic', marginBottom: 4 },
  coachCardDate: { fontSize: 11, color: theme.colors.textTertiary },
  coachResponseBox: {
    marginTop: 10, backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: palette.brand[500],
  },
  coachResponseLabel: { fontSize: 11, fontWeight: '700', color: palette.brand[400], marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  coachResponseText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
});
