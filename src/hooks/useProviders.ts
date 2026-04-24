import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersService } from '../services/providers.service';
import type { ProviderFilters, Provider } from '../types';

export const providerKeys = {
  all: ['providers'] as const,
  lists: () => [...providerKeys.all, 'list'] as const,
  list: (filters: ProviderFilters) => [...providerKeys.lists(), filters] as const,
  pending: () => [...providerKeys.all, 'pending'] as const,
  details: () => [...providerKeys.all, 'detail'] as const,
  detail: (id: string) => [...providerKeys.details(), id] as const,
  warnings: (id: string) => [...providerKeys.all, 'warnings', id] as const,
};

export function useProviders(filters: ProviderFilters) {
  return useQuery({
    queryKey: providerKeys.list(filters),
    queryFn: () => providersService.list(filters),
  });
}

export function usePendingProviders() {
  return useQuery({
    queryKey: providerKeys.pending(),
    queryFn: () => providersService.getPending(),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: providerKeys.detail(id),
    queryFn: () => providersService.getById(id),
    enabled: !!id,
  });
}

export function useApproveProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useSuspendProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersService.suspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Provider> }) =>
      providersService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useProviderWarnings(id: string) {
  return useQuery({
    queryKey: providerKeys.warnings(id),
    queryFn: () => providersService.getWarnings(id),
    enabled: !!id,
  });
}
