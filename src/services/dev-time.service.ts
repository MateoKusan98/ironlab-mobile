import { api } from './api';

export interface DevTimeStatus {
  virtual: boolean;
  currentMs: number;
  currentDate: string;
}

export const devTimeService = {
  async getStatus(): Promise<DevTimeStatus> {
    const res = await api.get<DevTimeStatus>('/dev/time');
    return res.data;
  },

  async advance(days?: number): Promise<{ advanced: boolean; currentDate: string }> {
    const res = await api.post<{ advanced: boolean; currentDate: string }>('/dev/time/advance', days != null ? { days } : {});
    return res.data;
  },

  async reset(): Promise<{ reset: boolean; currentDate: string }> {
    const res = await api.delete<{ reset: boolean; currentDate: string }>('/dev/time/reset');
    return res.data;
  },
};
