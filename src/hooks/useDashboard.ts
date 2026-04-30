import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const dashboardKeys = {
  stats: () => ['dashboard', 'stats'] as const,
  timeSeries: (days: number) => ['dashboard', 'time-series', days] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60_000,
  });
}

export function useDashboardTimeSeries(days = 30) {
  return useQuery({
    queryKey: dashboardKeys.timeSeries(days),
    queryFn: () => dashboardService.getTimeSeries(days),
  });
}
