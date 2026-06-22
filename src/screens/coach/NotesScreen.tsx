import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { useClientNotes, useCreateNote } from '../../hooks/useNotes';
import { theme } from '../../theme';

type Route = RouteProp<CoachStackParamList, 'Notes'>;

export const NotesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { params } = useRoute<Route>();
  const navigation = useNavigation();
  const { data: notes, isLoading } = useClientNotes(params.clientId);
  const createNote = useCreateNote();
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert(t('common.error'), t('coach.noteEmptyError'));
      return;
    }
    createNote.mutate(
      { clientId: params.clientId, content: content.trim() },
      {
        onSuccess: () => {
          setContent('');
          Alert.alert(t('common.success'), t('coach.noteAdded'));
        },
        onError: () => Alert.alert(t('common.error'), t('coach.noteFailed')),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('coach.noteFor', { name: params.clientName })}</Text>
      </View>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder={t('coach.notePlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.sendBtn, createNote.isPending && styles.disabled]}
          onPress={handleSubmit}
          disabled={createNote.isPending}
        >
          {createNote.isPending ? (
            <ActivityIndicator color={theme.colors.text} size="small" />
          ) : (
            <Text style={styles.sendText}>{t('coach.send')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScreen style={styles.scrollView}>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : notes && notes.length > 0 ? (
          notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteContent}>{note.content}</Text>
              <Text style={styles.noteDate}>
                {new Date(note.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>{t('coach.noNotesYet')}</Text>
        )}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
  back: { fontSize: theme.fontSize.md, color: theme.colors.primary, paddingVertical: theme.spacing.sm },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputArea: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  sendText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.text },
  scrollView: { flex: 1, paddingHorizontal: theme.spacing.md },
  noteCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteContent: { fontSize: theme.fontSize.md, color: theme.colors.text, lineHeight: 22 },
  noteDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
  empty: {
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
