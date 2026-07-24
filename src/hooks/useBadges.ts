import { useQuery } from '@tanstack/react-query';
import { badgesService } from '../services/badges.service';
import { useAuthStore } from '../stores/auth.store';

export const useBadges = () => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    // Scope by user so impersonation doesn't serve the admin's cached badges.
    queryKey: ['badges', userId],
    queryFn: () => badgesService.getMyBadges(),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
};
