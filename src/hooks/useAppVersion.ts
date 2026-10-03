import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { appVersionService } from '../services/app-version.service';
import type { AppVersionInput } from '../types/app-version';

const appVersionKeys = {
  all: ['app-version'] as const,
};

export function useAppVersion() {
  return useQuery({
    queryKey: appVersionKeys.all,
    queryFn: () => appVersionService.get(),
  });
}

export function useUpdateAppVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AppVersionInput) => appVersionService.update(body),
    onSuccess: (data) => {
      qc.setQueryData(appVersionKeys.all, data);
      toast.success('App versions saved');
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      // Validation failures arrive as a list, one entry per bad field.
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save app versions');
    },
  });
}
