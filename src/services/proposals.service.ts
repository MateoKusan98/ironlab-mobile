import { api } from './api';

export interface AIProposal {
  id: string;
  title: string;
  reasoning: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export const proposalsService = {
  getPending: async (): Promise<AIProposal | null> => {
    const { data } = await api.get<{ data: AIProposal | null }>('/ai-coach/proposals/pending');
    return data.data;
  },

  accept: async (id: string): Promise<void> => {
    await api.post(`/ai-coach/proposals/${id}/accept`);
  },

  decline: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/ai-coach/proposals/${id}/decline`, { reason });
  },
};
