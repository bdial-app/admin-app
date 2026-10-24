import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { badgesService, type AwardBadgeBody, type BadgeFilters } from '../services/badges.service';

export const badgeKeys = {
  all: ['badges'] as const,
  overview: () => [...badgeKeys.all, 'overview'] as const,
  list: (filters: BadgeFilters) => [...badgeKeys.all, 'list', filters] as const,
  business: (providerId: string) => [...badgeKeys.all, 'business', providerId] as const,
};

export const useBadgesOverview = () =>
  useQuery({ queryKey: badgeKeys.overview(), queryFn: badgesService.overview });

export const useBadges = (filters: BadgeFilters) =>
  useQuery({ queryKey: badgeKeys.list(filters), queryFn: () => badgesService.list(filters), placeholderData: (prev) => prev });

export const useBusinessBadges = (providerId: string | undefined) =>
  useQuery({
    queryKey: badgeKeys.business(providerId ?? ''),
    queryFn: () => badgesService.forBusiness(providerId!),
    enabled: !!providerId,
  });

/** Every badge query refreshes after a change. */
function useBadgeMutation<A, R>(fn: (a: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: badgeKeys.all }),
  });
}

export const useAwardBadge = () => useBadgeMutation((body: AwardBadgeBody) => badgesService.award(body));
export const useRevokeBadge = () => useBadgeMutation((id: string) => badgesService.revoke(id));
export const useRecalculateBadges = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => badgesService.recalculate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: badgeKeys.all }),
  });
};
