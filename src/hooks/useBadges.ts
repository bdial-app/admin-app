import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { badgesService, type BadgeFilters } from '../services/badges.service';

export const badgeKeys = {
  all: ['badges'] as const,
  lists: () => [...badgeKeys.all, 'list'] as const,
  list: (filters: BadgeFilters) => [...badgeKeys.lists(), filters] as const,
  detail: (id: string) => [...badgeKeys.all, 'detail', id] as const,
};

export function useBadges(filters: BadgeFilters) {
  return useQuery({
    queryKey: badgeKeys.list(filters),
    queryFn: () => badgesService.list(filters),
  });
}

export function useBadge(id: string) {
  return useQuery({
    queryKey: badgeKeys.detail(id),
    queryFn: () => badgesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { providerId: string; type: string; source?: string; expiresAt?: string }) =>
      badgesService.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: badgeKeys.all }); },
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { isActive?: boolean; expiresAt?: string | null } }) =>
      badgesService.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: badgeKeys.all }); },
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => badgesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: badgeKeys.all }); },
  });
}
