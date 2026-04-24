import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsoredService, type SponsoredFilters } from '../services/sponsored.service';
import type { SponsoredListing } from '../types';

export const sponsoredKeys = {
  all: ['sponsored'] as const,
  lists: () => [...sponsoredKeys.all, 'list'] as const,
  list: (filters: SponsoredFilters) => [...sponsoredKeys.lists(), filters] as const,
  detail: (id: string) => [...sponsoredKeys.all, 'detail', id] as const,
  stats: () => [...sponsoredKeys.all, 'stats'] as const,
};

export function useSponsoredListings(filters: SponsoredFilters) {
  return useQuery({
    queryKey: sponsoredKeys.list(filters),
    queryFn: () => sponsoredService.list(filters),
  });
}

export function useSponsored(id: string) {
  return useQuery({
    queryKey: sponsoredKeys.detail(id),
    queryFn: () => sponsoredService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<SponsoredListing> }) => sponsoredService.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: sponsoredKeys.all }); },
  });
}

export function useSponsoredStats() {
  return useQuery({
    queryKey: sponsoredKeys.stats(),
    queryFn: () => sponsoredService.getStats(),
  });
}
