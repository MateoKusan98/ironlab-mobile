import { api } from './api';
import { ApiResponse } from '@shared';

export interface IdeaSubmission {
  id: string;
  userId: string;
  content: string;
  status: 'PENDING' | 'THANKED' | 'REJECTED';
  createdAt: string;
  reviewedAt: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const ideasService = {
  submit: async (content: string): Promise<IdeaSubmission> => {
    const { data } = await api.post<ApiResponse<IdeaSubmission>>('/ideas', { content });
    return data.data;
  },

  getMine: async (): Promise<IdeaSubmission[]> => {
    const { data } = await api.get<ApiResponse<IdeaSubmission[]>>('/ideas/mine');
    return data.data;
  },

  getAll: async (): Promise<IdeaSubmission[]> => {
    const { data } = await api.get<ApiResponse<IdeaSubmission[]>>('/ideas');
    return data.data;
  },

  thankIdea: async (id: string): Promise<IdeaSubmission> => {
    const { data } = await api.patch<ApiResponse<IdeaSubmission>>(`/ideas/${id}/thanks`);
    return data.data;
  },

  rejectIdea: async (id: string): Promise<IdeaSubmission> => {
    const { data } = await api.patch<ApiResponse<IdeaSubmission>>(`/ideas/${id}/reject`);
    return data.data;
  },
};
