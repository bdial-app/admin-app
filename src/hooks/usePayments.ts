import { useQuery } from '@tanstack/react-query';
import { paymentsService, type PaymentFilters } from '../services/payments.service';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: PaymentFilters) => [...paymentKeys.lists(), filters] as const,
  revenue: () => [...paymentKeys.all, 'revenue'] as const,
};

export function usePayments(filters: PaymentFilters) {
  return useQuery({ queryKey: paymentKeys.list(filters), queryFn: () => paymentsService.list(filters) });
}

export function useRevenueStats() {
  return useQuery({ queryKey: paymentKeys.revenue(), queryFn: () => paymentsService.getRevenueStats() });
}
