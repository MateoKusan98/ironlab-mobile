import React, { useState, useCallback, useRef } from 'react';
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
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { communityService, FeedPost } from '../../services/community.service';
import { useAuthStore } from '../../stores/auth.store';
import { PostVideo } from '../../components/PostVideo';
import {
  Heart,
  ChatCircle,
  Plus,
  Barbell,
  Trophy,
  PencilSimple,
  DotsThree,
  MagnifyingGlass,
} from 'phosphor-react-native';

import { Card } from '../../components/ui';
type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
};

const AvatarThumb = ({ name, avatar, size = 40 }: { name: string; avatar: string | null; size?: number }) => {
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (avatar) {
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.brand[600], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: palette.white, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
};

const PostTypeIcon = ({ type }: { type: FeedPost['type'] }) => {
  if (type === 'WORKOUT_SHARE') return <Barbell size={14} color={palette.brand[400]} weight="fill" />;
  if (type === 'PR_SHARE') return <Trophy size={14} color={palette.warning[400]} weight="fill" />;
  if (type === 'FORM_CHECK') return <MagnifyingGlass size={14} color={palette.brand[400]} weight="bold" />;
  return null;
};

const FormCheckMeta = ({ metadata }: { metadata: Record<string, any> }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.formCheckMeta}>
      <MagnifyingGlass size={16} color={palette.brand[400]} weight="bold" />
      <Text style={styles.formCheckMetaText} numberOfLines={1}>
        {t('community.formCheckLabel')} · {metadata.exerciseName}
      </Text>
    </View>
  );
};

const WorkoutMeta = ({ metadata }: { metadata: Record<string, any> }) => {
  const { t } = useTranslation();
  return (
  <View style={styles.workoutMeta}>
    {!!metadata.exercises && (
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('community.exercises')}</Text>
        <Text style={styles.metaValue}>{metadata.exercises}</Text>
      </View>
    )}
    {!!metadata.volume && (
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('community.volume')}</Text>
        <Text style={styles.metaValue}>{metadata.volume} kg</Text>
      </View>
    )}
    {!!metadata.duration && (
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('community.duration')}</Text>
        <Text style={styles.metaValue}>{metadata.duration} min</Text>
      </View>
    )}
    {metadata.prs && metadata.prs > 0 && (
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('community.prs')}</Text>
        <Text style={[styles.metaValue, { color: palette.warning[400] }]}>🏆 {metadata.prs}</Text>
      </View>
    )}
  </View>
  );
};

const PRMeta = ({ metadata }: { metadata: Record<string, any> }) => (
  <View style={styles.prMeta}>
    <Trophy size={20} color={palette.warning[400]} weight="fill" />
    <View style={{ marginLeft: 10, flex: 1 }}>
      <Text style={styles.prExercise}>{metadata.exerciseName}</Text>
      <Text style={styles.prWeight}>
        {metadata.weight} kg
        {metadata.previous ? ` · was ${metadata.previous} kg` : ' · First PR!'}
      </Text>
    </View>
  </View>
);

