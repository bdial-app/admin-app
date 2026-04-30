import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationsService } from '../services/verifications.service';
import type { VerificationFilters } from '../types';

export const verificationKeys = {
  all: ['verifications'] as const,
  lists: () => [...verificationKeys.all, 'list'] as const,
  list: (filters: VerificationFilters) => [...verificationKeys.lists(), filters] as const,
  detail: (id: string) => [...verificationKeys.all, 'detail', id] as const,
};

export function useVerifications(filters: VerificationFilters) {
  return useQuery({
    queryKey: verificationKeys.list(filters),
    queryFn: () => verificationsService.list(filters),
  });
}

export function useVerification(id: string) {
  return useQuery({
    queryKey: verificationKeys.detail(id),
    queryFn: () => verificationsService.getById(id),
    enabled: !!id,
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { aadhaarStatus: string; ijamatStatus?: string; adminNotes?: string } }) =>
      verificationsService.review(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: verificationKeys.all });
    },
  });
}
