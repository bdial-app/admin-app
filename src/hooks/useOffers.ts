import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersService, type OfferFilters } from '../services/offers.service';
import type { ProviderOffer } from '../types';
import { toast } from 'react-toastify';

export const offerKeys = {
  all: ['offers'] as const,
  lists: () => [...offerKeys.all, 'list'] as const,
  list: (filters: OfferFilters) => [...offerKeys.lists(), filters] as const,
  detail: (id: string) => [...offerKeys.all, 'detail', id] as const,
  pending: () => [...offerKeys.all, 'pending'] as const,
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

export function usePendingOffers() {
  return useQuery({
    queryKey: offerKeys.pending(),
    queryFn: () => offersService.getPending(),
  });
}

export function useApproveOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => offersService.approve(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      toast.success('Offer approved');
    },
    onError: () => toast.error('Failed to approve offer'),
  });
}

export function useRejectOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => offersService.reject(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      toast.success('Offer rejected');
    },
    onError: () => toast.error('Failed to reject offer'),
  });
}
