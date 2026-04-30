import api from './api';
import { URLS } from '../utils/urls';

export interface PaymentFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

export interface Payment {
  id: string;
  providerId: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  type: 'sponsorship' | 'lead_unlock' | 'badge' | 'subscription' | 'deal_unlock';
  metadata: Record<string, unknown>;
  voucherId: string | null;
  discountAmount: number;
  stripeReceiptUrl: string | null;
  createdAt: string;
  provider?: { brandName: string };
}

export interface RevenueStats {
  totalRevenue: number;
  totalTransactions: number;
  mrr: number;
  activeSubscriptions: number;
  breakdown: { type: string; count: string; totalRevenue: string }[];
}

export const paymentsService = {
  list: async (filters: PaymentFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    const { data } = await api.get(`${URLS.PAYMENTS.LIST}?${params.toString()}`);
    const items = data?.payments ?? data?.items ?? data?.data ?? data ?? [];
    return {
      items,
      meta: data?.meta ?? { total: data?.total ?? 0, page: filters.page ?? 1, limit: filters.limit ?? 10, totalPages: Math.ceil((data?.total ?? 0) / (filters.limit ?? 10)) || 1 },
    };
  },

  getRevenueStats: async (): Promise<RevenueStats> => {
    const { data } = await api.get(URLS.PAYMENTS.REVENUE_STATS);
    return data;
  },
};
