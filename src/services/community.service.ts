import { api } from './api';
import { ApiResponse } from '@shared';

export type PostType = 'TEXT' | 'WORKOUT_SHARE' | 'PR_SHARE' | 'FORM_CHECK';

export interface FeedPost {
  id: string;
  userId: string;
  type: PostType;
  content: string | null;
  imageUrl: string | null;
  metadata: Record<string, any> | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface FeedResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePostPayload {
  type: PostType;
  content?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export const communityService = {
  getFeed: async (page = 1, limit = 20): Promise<FeedResponse> => {
    const { data } = await api.get<ApiResponse<FeedResponse>>('/community/feed', {
      params: { page, limit },
    });
    return data.data;
  },

  createPost: async (payload: CreatePostPayload): Promise<FeedPost> => {
    const { data } = await api.post<ApiResponse<FeedPost>>('/community/posts', payload);
    return data.data;
  },

  // Ask the whole community to critique a lift: uploads photo(s) or a video and
  // creates a FORM_CHECK post that everyone can comment on.
  createFormCheckPost: async (
    mediaUris: string[],
    mediaType: 'image' | 'video',
    exerciseName: string,
    userNotes?: string,
  ): Promise<FeedPost> => {
    const formData = new FormData();
    mediaUris.forEach((uri, i) => {
      formData.append('media', {
        uri,
        name: mediaType === 'video' ? `form-video-${i}.mp4` : `form-${i}.jpg`,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      } as any);
    });
    formData.append('exerciseName', exerciseName);
    formData.append('mediaType', mediaType);
    if (userNotes) formData.append('userNotes', userNotes);

    const { data } = await api.post<ApiResponse<FeedPost>>('/community/form-check', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  getPost: async (postId: string): Promise<FeedPost> => {
    const { data } = await api.get<ApiResponse<FeedPost>>(`/community/posts/${postId}`);
    return data.data;
  },

  deletePost: async (postId: string): Promise<void> => {
    await api.delete(`/community/posts/${postId}`);
  },

  toggleLike: async (postId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const { data } = await api.post<ApiResponse<{ liked: boolean; likesCount: number }>>(
      `/community/posts/${postId}/like`,
    );
    return data.data;
  },

  getComments: async (postId: string): Promise<PostComment[]> => {
    const { data } = await api.get<ApiResponse<PostComment[]>>(
      `/community/posts/${postId}/comments`,
    );
    return data.data;
  },

  addComment: async (postId: string, content: string): Promise<PostComment> => {
    const { data } = await api.post<ApiResponse<PostComment>>(
      `/community/posts/${postId}/comments`,
      { content },
    );
    return data.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/community/comments/${commentId}`);
  },
};
