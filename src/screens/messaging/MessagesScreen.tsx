import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { messagingService, ConversationSummary } from '../../services/messaging.service';
import { ChatCircleDots } from 'phosphor-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const AvatarThumb = ({ name, avatar, size = 48 }: { name: string; avatar: string | null; size?: number }) => {
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (avatar) {
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.brand[600], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
};

export const MessagesScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadConversations();
  }, [loadConversations]));

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const openConversation = (conv: ConversationSummary) => {
    navigation.navigate('Conversation', {
      conversationId: conv.id,
      otherUserId: conv.otherUser.id,
      otherUserName: conv.otherUser.name,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('messaging.title')}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openConversation(item)}>
            <View style={styles.avatarWrap}>
              <AvatarThumb name={item.otherUser.name} avatar={item.otherUser.avatar} size={50} />
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.rowContent}>
              <View style={styles.rowTop}>
                <Text style={[styles.userName, item.unreadCount > 0 && styles.userNameBold]}>
                  {item.otherUser.name}
                </Text>
                <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
              </View>
              <Text
                style={[styles.preview, item.unreadCount > 0 && styles.previewBold]}
                numberOfLines={1}
              >
                {item.lastMessagePreview ?? t('messaging.noMessagesPreview')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ChatCircleDots size={56} color={theme.colors.textTertiary} weight="thin" />
            <Text style={styles.emptyTitle}>{t('messaging.noMessagesYet')}</Text>
            <Text style={styles.emptySubtitle}>{t('messaging.noMessagesSub')}</Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  userNameBold: { fontWeight: '700' },
  time: { fontSize: 12, color: theme.colors.textTertiary },
  preview: { fontSize: 13, color: theme.colors.textSecondary },
  previewBold: { color: theme.colors.text, fontWeight: '500' },
  separator: { height: 1, backgroundColor: theme.colors.border, marginLeft: 80 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});
