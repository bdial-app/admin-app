import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { audienceService } from '../services/audience.service';

const keys = {
  live: ['audience', 'live'] as const,
  overview: (days: number) => ['audience', 'overview', days] as const,
  retention: (weeks: number) => ['audience', 'retention', weeks] as const,
  reach: (days: number) => ['audience', 'reach', days] as const,
  ads: (days: number) => ['audience', 'ads', days] as const,
};

/** Refreshes on its own: "online now" is only useful if it stays current. */
export function useAudienceLive() {
  return useQuery({ queryKey: keys.live, queryFn: audienceService.live, refetchInterval: 30_000 });
}

// Changing the period keeps the old numbers on screen until the new ones land,
// rather than flashing the whole page back to a spinner.
export function useAudienceOverview(days: number) {
  return useQuery({ queryKey: keys.overview(days), queryFn: () => audienceService.overview(days), placeholderData: keepPreviousData });
}

export function useAudienceRetention(weeks: number) {
  return useQuery({ queryKey: keys.retention(weeks), queryFn: () => audienceService.retention(weeks) });
}

export function useAudienceReach(days: number) {
  return useQuery({ queryKey: keys.reach(days), queryFn: () => audienceService.reach(days), placeholderData: keepPreviousData });
}

export function useAudienceAds(days: number) {
  return useQuery({ queryKey: keys.ads(days), queryFn: () => audienceService.ads(days), placeholderData: keepPreviousData });
}
