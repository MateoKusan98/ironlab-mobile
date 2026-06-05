import { useQuery } from '@tanstack/react-query';
import { usersService } from '../services/users.service';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => usersService.getProfile(),
  });
};

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => usersService.getClients(),
  });
};
