import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsService } from '../services/reviews.service';
import type { ReviewFilters } from '../types';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (filters: ReviewFilters) => [...reviewKeys.lists(), filters] as const,
  detail: (id: string) => [...reviewKeys.all, 'detail', id] as const,
  pendingReports: () => [...reviewKeys.all, 'pending-reports'] as const,
};

export function useReviews(filters: ReviewFilters) {
  return useQuery({
    queryKey: reviewKeys.list(filters),
    queryFn: () => reviewsService.list(filters),
  });
}

export function useReview(id: string | null) {
  return useQuery({
    queryKey: reviewKeys.detail(id ?? ''),
    queryFn: () => reviewsService.getById(id!),
    enabled: !!id,
  });
}

/** Segment counts, cities and headline numbers; they move slowly. */
export function useReviewFilterOptions() {
  return useQuery({
    queryKey: [...reviewKeys.all, 'filter-options'],
    queryFn: () => reviewsService.filterOptions(),
    staleTime: 5 * 60_000,
  });
}

export function useDismissReviewReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewsService.dismissReports(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      providerId: string;
      reviewerId?: string;
      starRating: number;
      reviewText?: string;
      postedAt?: string;
    }) => reviewsService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function useUpdateReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'active' | 'removed'; reason?: string }) =>
      reviewsService.updateStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function useRemoveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function usePendingReviewReports() {
  return useQuery({
    queryKey: reviewKeys.pendingReports(),
    queryFn: () => reviewsService.getPendingReports(),
  });
}
