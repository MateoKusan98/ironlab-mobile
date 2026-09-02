import { api } from './api';
import { ApiResponse, UserResponse, UpdateProfilePayload } from '@shared';

import { appendFile } from '../utils/upload';
export interface AdminUserEntry extends UserResponse {
  totalSessions: number;
  lastSessionAt: string | null;
}

export interface UsageStatEntry {
  userId: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  callCount: number;
  byEndpoint: Record<string, { calls: number; tokens: number; costUsd: number }>;
}

export const usersService = {
  getProfile: async (): Promise<UserResponse> => {
    const { data } = await api.get<ApiResponse<UserResponse>>('/users/me');
    return data.data;
  },

  updateProfile: async (updates: UpdateProfilePayload): Promise<UserResponse> => {
    const { data } = await api.patch<ApiResponse<UserResponse>>('/users/me', updates);
    return data.data;
  },

  uploadAvatar: async (
    imageUri: string,
    onProgress?: (percent: number) => void,
  ): Promise<UserResponse> => {
    const filename = imageUri.split('/').pop() ?? 'avatar.jpg';
    const formData = new FormData();
    appendFile(formData, 'file', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    });

    const { data } = await api.post<ApiResponse<UserResponse>>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      },
    });

    return data.data;
  },

  getClients: async (): Promise<UserResponse[]> => {
    const { data } = await api.get<ApiResponse<UserResponse[]>>('/users/clients');
    return data.data;
  },

  /**
   * Create an athlete account under the signed-in coach. This is the only writer of the
   * coach↔athlete link, so it is what switches an athlete onto coach-reviewed sessions.
   *
   * `temporaryPassword` comes back ONLY when no password was supplied, and only this
   * once — it is never stored in a readable form, so it has to be shown to the coach
   * immediately or the athlete has to reset.
   */
  createClient: async (body: { email: string; name: string; password?: string }):
    Promise<UserResponse & { temporaryPassword?: string }> => {
    const { data } = await api.post<ApiResponse<UserResponse & { temporaryPassword?: string }>>(
      '/users/clients', body,
    );
    return data.data;
  },

  /** Take on an athlete who already signed up for themselves. */
  claimClient: async (email: string): Promise<UserResponse> => {
    const { data } = await api.post<ApiResponse<UserResponse>>('/users/clients/claim', { email });
    return data.data;
  },

  exportData: async (): Promise<string> => {
    const { data } = await api.get<string>('/users/me/export', {
      responseType: 'text',
    });
    return data;
  },

  getAllUsers: async (): Promise<AdminUserEntry[]> => {
    const { data } = await api.get<ApiResponse<AdminUserEntry[]>>('/users/admin/all');
    return data.data;
  },

  impersonate: async (userId: string): Promise<{ user: UserResponse; accessToken: string }> => {
    const { data } = await api.post<ApiResponse<{ user: UserResponse; accessToken: string }>>(
      `/auth/impersonate/${userId}`,
    );
    return data.data;
  },

  getUsageStats: async (since?: string): Promise<{ perUser: UsageStatEntry[]; totals: { tokens: number; costUsd: number; calls: number } }> => {
    const { data } = await api.get<ApiResponse<{ perUser: UsageStatEntry[]; totals: { tokens: number; costUsd: number; calls: number } }>>('/ai-coach/admin/usage-stats', {
      params: since ? { since } : undefined,
    });
    return data.data;
  },

  requestAccountDeletion: async (password: string): Promise<void> => {
    await api.delete('/users/me', { data: { password } });
  },

  cancelAccountDeletion: async (): Promise<void> => {
    await api.post('/users/me/cancel-deletion');
  },
};
