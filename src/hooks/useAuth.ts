import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { RegisterDto, LoginDto } from '@shared';

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    },
  });
};

export const useRegister = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (dto: RegisterDto) => authService.register(dto),
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    },
  });
};

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      logout();
    },
  });
};
