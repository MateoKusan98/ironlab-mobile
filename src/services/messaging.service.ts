import { api } from './api';
import { ApiResponse } from '@shared';

export interface ConversationSummary {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar: string | null;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
}

export const messagingService = {
  getConversations: async (): Promise<ConversationSummary[]> => {
    const { data } = await api.get<ApiResponse<ConversationSummary[]>>('/messaging/conversations');
    return data.data;
  },

  startConversation: async (otherUserId: string): Promise<{ id: string }> => {
    const { data } = await api.post<ApiResponse<{ id: string }>>('/messaging/conversations', {
      otherUserId,
    });
    return data.data;
  },

  getMessages: async (
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<MessagesResponse> => {
    const { data } = await api.get<ApiResponse<MessagesResponse>>(
      `/messaging/conversations/${conversationId}/messages`,
      { params: { page, limit } },
    );
    return data.data;
  },

  sendMessage: async (conversationId: string, content: string): Promise<Message> => {
    const { data } = await api.post<ApiResponse<Message>>(
      `/messaging/conversations/${conversationId}/messages`,
      { content },
    );
    return data.data;
  },

  markRead: async (conversationId: string): Promise<void> => {
    await api.patch(`/messaging/conversations/${conversationId}/read`);
  },
};
