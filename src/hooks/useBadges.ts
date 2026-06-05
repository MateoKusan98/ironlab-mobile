import { useQuery } from '@tanstack/react-query';
import { badgesService } from '../services/badges.service';

export const useBadges = () => {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => badgesService.getMyBadges(),
    staleTime: 30 * 1000,
  });
};
