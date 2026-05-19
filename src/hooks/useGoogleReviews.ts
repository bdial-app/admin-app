import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleReviewsService, type GoogleProvidersFilters } from '../services/google-reviews.service';

export const googleReviewKeys = {
  all: ['google-reviews'] as const,
  providers: () => [...googleReviewKeys.all, 'providers'] as const,
  providerList: (filters: GoogleProvidersFilters) => [...googleReviewKeys.providers(), filters] as const,
  trustOverview: () => [...googleReviewKeys.all, 'trust-overview'] as const,
};

export function useGoogleLinkedProviders(filters: GoogleProvidersFilters = {}) {
  return useQuery({
    queryKey: googleReviewKeys.providerList(filters),
    queryFn: () => googleReviewsService.getProviders(filters),
  });
}

export function useTrustOverview() {
  return useQuery({
    queryKey: googleReviewKeys.trustOverview(),
    queryFn: () => googleReviewsService.getTrustOverview(),
  });
}

export function useVerifyGooglePlace() {
  return useMutation({
    mutationFn: ({ providerId, phoneNumber }: { providerId: string; phoneNumber?: string }) =>
      googleReviewsService.verify(providerId, phoneNumber),
  });
}

export function useConfirmGooglePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, placeId }: { providerId: string; placeId: string }) =>
      googleReviewsService.confirm(providerId, placeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: googleReviewKeys.all });
    },
  });
}

export function useUnlinkGooglePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => googleReviewsService.unlink(providerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: googleReviewKeys.all });
    },
  });
}

export function useRefreshGoogleAggregates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => googleReviewsService.refresh(providerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: googleReviewKeys.all });
    },
  });
}