const PostCard = ({
  post,
  currentUserId,
  onLike,
  onCommentPress,
  onDelete,
  onUserPress,
}: {
  post: FeedPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onCommentPress: (post: FeedPost) => void;
  onDelete: (postId: string) => void;
  onUserPress: (userId: string, userName: string) => void;
}) => {
  const { t } = useTranslation();
  const likeAnim = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  };

  const handleOptions = () => {
    if (post.userId !== currentUserId) return;
    Alert.alert(t('community.postOptions'), undefined, [
      { text: t('community.deletePost'), style: 'destructive', onPress: () => onDelete(post.id) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <Card radius={14} padding={14} style={styles.cardSpacing}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => onUserPress(post.user.id, post.user.name)}>
          <AvatarThumb name={post.user.name} avatar={post.user.avatar} size={38} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerMeta} onPress={() => onUserPress(post.user.id, post.user.name)}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{post.user.name}</Text>
            <PostTypeIcon type={post.type} />
          </View>
          <Text style={styles.timeAgo}>{formatRelativeTime(post.createdAt)}</Text>
        </TouchableOpacity>
        {post.userId === currentUserId && (
          <TouchableOpacity onPress={handleOptions} style={styles.optionsBtn}>
            <DotsThree size={20} color={theme.colors.textTertiary} weight="bold" />
          </TouchableOpacity>
        )}
      </View>

      {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}

      {post.type === 'WORKOUT_SHARE' && post.metadata && (
        <WorkoutMeta metadata={post.metadata} />
      )}

      {post.type === 'PR_SHARE' && post.metadata && (
        <PRMeta metadata={post.metadata} />
      )}

      {post.type === 'FORM_CHECK' && post.metadata && (
        <FormCheckMeta metadata={post.metadata} />
      )}

      {post.type === 'FORM_CHECK' && post.metadata?.mediaType === 'video' && post.imageUrl ? (
        <PostVideo uri={post.imageUrl} style={styles.postVideo} />
      ) : post.imageUrl ? (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
            <Heart
              size={22}
              weight={post.isLiked ? 'fill' : 'regular'}
              color={post.isLiked ? palette.error[400] : theme.colors.textSecondary}
            />
          </Animated.View>
          {post.likesCount > 0 && (
            <Text style={[styles.actionCount, post.isLiked && { color: palette.error[400] }]}>
              {post.likesCount}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCommentPress(post)}>
          <ChatCircle size={22} color={theme.colors.textSecondary} weight="regular" />
          {post.commentsCount > 0 && (
            <Text style={styles.actionCount}>{post.commentsCount}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export const CommunityFeedScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (reset = false) => {
    try {
      const p = reset ? 1 : page;
      const result = await communityService.getFeed(p, 20);
      if (reset) {
        setPosts(result.posts);
        setPage(2);
      } else {
        setPosts(prev => [...prev, ...result.posts]);
        setPage(p + 1);
      }
      setHasMore(result.posts.length === 20);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadFeed(true);
  }, []));

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadFeed(true);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadFeed(false);
  };

  const handleLike = async (postId: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p,
      ),
    );
    try {
      await communityService.toggleLike(postId);
    } catch {
      // revert optimistic update on error
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
            : p,
        ),
      );
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await communityService.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch {
      Alert.alert(t('common.error'), t('community.couldNotDeletePost'));
    }
  };

  const handleCommentPress = (post: FeedPost) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('community.title')}</Text>
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
        <Text style={styles.headerTitle}>{t('community.title')}</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Plus size={22} color={theme.colors.primary} weight="bold" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id ?? ''}
            onLike={handleLike}
            onCommentPress={handleCommentPress}
            onDelete={handleDelete}
            onUserPress={(uid, name) => navigation.navigate('UserProfile', { userId: uid, userName: name })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.colors.primary} style={{ padding: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('community.noPostsYet')}</Text>
            <Text style={styles.emptySubtitle}>{t('community.noPostsSubtitle')}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <PencilSimple size={18} color={palette.white} weight="bold" />
              <Text style={styles.emptyBtnText}>{t('community.createPost')}</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
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
  headerTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  createBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardSpacing: { marginHorizontal: 12, marginTop: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerMeta: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  timeAgo: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  optionsBtn: { padding: 4 },
  postContent: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  workoutMeta: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaRow: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: theme.colors.textTertiary, marginBottom: 2 },
  metaValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  prMeta: {
    backgroundColor: `${palette.warning[900]}40`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${palette.warning[700]}60`,
  },
  prExercise: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  prWeight: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 10,
  },
  postVideo: {
    width: '100%',
    height: 260,
    borderRadius: 10,
    marginBottom: 10,
  },
  formCheckMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${palette.brand[900]}66`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${palette.brand[700] ?? palette.brand[600]}55`,
  },
  formCheckMetaText: { flex: 1, fontSize: 13, fontWeight: '600', color: palette.brand[300] ?? palette.brand[400] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: palette.white, fontWeight: '600', fontSize: 15 },
});
