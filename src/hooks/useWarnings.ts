import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warningsService, type WarningFilters } from '../services/warnings.service';

export const warningKeys = {
  all: ['warnings'] as const,
  lists: () => [...warningKeys.all, 'list'] as const,
  list: (filters: WarningFilters) => [...warningKeys.lists(), filters] as const,
  details: () => [...warningKeys.all, 'detail'] as const,
  detail: (id: string) => [...warningKeys.details(), id] as const,
};

export function useWarnings(filters: WarningFilters = {}) {
  return useQuery({
    queryKey: warningKeys.list(filters),
    queryFn: () => warningsService.list(filters),
  });
}

export function useWarning(id: string) {
  return useQuery({
    queryKey: warningKeys.detail(id),
    queryFn: () => warningsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateWarning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { providerId: string; warningType: string; title: string; message: string }) =>
      warningsService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warningKeys.lists() });
    },
  });
}

export function useUpdateWarning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => warningsService.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warningKeys.all });
    },
  });
}
