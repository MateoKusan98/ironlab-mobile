import { api } from './api';
import { AuthResponse, ApiResponse } from '@shared';
import { RegisterDto, LoginDto, SocialAuthDto, ForgotPasswordDto, ResetPasswordDto } from '@shared';

export const authService = {
  register: async (dto: RegisterDto): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', dto);
    return data.data;
  },

  login: async (dto: LoginDto): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', dto);
    return data.data;
  },

  socialAuth: async (dto: SocialAuthDto): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/social', dto);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  forgotPassword: async (dto: ForgotPasswordDto): Promise<void> => {
    await api.post('/auth/forgot-password', dto);
  },

  resetPassword: async (dto: ResetPasswordDto): Promise<void> => {
    await api.post('/auth/reset-password', dto);
  },
};
