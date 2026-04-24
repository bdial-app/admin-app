import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersService, type OfferFilters } from '../services/offers.service';
import type { ProviderOffer } from '../types';

export const offerKeys = {
  all: ['offers'] as const,
  lists: () => [...offerKeys.all, 'list'] as const,
  list: (filters: OfferFilters) => [...offerKeys.lists(), filters] as const,
  detail: (id: string) => [...offerKeys.all, 'detail', id] as const,
  stats: () => [...offerKeys.all, 'stats'] as const,
};

export function useOffers(filters: OfferFilters) {
  return useQuery({
    queryKey: offerKeys.list(filters),
    queryFn: () => offersService.list(filters),
  });
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: offerKeys.detail(id),
    queryFn: () => offersService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProviderOffer> }) => offersService.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: offerKeys.all }); },
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => offersService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: offerKeys.all }); },
  });
}

export function useOfferStats() {
  return useQuery({
    queryKey: offerKeys.stats(),
    queryFn: () => offersService.getStats(),
  });
}
