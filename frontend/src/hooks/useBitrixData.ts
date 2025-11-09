import { useQuery } from '@tanstack/react-query';
import { bitrixApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { transformBitrixTasks, transformBitrixUsers, transformBitrixDepartments } from '../utils/dataTransform';

export const useTasks = () => {
  const { accessToken, domain } = useAuthStore();

  return useQuery({
    queryKey: ['tasks', accessToken],
    queryFn: async () => {
      if (!accessToken || !domain) throw new Error('Not authenticated');
      const response = await bitrixApi.getTasks(accessToken, domain);
      return transformBitrixTasks(response.result?.tasks || []);
    },
    enabled: !!accessToken && !!domain,
    staleTime: 5 * 60 * 1000 // 5 минут
  });
};

export const useUsers = () => {
  const { accessToken, domain } = useAuthStore();

  return useQuery({
    queryKey: ['users', accessToken],
    queryFn: async () => {
      if (!accessToken || !domain) throw new Error('Not authenticated');
      const response = await bitrixApi.getUsers(accessToken, domain);
      return transformBitrixUsers(response.result || []);
    },
    enabled: !!accessToken && !!domain,
    staleTime: 5 * 60 * 1000
  });
};

export const useDepartments = () => {
  const { accessToken, domain } = useAuthStore();

  return useQuery({
    queryKey: ['departments', accessToken],
    queryFn: async () => {
      if (!accessToken || !domain) throw new Error('Not authenticated');
      const response = await bitrixApi.getDepartments(accessToken, domain);
      return transformBitrixDepartments(response.result || []);
    },
    enabled: !!accessToken && !!domain,
    staleTime: 5 * 60 * 1000
  });
};


