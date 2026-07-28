import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { theme, palette, alpha } from '../../theme';
import { formCheckService, FormCheckRequest } from '../../services/form-check.service';
import { ArrowLeft, Video, ImageSquare, CheckCircle, Clock } from 'phosphor-react-native';

import { Card } from '../../components/ui';
type QueueItem = FormCheckRequest & { user: { id: string; name: string } };

type Nav = NativeStackNavigationProp<CoachStackParamList, 'FormCheckQueue'>;

const QueueCard = ({
  item,
  onPress,
}: {
  item: QueueItem;
  onPress: () => void;
}) => (
  <Card variant="row" radius={14} padding={14} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.cardLeft}>
      <View style={[styles.typeIcon, item.mediaUrls?.[0]?.match(/\.mp4|video/) ? styles.typeVideo : styles.typeImage]}>
        {item.mediaUrls?.[0]?.match(/\.mp4|video/) ? (
          <Video size={18} weight="fill" color={palette.brand[400]} />
        ) : (
          <ImageSquare size={18} weight="fill" color={palette.brand[400]} />
        )}
      </View>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardName}>{item.user?.name ?? 'Athlete'}</Text>
      <Text style={styles.cardExercise}>{item.exerciseName}</Text>
      {item.userNotes && <Text style={styles.cardNotes} numberOfLines={1}>"{item.userNotes}"</Text>}
      <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
    </View>
    <View style={styles.cardRight}>
      {item.status === 'reviewed' ? (
        <CheckCircle size={20} weight="fill" color={palette.success[500]} />
      ) : (
        <Clock size={20} weight="fill" color={palette.warning[500]} />
      )}
    </View>
  </Card>
);

const DetailView = ({ item, onBack }: { item: QueueItem; onBack: () => void }) => {
  const { t } = useTranslation();
  const [response, setResponse] = useState(item.coachResponse ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!response.trim()) {
      Alert.alert(t('coach.emptyResponseTitle'), t('coach.emptyResponseMsg'));
      return;
    }
    setSaving(true);
    try {
      await formCheckService.respond(item.id, response.trim());
      Alert.alert(t('coach.sentTitle'), t('coach.feedbackSentMsg'), [{ text: t('common.ok'), onPress: onBack }]);
    } catch {
      Alert.alert(t('common.error'), t('coach.couldNotSubmit'));
    } finally {
      setSaving(false);
    }
  };

  const mediaIsVideo = item.mediaUrls?.[0]?.match(/\.mp4|video/);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailMeta}>
          <Text style={styles.detailAthlete}>{item.user?.name ?? 'Athlete'}</Text>
          <Text style={styles.detailExercise}>{item.exerciseName}</Text>
          {item.userNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>{t('coach.athleteNotes')}</Text>
              <Text style={styles.notesText}>{item.userNotes}</Text>
            </View>
          )}
        </View>

        {/* Media */}
        {item.mediaUrls.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaLabel}>{t('coach.submittedMedia')}</Text>
            {mediaIsVideo ? (
              <View style={styles.videoBox}>
                <Video size={32} weight="fill" color={palette.brand[400]} />
                <Text style={styles.videoBoxText}>{t('coach.videoSubmitted')}</Text>
                <Text style={styles.videoBoxSub}>URL: {item.mediaUrls[0]}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                {item.mediaUrls.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.mediaThumb} resizeMode="cover" />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Response */}
        <Text style={styles.responseLabel}>{t('coach.yourFeedback')}</Text>
        <TextInput
          style={styles.responseInput}
          value={response}
          onChangeText={setResponse}
          placeholder={t('coach.feedbackPlaceholder')}
          placeholderTextColor={palette.gray[600]}
          multiline
          numberOfLines={6}
          editable={item.status !== 'reviewed'}
        />

        {item.status !== 'reviewed' && (
          <TouchableOpacity
            style={[styles.submitBtn, (saving || !response.trim()) && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={saving || !response.trim()}
          >
            {saving ? <ActivityIndicator size="small" color={palette.black} /> : <Text style={styles.submitBtnText}>{t('coach.sendFeedback')}</Text>}
          </TouchableOpacity>
        )}

        {item.status === 'reviewed' && (
          <View style={styles.reviewedBadge}>
            <CheckCircle size={16} weight="fill" color={palette.success[500]} />
            <Text style={styles.reviewedText}>{t('coach.feedbackAlreadySent')}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const FormCheckQueueScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await formCheckService.getQueue();
      setQueue(data as QueueItem[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={selected ? () => { setSelected(null); load(); } : () => navigation.goBack()}
        >
          <ArrowLeft size={22} weight="bold" color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selected ? selected.exerciseName : t('coach.formCheckQueue')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {selected ? (
        <DetailView item={selected} onBack={() => { setSelected(null); load(); }} />
      ) : loading ? (
        <ActivityIndicator size="large" color={palette.brand[400]} style={{ flex: 1 }} />
      ) : queue.length === 0 ? (
        <View style={styles.empty}>
          <CheckCircle size={48} weight="fill" color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('coach.allClear')}</Text>
          <Text style={styles.emptySub}>{t('coach.noFormChecks')}</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <QueueCard item={item} onPress={() => setSelected(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  list: { padding: 16, gap: 10 },


  cardLeft: {},
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeVideo: { backgroundColor: palette.brand[950] },
  typeImage: { backgroundColor: palette.brand[900] },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  cardExercise: { fontSize: 13, color: theme.colors.textSecondary },
  cardNotes: { fontSize: 12, color: theme.colors.textTertiary, fontStyle: 'italic' },
  cardDate: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  cardRight: {},

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary },

  // Detail view
  detailScroll: { padding: 20 },
  detailMeta: { marginBottom: 16 },
  detailAthlete: { fontSize: 13, color: theme.colors.textTertiary, fontWeight: '600', marginBottom: 2 },
  detailExercise: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 10 },
  notesBox: { backgroundColor: theme.colors.backgroundTertiary, borderRadius: 10, padding: 12 },
  notesLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  notesText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },

  mediaSection: { marginBottom: 20 },
  mediaLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  imageRow: { flexDirection: 'row' },
  mediaThumb: { width: 140, height: 140, borderRadius: 12, marginRight: 10 },
  videoBox: {
    backgroundColor: theme.colors.backgroundTertiary, borderRadius: 12, padding: 20,
    alignItems: 'center', gap: 6,
  },
  videoBoxText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  videoBoxSub: { fontSize: 11, color: theme.colors.textTertiary, textAlign: 'center' },

  responseLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  responseInput: {
    backgroundColor: theme.colors.backgroundTertiary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, paddingTop: 12,
    color: theme.colors.text, fontSize: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    height: 140, textAlignVertical: 'top', marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: palette.brand[500], borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: palette.black },
  reviewedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: alpha(palette.success[900], 0.133), borderRadius: 10, padding: 12,
  },
  reviewedText: { fontSize: 13, fontWeight: '600', color: palette.success[500] },
});
