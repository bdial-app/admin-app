import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsoredService, type SponsoredFilters } from '../services/sponsored.service';
import type {
  AdminCreateSponsorshipPayload,
  AdminUpdateSponsorshipPayload,
  TopUpSponsorshipPayload,
  BulkSponsorshipAction,
  SponsoredBillingMode,
} from '../types';
import { featureFlagKeys } from './useFeatureFlags';
import { toast } from 'react-toastify';

export const sponsoredKeys = {
  all: ['sponsored'] as const,
  lists: () => [...sponsoredKeys.all, 'list'] as const,
  list: (filters: SponsoredFilters) => [...sponsoredKeys.lists(), filters] as const,
  detail: (id: string) => [...sponsoredKeys.all, 'detail', id] as const,
  analytics: (id: string, period: string) => [...sponsoredKeys.all, 'analytics', id, period] as const,
  pending: () => [...sponsoredKeys.all, 'pending'] as const,
  stats: () => [...sponsoredKeys.all, 'stats'] as const,
  eligible: (search: string) => [...sponsoredKeys.all, 'eligible', search] as const,
};

const errMsg = (err: any, fallback: string) => err?.response?.data?.message || fallback;

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

export function useCreateSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateSponsorshipPayload) => sponsoredService.create(body),
    onSuccess: (listing) => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success(listing.billingMode === 'free' ? 'Complimentary sponsorship placed' : 'Sponsorship placed');
      if (listing.warning) toast.warn(listing.warning, { autoClose: 8000 });
    },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to place sponsorship')),
  });
}

export function useUpdateSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUpdateSponsorshipPayload }) => sponsoredService.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: sponsoredKeys.all }); },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to update sponsorship')),
  });
}

export function useStopSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, notifyProvider }: { id: string; reason?: string; notifyProvider?: boolean }) =>
      sponsoredService.stop(id, reason, notifyProvider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success('Sponsorship stopped');
    },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to stop sponsorship')),
  });
}

export function useResumeSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sponsoredService.resume(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success('Sponsorship resumed');
    },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to resume sponsorship')),
  });
}

export function useTopUpSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TopUpSponsorshipPayload }) => sponsoredService.topUp(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success('Budget topped up');
    },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to top up')),
  });
}

export function useDeleteSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sponsoredService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      toast.success('Sponsorship deleted');
    },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to delete sponsorship')),
  });
}

export function useBulkSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, action, reason }: { ids: string[]; action: BulkSponsorshipAction; reason?: string }) =>
      sponsoredService.bulk(ids, action, reason),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      if (res.failed === 0) toast.success(`${res.succeeded} sponsorship(s) ${res.action === 'stop' ? 'stopped' : res.action === 'resume' ? 'resumed' : `${res.action}d`}`);
      else toast.warn(`${res.succeeded} succeeded, ${res.failed} failed`);
    },
    onError: (err: any) => toast.error(errMsg(err, 'Bulk action failed')),
  });
}

export function useStopAllSponsored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { reason?: string; disableFeatureFlag?: boolean; billingMode?: SponsoredBillingMode }) =>
      sponsoredService.stopAll(opts),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: sponsoredKeys.all });
      qc.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast.success(`Stopped ${res.stopped} sponsorship(s)${res.featureFlagDisabled ? ' and switched sponsorships off platform-wide' : ''}`);
    },
    onError: (err: any) => toast.error(errMsg(err, 'Failed to stop sponsorships')),
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
    onError: (err: any) => toast.error(errMsg(err, 'Failed to approve sponsorship')),
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
    onError: (err: any) => toast.error(errMsg(err, 'Failed to reject sponsorship')),
  });
}

export function useSponsorshipAnalytics(id: string, period: string = '7d') {
  return useQuery({
    queryKey: sponsoredKeys.analytics(id, period),
    queryFn: () => sponsoredService.getAnalytics(id, period),
    enabled: !!id,
  });
}

export function useSponsorshipEligibleProviders(search: string, enabled = true) {
  return useQuery({
    queryKey: sponsoredKeys.eligible(search),
    queryFn: () => sponsoredService.eligibleProviders(search, 20),
    enabled,
    staleTime: 30_000,
  });
}
