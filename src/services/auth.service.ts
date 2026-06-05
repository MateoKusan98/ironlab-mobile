import { api } from './api';
import { AuthResponse, ApiResponse } from '@shared';
import { RegisterDto, LoginDto } from '@shared';

export const authService = {
  register: async (dto: RegisterDto): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', dto);
    return data.data;
  },

  login: async (dto: LoginDto): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', dto);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
