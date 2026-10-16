import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationsService } from '../services/automations.service';

const KEY = ['automations'] as const;

export function useAutomations() {
  return useQuery({ queryKey: KEY, queryFn: automationsService.list, refetchInterval: 60_000 });
}

export function useAutomationJobs(key: string | null) {
  return useQuery({
    queryKey: [...KEY, 'jobs', key],
    queryFn: () => automationsService.jobs(key as string),
    enabled: !!key,
    refetchInterval: 30_000,
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, ...body }: { key: string; enabled?: boolean; monthlyBudgetInr?: number | null }) =>
      automationsService.update(key, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTestAutomation() {
  return useMutation({
    mutationFn: ({ key, phone }: { key: string; phone: string }) => automationsService.test(key, phone),
  });
}
