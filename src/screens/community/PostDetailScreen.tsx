import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme, palette } from '../../theme';
import { communityService, FeedPost, PostComment } from '../../services/community.service';
import { useAuthStore } from '../../stores/auth.store';
import { PostVideo } from '../../components/PostVideo';
import { Heart, PaperPlaneTilt, DotsThree, Trophy, Barbell, MagnifyingGlass } from 'phosphor-react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PostDetail'>;
  route: RouteProp<RootStackParamList, 'PostDetail'>;
};

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const AvatarThumb = ({ name, avatar, size = 36 }: { name: string; avatar: string | null; size?: number }) => {
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

export const PostDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { postId } = route.params;
  const { user } = useAuthStore();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const likeAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        communityService.getPost(postId),
        communityService.getComments(postId),
      ]);
      setPost(p);
      setComments(c);
    } catch {
      Alert.alert(t('common.error'), t('community.couldNotLoadPost'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLike = async () => {
    if (!post) return;
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.5, duration: 120, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setPost(p => p ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p);
    try {
      await communityService.toggleLike(post.id);
    } catch {
      setPost(p => p ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      const comment = await communityService.addComment(postId, commentText.trim());
      setComments(prev => [...prev, comment]);
      setPost(p => p ? { ...p, commentsCount: p.commentsCount + 1 } : p);
      setCommentText('');
    } catch {
      Alert.alert(t('common.error'), t('community.couldNotSendComment'));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(t('community.deleteComment'), t('community.removeComment'), [
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await communityService.deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            setPost(p => p ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p);
          } catch { /* silent */ }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.backBtn} />
          <Text style={styles.headerTitle}>{t('community.post')}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) return null;

  const CommentItem = ({ item }: { item: PostComment }) => (
    <View style={styles.commentRow}>
      <AvatarThumb name={item.user.name} avatar={item.user.avatar} size={32} />
      <View style={styles.commentBubble}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.user.name}</Text>
          <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
      {item.userId === user?.id && (
        <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteCommentBtn}>
          <DotsThree size={18} color={theme.colors.textTertiary} weight="bold" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.headerTitle}>{t('community.post')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentItem item={item} />}
          ListHeaderComponent={
            <View style={styles.postSection}>
              <View style={styles.postHeader}>
                <AvatarThumb name={post.user.name} avatar={post.user.avatar} size={42} />
                <View style={styles.postHeaderMeta}>
                  <Text style={styles.postAuthor}>{post.user.name}</Text>
                  <Text style={styles.postTime}>{formatRelativeTime(post.createdAt)}</Text>
                </View>
              </View>
              {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
              {post.type === 'WORKOUT_SHARE' && post.metadata && (
                <View style={styles.workoutMeta}>
                  <Barbell size={16} color={palette.brand[400]} weight="fill" />
                  <Text style={styles.metaText}>
                    {[
                      post.metadata.exercises,
                      post.metadata.volume && `${post.metadata.volume}kg`,
                      post.metadata.duration && `${post.metadata.duration}min`,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )}
              {post.type === 'PR_SHARE' && post.metadata && (
                <View style={styles.prMeta}>
                  <Trophy size={16} color={palette.warning[400]} weight="fill" />
                  <Text style={styles.metaText}>
                    {post.metadata.exerciseName} · {post.metadata.weight}kg
                    {post.metadata.previous ? ` (was ${post.metadata.previous}kg)` : ''}
                  </Text>
                </View>
              )}
              {post.type === 'FORM_CHECK' && post.metadata && (
                <View style={styles.formCheckMeta}>
                  <MagnifyingGlass size={16} color={palette.brand[400]} weight="bold" />
                  <Text style={styles.metaText}>
                    {t('community.formCheckLabel')} · {post.metadata.exerciseName}
                  </Text>
                </View>
              )}
              {post.type === 'FORM_CHECK' && post.metadata?.mediaType === 'video' && post.imageUrl ? (
                <PostVideo uri={post.imageUrl} style={styles.postVideo} />
              ) : post.type === 'FORM_CHECK' && Array.isArray(post.metadata?.mediaUrls) ? (
                post.metadata!.mediaUrls.map((url: string, i: number) => (
                  <Image key={i} source={{ uri: url }} style={styles.postImage} resizeMode="cover" />
                ))
              ) : post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
              ) : null}
              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                  <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                    <Heart
                      size={22}
                      weight={post.isLiked ? 'fill' : 'regular'}
                      color={post.isLiked ? palette.error[400] : theme.colors.textSecondary}
                    />
                  </Animated.View>
                  <Text style={[styles.actionCount, post.isLiked && { color: palette.error[400] }]}>
                    {post.likesCount > 0 ? post.likesCount : ''} {post.isLiked ? 'Liked' : 'Like'}
                  </Text>
                </TouchableOpacity>
              </View>
              {comments.length > 0 && (
                <Text style={styles.commentsLabel}>{t('community.comments')}</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.noComments}>{t('community.noComments')}</Text>
          }
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.commentInput}
            placeholder={t('community.addComment')}
            placeholderTextColor={theme.colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <PaperPlaneTilt size={18} color={palette.white} weight="fill" />
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
    borderBottomColor: theme.colors.border,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postHeaderMeta: { marginLeft: 12 },
  postAuthor: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  postTime: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  postContent: { fontSize: 16, color: theme.colors.text, lineHeight: 24, marginBottom: 12 },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  prMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${palette.warning[900]}40`,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  formCheckMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${palette.brand[900]}66`,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${palette.brand[700]}55`,
  },
  metaText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  postImage: { width: '100%', height: 220, borderRadius: 10, marginBottom: 12 },
  postVideo: { width: '100%', height: 260, borderRadius: 10, marginBottom: 12 },
  postActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  commentsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  commentTime: { fontSize: 11, color: theme.colors.textTertiary },
  commentText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  deleteCommentBtn: { padding: 4, alignSelf: 'center' },
  noComments: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
    fontSize: 14,
    padding: 24,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
