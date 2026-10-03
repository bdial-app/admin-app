import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export const analyticsKeys = {
  overview: () => ['analytics', 'overview'] as const,
  searchTrends: (days: number) => ['analytics', 'search-trends', days] as const,
  geographic: () => ['analytics', 'geographic'] as const,
  categories: () => ['analytics', 'categories'] as const,
};

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview(),
    queryFn: () => analyticsService.getOverview(),
  });
}

export function useSearchTrends(days = 30) {
  return useQuery({
    queryKey: analyticsKeys.searchTrends(days),
    queryFn: () => analyticsService.getSearchTrends(days),
  });
}

export function useCategoryStats() {
  return useQuery({
    queryKey: analyticsKeys.categories(),
    queryFn: () => analyticsService.getCategoryStats(),
    staleTime: 5 * 60_000,
  });
}

export function useGeographicStats() {
  return useQuery({
    queryKey: analyticsKeys.geographic(),
    queryFn: () => analyticsService.getGeographic(),
  });
}
