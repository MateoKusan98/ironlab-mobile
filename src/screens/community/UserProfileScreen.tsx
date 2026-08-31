import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { communityService, FeedPost } from '../../services/community.service';
import { messagingService } from '../../services/messaging.service';
import { useAuthStore } from '../../stores/auth.store';
import { ChatCircleDots, Heart, ChatCircle, Barbell, Trophy } from 'phosphor-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;
  route: RouteProp<RootStackParamList, 'UserProfile'>;
};

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const UserProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId, userName } = route.params;
  const { user: me } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingConv, setStartingConv] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Load feed and filter by user — simple approach since we have global feed
        const result = await communityService.getFeed(1, 100);
        setPosts(result.posts.filter(p => p.userId === userId));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleMessage = async () => {
    if (startingConv) return;
    setStartingConv(true);
    try {
      const conv = await messagingService.startConversation(userId);
      navigation.navigate('Conversation', {
        conversationId: conv.id,
        otherUserId: userId,
        otherUserName: userName,
      });
    } catch {
      // silent
    } finally {
      setStartingConv(false);
    }
  };

  const profileUser = posts[0]?.user;
  const initials = userName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.headerTitle}>{userName}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {profileUser?.avatar ? (
            <Image source={{ uri: profileUser.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.postCount}>{posts.length} posts</Text>

          {me?.id !== userId && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.messageBtn}
              onPress={handleMessage}
              disabled={startingConv}
            >
              {startingConv ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <>
                  <ChatCircleDots size={18} color={palette.white} weight="fill" />
                  <Text style={styles.messageBtnText}>Message</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ padding: 32 }} />
        ) : posts.length === 0 ? (
          <Text style={styles.noPosts}>No posts yet</Text>
        ) : (
          <View style={styles.postsGrid}>
            <Text style={styles.sectionTitle}>Posts</Text>
            {posts.map(post => (
              <TouchableOpacity
                accessibilityRole="button"
                key={post.id}
                style={styles.miniCard}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
              >
                <View style={styles.miniCardHeader}>
                  {post.type === 'WORKOUT_SHARE' && (
                    <Barbell size={14} color={palette.brand[400]} weight="fill" />
                  )}
                  {post.type === 'PR_SHARE' && (
                    <Trophy size={14} color={palette.warning[400]} weight="fill" />
                  )}
                  <Text style={styles.miniCardTime}>{formatRelativeTime(post.createdAt)}</Text>
                </View>
                {post.content ? (
                  <Text style={styles.miniCardContent} numberOfLines={3}>
                    {post.content}
                  </Text>
                ) : null}
                {post.type === 'PR_SHARE' && post.metadata && (
                  <Text style={styles.metaText}>
                    🏆 {post.metadata.exerciseName} · {post.metadata.weight}kg
                  </Text>
                )}
                {post.type === 'WORKOUT_SHARE' && post.metadata && (
                  <Text style={styles.metaText}>
                    {[
                      post.metadata.exercises,
                      post.metadata.volume && `${post.metadata.volume}kg`,
                      post.metadata.duration && `${post.metadata.duration}min`,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                )}
                <View style={styles.miniCardFooter}>
                  <View style={styles.miniStat}>
                    <Heart size={13} color={theme.colors.textTertiary} />
                    <Text style={styles.miniStatText}>{post.likesCount}</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <ChatCircle size={13} color={theme.colors.textTertiary} />
                    <Text style={styles.miniStatText}>{post.commentsCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.text },
  profileSection: { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarFallback: { backgroundColor: palette.brand[600], alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: palette.white, fontWeight: '700', fontSize: 28 },
  profileName: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  postCount: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.brand[600],
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
  },
  messageBtnText: { color: palette.white, fontWeight: '600', fontSize: 15 },
  postsGrid: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  miniCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  miniCardTime: { fontSize: 11, color: theme.colors.textTertiary },
  miniCardContent: { fontSize: 14, color: theme.colors.text, lineHeight: 20, marginBottom: 6 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
  miniCardFooter: { flexDirection: 'row', gap: 14 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: 12, color: theme.colors.textTertiary },
  noPosts: { textAlign: 'center', color: theme.colors.textTertiary, fontSize: 14, padding: 32 },
});
