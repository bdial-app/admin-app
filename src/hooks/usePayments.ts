import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { paymentsService, type PaymentFilters, type RevenueParams } from '../services/payments.service';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: PaymentFilters) => [...paymentKeys.lists(), filters] as const,
  filterOptions: () => [...paymentKeys.all, 'filter-options'] as const,
  revenue: () => [...paymentKeys.all, 'revenue'] as const,
  revenueReport: (params: RevenueParams) => [...paymentKeys.all, 'revenue-report', params] as const,
  analytics: () => [...paymentKeys.all, 'analytics'] as const,
};

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: () => paymentsService.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function usePaymentFilterOptions() {
  return useQuery({
    queryKey: paymentKeys.filterOptions(),
    queryFn: () => paymentsService.filterOptions(),
    staleTime: 5 * 60_000,
  });
}

/** Filtered revenue report; the previous range stays on screen while the next one loads. */
export function useRevenue(params: RevenueParams) {
  return useQuery({
    queryKey: paymentKeys.revenueReport(params),
    queryFn: () => paymentsService.getRevenue(params),
    placeholderData: keepPreviousData,
  });
}

export function useRevenueStats() {
  return useQuery({ queryKey: paymentKeys.revenue(), queryFn: () => paymentsService.getRevenueStats() });
}

export function useRevenueAnalytics() {
  return useQuery({ queryKey: paymentKeys.analytics(), queryFn: () => paymentsService.getRevenueAnalytics() });
}
