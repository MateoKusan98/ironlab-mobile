import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../theme';
import { aiCoachService, ChatMessage, CoachPreferences } from '../../services/ai-coach.service';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachChat'>;
  route: RouteProp<RootStackParamList, 'AICoachChat'>;
};

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    Animated.parallel([anim(dot1, 0), anim(dot2, 150), anim(dot3, 300)]).start();
  }, []);

  return (
    <View style={chat.typingBubble}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[chat.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
};

const chat = StyleSheet.create({
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    gap: 5,
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gray[400],
  },
});

const MessageBubble = ({ message, isUser }: { message: ChatMessage; isUser: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowCoach,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.coachAvatar}>
          <Text style={styles.coachAvatarIcon}>✚</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextCoach]}>
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
};

export const AICoachChatScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const preferences = route.params?.preferences as CoachPreferences | undefined;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm M-7EO, your personal AI fitness coach 💪 I'm here to help you train smarter, track progress, and crush your goals.\n\nWhat do you need today? I can generate a workout, analyze your history, or answer any fitness questions.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const history = updatedMessages.slice(0, -1);
      const reply = await aiCoachService.chat(text, history, preferences);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('aiCoachChat.connectionError') },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const quickPrompts = [
    t('aiCoachChat.quickPrompt1'),
    t('aiCoachChat.quickPrompt2'),
    t('aiCoachChat.quickPrompt3'),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBack} />
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarIcon}>✚</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>M-7EO AI</Text>
            <Text style={styles.headerSub}>{t('aiCoachChat.personalFitnessCoach')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerSettings}>
          <Text style={styles.headerSettingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <MessageBubble message={item} isUser={item.role === 'user'} />
          )}
          ListFooterComponent={isLoading ? (
            <View style={styles.messageRow}>
              <View style={styles.coachAvatar}>
                <Text style={styles.coachAvatarIcon}>✚</Text>
              </View>
              <TypingIndicator />
            </View>
          ) : null}
          onContentSizeChange={scrollToBottom}
        />

        {messages.length === 1 && (
          <View style={styles.quickPrompts}>
            {quickPrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.quickPromptBtn}
                onPress={() => {
                  setInput(prompt);
                }}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.micBtn}>
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('aiCoachChat.chatPlaceholder')}
            placeholderTextColor={palette.gray[500]}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.attachBtn}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.black} />
            ) : (
              <Text style={styles.sendIcon}>›</Text>
            )}
          </TouchableOpacity>
        </View>
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
    borderBottomColor: palette.gray[800],
  },
  headerBack: { width: 36 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.brand[900],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.brand[500],
  },
  headerAvatarIcon: { fontSize: 18, color: palette.brand[500] },
  headerTitle: { color: palette.white, fontSize: 15, fontWeight: '700' },
  headerSub: { color: palette.gray[500], fontSize: 11 },
  headerSettings: { width: 36, alignItems: 'flex-end' },
  headerSettingsIcon: { fontSize: 18 },

  messageList: { padding: 16, gap: 12, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowCoach: { justifyContent: 'flex-start' },

  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(234,88,12,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.brand[500],
  },
  coachAvatarIcon: { fontSize: 14, color: palette.brand[500] },

  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: palette.brand[500],
    borderBottomRightRadius: 4,
  },
  bubbleCoach: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: palette.black, fontWeight: '600' },
  bubbleTextCoach: { color: palette.white },

  quickPrompts: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickPromptBtn: {
    backgroundColor: palette.gray[900],
    borderWidth: 1,
    borderColor: palette.gray[700],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quickPromptText: { color: palette.gray[300], fontSize: 13 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    borderTopWidth: 1,
    borderTopColor: palette.gray[800],
    gap: 8,
    backgroundColor: theme.colors.background,
  },
  micBtn: { padding: 4 },
  micIcon: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: palette.gray[900],
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: palette.white,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: palette.gray[800],
  },
  attachBtn: { padding: 4 },
  attachIcon: { fontSize: 18 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: palette.black, fontSize: 28, fontWeight: '900', marginTop: -2 },
});
