import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsoredService, type SponsoredFilters } from '../services/sponsored.service';
import type { SponsoredListing } from '../types';
import { toast } from 'react-toastify';

export const sponsoredKeys = {
  all: ['sponsored'] as const,
  lists: () => [...sponsoredKeys.all, 'list'] as const,
  list: (filters: SponsoredFilters) => [...sponsoredKeys.lists(), filters] as const,
  detail: (id: string) => [...sponsoredKeys.all, 'detail', id] as const,
  pending: () => [...sponsoredKeys.all, 'pending'] as const,
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

export function usePendingSponsorships() {
  return useQuery({
    queryKey: sponsoredKeys.pending(),
    queryFn: () => sponsoredService.getPending(),
  });
}

export function useApproveSponsorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => sponsoredService.approve(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success('Sponsorship approved');
    },
    onError: () => toast.error('Failed to approve sponsorship'),
  });
}

export function useRejectSponsorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => sponsoredService.reject(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success('Sponsorship rejected');
    },
    onError: () => toast.error('Failed to reject sponsorship'),
  });
}
