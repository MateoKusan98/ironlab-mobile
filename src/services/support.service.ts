import { api } from './api';

export interface SupportMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const supportService = {
  chat: async (message: string, history: SupportMessage[]): Promise<string> => {
    const { data } = await api.post<{ data: { reply: string } }>('/support/chat', {
      message,
      history,
    });
    return data.data.reply;
  },
};
