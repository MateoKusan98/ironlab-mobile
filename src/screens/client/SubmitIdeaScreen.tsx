import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ideasService, IdeaSubmission } from '../../services/ideas.service';
import { theme, palette } from '../../theme';
import { Lightbulb, CheckCircle } from 'phosphor-react-native';

import { apiErrorMessage } from '../../utils/apiError';
const MAX_CHARS = 1000;

export const SubmitIdeaScreen: React.FC = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<IdeaSubmission | null>(null);
  const [myIdeas, setMyIdeas] = useState<IdeaSubmission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  React.useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const ideas = await ideasService.getMine();
      setMyIdeas(ideas);
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      Alert.alert('Too short', 'Please write at least 10 characters for your idea.');
      return;
    }
    setLoading(true);
    try {
      const idea = await ideasService.submit(trimmed);
      setSubmitted(idea);
      setContent('');
      loadHistory();
    } catch (e: unknown) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not submit idea.'));
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'THANKED') return palette.success[400];
    if (status === 'REJECTED') return palette.error[400];
    return palette.gray[500];
  };

  const statusLabel = (status: string) => {
    if (status === 'THANKED') return '👍 Acknowledged';
    if (status === 'REJECTED') return '✗ Declined';
    return '⏳ Pending review';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.title}>Submit an Idea</Text>
          </View>

          <View style={styles.heroRow}>
            <Lightbulb size={32} weight="fill" color={palette.brand[400]} />
            <Text style={styles.heroText}>
              Got an idea to make IronLab better? Share it — if we love it, you'll earn an achievement.
            </Text>
          </View>

          {submitted && (
            <View style={styles.successBanner}>
              <CheckCircle size={20} weight="fill" color={palette.success[400]} />
              <Text style={styles.successText}>Idea submitted! We'll review it soon.</Text>
            </View>
          )}

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Your idea</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={6}
              maxLength={MAX_CHARS}
              placeholder="Describe your idea... (min 10 characters)"
              placeholderTextColor={palette.gray[600]}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length}/{MAX_CHARS}</Text>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading || content.trim().length < 10}
            >
              {loading ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Idea</Text>
              )}
            </TouchableOpacity>
          </View>

          {(myIdeas.length > 0 || loadingHistory) && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Your previous ideas</Text>
              {loadingHistory ? (
                <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 12 }} />
              ) : (
                myIdeas.map((idea) => (
                  <View key={idea.id} style={styles.ideaCard}>
                    <Text style={styles.ideaContent} numberOfLines={3}>{idea.content}</Text>
                    <View style={styles.ideaMeta}>
                      <Text style={[styles.ideaStatus, { color: statusColor(idea.status) }]}>
                        {statusLabel(idea.status)}
                      </Text>
                      <Text style={styles.ideaDate}>
                        {new Date(idea.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 4, marginRight: 10 },
  backArrow: { fontSize: 22, color: theme.colors.text },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },

  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20, backgroundColor: palette.brand[900] + '55', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: palette.brand[700] + '55' },
  heroText: { flex: 1, fontSize: 14, color: palette.gray[300], lineHeight: 20 },

  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.success[500] + '22', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: palette.success[500] + '55' },
  successText: { fontSize: 14, color: palette.success[300], fontWeight: '600' },

  inputCard: { backgroundColor: palette.gray[900], borderRadius: 14, padding: 14, borderWidth: 1, borderColor: palette.gray[800], marginBottom: 24 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: palette.gray[400], letterSpacing: 0.5, marginBottom: 8 },
  input: {
    minHeight: 140,
    backgroundColor: palette.gray[800],
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: palette.gray[700],
  },
  charCount: { fontSize: 11, color: palette.gray[600], textAlign: 'right', marginTop: 6, marginBottom: 14 },
  submitBtn: {
    backgroundColor: palette.brand[600],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },

  historySection: { marginTop: 4 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: palette.gray[400], letterSpacing: 0.5, marginBottom: 10 },

  ideaCard: { backgroundColor: palette.gray[900], borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: palette.gray[800] },
  ideaContent: { fontSize: 13, color: palette.gray[300], lineHeight: 20, marginBottom: 8 },
  ideaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ideaStatus: { fontSize: 11, fontWeight: '700' },
  ideaDate: { fontSize: 11, color: palette.gray[600] },
});
