import { api } from './api';
import { ApiResponse, UserResponse, UpdateProfilePayload } from '@shared';

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
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

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

  getUsageStats: async (since?: string): Promise<{ perUser: UsageStatEntry[]; totals: { tokens: number; costUsd: number; calls: number } }> => {
    const { data } = await api.get<ApiResponse<{ perUser: UsageStatEntry[]; totals: any }>>('/ai-coach/admin/usage-stats', {
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
