import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService, type DashboardPeriodParams } from '../services/dashboard.service';

export const dashboardKeys = {
  stats: () => ['dashboard', 'stats'] as const,
  period: (params: DashboardPeriodParams) => ['dashboard', 'period', params] as const,
  recentActivity: () => ['dashboard', 'recent-activity'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60_000,
  });
}

/** Figures over a date range; keeps showing the last range while the next loads. */
export function useDashboardPeriod(params: DashboardPeriodParams) {
  return useQuery({
    queryKey: dashboardKeys.period(params),
    queryFn: () => dashboardService.getPeriod(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(),
    queryFn: () => dashboardService.getRecentActivity(8),
    refetchInterval: 30_000,
  });
}
