import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import { toast } from 'react-toastify';

const settingsKeys = {
  all: ['settings'] as const,
  list: () => [...settingsKeys.all, 'list'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.list(),
    queryFn: () => settingsService.list(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: { key: string; value: string }[]) =>
      settingsService.update(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success('Settings updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update settings'),
  });
}

export function useCreateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { key: string; value: string; type?: string; group?: string; description?: string }) =>
      settingsService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success('Setting created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create setting'),
  });
}

export function useDeleteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success('Setting deleted');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete setting'),
  });
}
